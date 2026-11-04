/**
 * The sync service: one fiber that owns pull → push → pull per group
 * (`SYNC-V2.md` §9).
 *
 * Everything that decides *what* happens lives in `pull.ts`/`push.ts`/`merge.ts`
 * so those can be tested against a fake transport. This file is the wiring: the
 * group cycle, the persisted bookmarks and parks, the progress ref the screen
 * paints, and the refresh call that makes a merged row visible to the running app.
 *
 * ## Groups
 *
 * A group is a pair of endpoints plus its own tables and its own bookmark. The
 * eight groups are visited in `SYNC_GROUPS` order, one cycle at a time: a group
 * has exactly one bookmark, so two cycles over it would interleave pages and acks
 * over the same cursor (§9.11). A trigger that arrives while a run is going does
 * not start a second cycle — it sets a "run again" flag and the run loops once
 * more when it finishes.
 *
 * ## The only state this service keeps
 *
 * One integer per group — its bookmark, the highest `seq` durably stored — plus
 * the parked money rows still waiting for their pocket (§7.5). Both live in
 * SQLite, and both are written **in the same transaction** as the page they
 * describe (§9.4.1), so a crash re-fetches a page rather than skipping one.
 *
 * ## Why the domain services are refreshed here
 *
 * Each domain service hydrates its own `SubscriptionRef` and patches it from its
 * own write paths. A row that arrives from the server is written by this service,
 * so without a refresh the screen would keep showing yesterday's data until the
 * app restarts.
 *
 * ## Cancellation
 *
 * A run is a background task: `start` forks it as a daemon, so leaving the screen
 * that started it does not stop it. `cancel` goes through the fiber, and the
 * streaming commands stop their socket in Rust (`sync_cancel`), so the HTTP
 * request really stops rather than draining in the background.
 */
import { Effect, Fiber, Layer, Ref, SubscriptionRef } from "effect";
import { log } from "~/lib/log";
import { DatabaseService } from "../db";
import { CustomerService } from "../customer";
import { ExtraService } from "../extra";
import { MethodService } from "../method";
import { MoneyService } from "../money";
import { ProductService } from "../product";
import { RecordService } from "../record";
import { SocialService } from "../social";
import { StoreService } from "../store";
import { SupplierService } from "../supplier";
import {
  SYNC_CONFIG_DEFAULT,
  SYNC_GROUPS,
  SYNC_IDLE,
  SyncError,
  SyncService,
  idleTransfer,
  type GroupReport,
  type GroupState,
  type GroupTransfer,
  type SyncConfig,
  type SyncGroup,
  type SyncHealth,
  type SyncMode,
  type SyncReport,
  type SyncState,
  type SyncStatus,
  type TransferSide,
} from ".";
import {
  mergePage,
  stockFoldStatements,
  type MergeExecutor,
  type ParkedMoney,
  type PullPage,
} from "./merge";
import { countImageBlobs, fetchImageBlobs, uploadImageBlobs, type BlobTick } from "./blob";
import { syncOneProduct } from "./one-product";
import { pullLimit, pullPageWithRetry, toSyncError } from "./pull";
import { countUnsynced, push } from "./push";
import type { WireRow } from "./schema";
import { bookmarkStatement, forgetUploadedBlobsStatement, markAllUnsyncedStatements } from "./sql";
import { SyncTransportService, type Endpoint } from "./transport";

/**
 * A group's bookmark (§2.2). One row per group — never one per table — and the
 * only thing that says how far this device has durably got in that group.
 *
 * The row lives in SQLite so it commits with the page it describes. The
 * `store.json` key below is the pre-table location and is read once, to migrate.
 */
function legacyBookmarkKey(group: SyncGroup): string {
  return `sync.${group}.bookmark`;
}

/** Money rows waiting for their pocket (§7.5), as the pre-table store key. */
const LEGACY_PARKED_KEY = "sync.money.parked";

/** The device's configured server and token (not cursors, but the same store). */
const KEY_BASE_URL = "sync.base_url";
const KEY_TOKEN = "sync.token";
/**
 * This installation's identity, created once and never rotated.
 *
 * It is what lets the server's request log tell two tills apart when they share a
 * sync token, and the value Settings shows when someone has to report a problem.
 */
const KEY_DEVICE_ID = "sync.device_id";

/**
 * How often a running state may be painted.
 *
 * Four paints a second is faster than a cashier can read and slow enough that a
 * long pull is tens of renders instead of thousands. Transitions are never
 * coalesced — see `publishNow`.
 */
const PAINT_INTERVAL_MS = 150;

function numeric(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/** A store value that is not the shape we expect is treated as absent. */
function parkedFrom(value: unknown): ParkedMoney[] {
  if (!Array.isArray(value)) return [];
  const out: ParkedMoney[] = [];
  for (const item of value) {
    if (typeof item !== "object" || item === null) continue;
    const candidate = item as { seq?: unknown; row?: unknown };
    const seq = numeric(candidate.seq);
    if (seq === null || typeof candidate.row !== "object" || candidate.row === null) continue;
    out.push({ seq, row: candidate.row as WireRow });
  }
  return out;
}

/** True for a host a plain-`http` URL is allowed to name (§2.5). */
function isLocalHost(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "0.0.0.0" ||
    hostname === "::1" ||
    hostname === "[::1]" ||
    hostname.endsWith(".localhost")
  );
}

/** A group's cycle, in the order it runs (§9.2). */
type Stage = "pull" | "push" | "settle";

/**
 * What one unit of the bar's plan is worth, in the only currency that matters
 * here: how long the operator waits.
 *
 * A fixed share per phase was the old shape — pull 60%, push 35%, settle 5% — and
 * it was wrong at both ends. An incremental run is *all* push: three changes
 * arrive in one page and then nine hundred rows go up, so the bar jumped straight
 * to 60% at the phase boundary and spent the rest of the run crawling through the
 * half of the bar that was left. A first sync is the opposite (all pull) and the
 * same 60% covered what was in fact the whole job.
 *
 * So the shares are now decided by what each phase owes, counted before it starts.
 * The numbers below only have to be right *relative to each other*: a row is a
 * row in both directions, one image file is a few hundred kilobytes over HTTPS
 * and lands near fifty rows' worth of waiting, and the closing pull is one empty
 * round trip.
 */
const PLAN_UNITS = { row: 1, image: 50, settle: 5 } as const;

/**
 * The least share of the bar the closing pull may hold, as a fraction.
 *
 * It is one empty round trip most of the time, so a fixed five units is honest
 * weight — but five units out of a hundred thousand rounds to nothing, which put
 * the bar at 100% *before* the closing pull started and left it there, saying
 * "downloading", for however long that pull took. A visible slice is the price of
 * a bar that never claims to be finished while a phase is still running.
 */
const SETTLE_SHARE = 0.015;

/** One phase's slice of the whole bar, as fractions of it. */
type Slice = { from: number; to: number };

/** How the cycle's single bar is divided, and what each division is worth. */
type CyclePlan = { slices: Record<Stage, Slice>; units: Record<Stage, number> };

/**
 * Divides the cycle's one bar between its phases in proportion to the work each
 * one owes.
 *
 * Pure, and called once per cycle: a plan re-fitted while it runs is a bar that
 * stutters, and the caller clamps progress upward anyway, so re-planning could
 * only ever stall it.
 */
function planCycle(input: {
  pullChanges: number;
  pushRows: number;
  images: { up: number; down: number };
}): CyclePlan {
  const units: Record<Stage, number> = {
    pull:
      Math.max(0, input.pullChanges) * PLAN_UNITS.row +
      Math.max(0, input.images.down) * PLAN_UNITS.image,
    push:
      Math.max(0, input.pushRows) * PLAN_UNITS.row +
      Math.max(0, input.images.up) * PLAN_UNITS.image,
    settle: 0,
  };
  // The closing pull's slice, sized against the work the other two phases owe (see
  // `SETTLE_SHARE`): a visible share of the bar, never a rounding error.
  units.settle = Math.max(PLAN_UNITS.settle, Math.ceil((units.pull + units.push) * SETTLE_SHARE));
  const total = units.pull + units.push + units.settle;
  const at = (value: number): number => value / total;
  return {
    units,
    slices: {
      pull: { from: 0, to: at(units.pull) },
      push: { from: at(units.pull), to: at(units.pull + units.push) },
      settle: { from: at(units.pull + units.push), to: 1 },
    },
  };
}

/** Places a phase-local fraction (0…1) inside its slice of the cycle's bar. */
function place(slice: Slice, fraction: number): number {
  const clamped = Number.isFinite(fraction) ? Math.min(1, Math.max(0, fraction)) : 0;
  return slice.from + (slice.to - slice.from) * clamped;
}

/**
 * One direction's counter for a pass that is running: what has crossed, and where
 * that pass will end.
 *
 * `remaining` is the bytes the pass still owes **and knows about** — a file pass
 * sums its manifest sizes before the first request, so it can say where it will
 * end; a row pass cannot, and passes `0` rather than inventing a denominator from
 * the average size of the rows that happen to have arrived. That distinction is
 * the whole point: an estimate built from the rows seen so far *rises* as bigger
 * rows turn up and can never be corrected downwards once painted, which read as a
 * total that grew the longer the sync ran.
 */
function side(bytes: number, remaining: number): TransferSide {
  return remaining > 0 ? { bytes, total: bytes + remaining } : { bytes, total: null };
}

/**
 * One direction of a byte counter, never allowed to go backwards.
 *
 * `bytes` is a sum, so it only grows; a `total` that is no longer known is `null`
 * — "nothing left to size", which is what the screen reads as a bare byte count.
 * The total is never clamped upward: it means "where the running pass ends", and
 * a pass that ends closer than the last one was honest to say has simply finished.
 */
function monotoneSide(previous: TransferSide, next: TransferSide): TransferSide {
  const bytes = Math.max(previous.bytes, next.bytes);
  return { bytes, total: next.total === null ? null : Math.max(bytes, next.total) };
}

/**
 * A page without the entries whose `seq` is in `drop`.
 *
 * Pure, and used for exactly one thing: the closing pull dropping the entries this
 * device's own push created (§9.2 — "the final pull may return the rows/records
 * this client just pushed, as `noop` lines"). Filtering *before* the merge is what
 * makes those pages cost nothing: the merge, the stock fold and the service
 * refresh all key off what is left of the page.
 */
function withoutSeqs(page: PullPage, drop: ReadonlySet<number>): PullPage {
  return {
    changes: page.changes.filter((change) => !drop.has(change.seq)),
    aggregates: page.aggregates.filter((aggregate) => !drop.has(aggregate.seq)),
    deletions: page.deletions.filter((deletion) => !drop.has(deletion.seq)),
  };
}

export const SyncLive = Layer.effect(
  SyncService,
  Effect.gen(function* () {
    const db = yield* DatabaseService;
    const store = yield* StoreService;
    const transport = yield* SyncTransportService;
    const money = yield* MoneyService;
    const customer = yield* CustomerService;
    const supplier = yield* SupplierService;
    const method = yield* MethodService;
    const social = yield* SocialService;
    const extra = yield* ExtraService;
    const product = yield* ProductService;
    const record = yield* RecordService;

    const stateRef = yield* SubscriptionRef.make<SyncState>(SYNC_IDLE);
    /**
     * The single-flight gate. A run outlives whoever started it, so the button,
     * the pill's dialog and any future trigger all reach the same loop: whoever
     * wins this flag runs, everyone else asks for one more pass (§9.11).
     */
    const busy = yield* Ref.make(false);
    /**
     * The scoped one-product gate. Separate from `busy` because a scoped run is
     * foreground and has no loop to consume `rerun`; a full `start` that arrives
     * while it runs is refused instead of queued.
     */
    const scopedBusy = yield* Ref.make(false);
    const rerun = yield* Ref.make(false);
    const running = yield* Ref.make<Fiber.RuntimeFiber<SyncReport, SyncError> | null>(null);

    /** Whether `GET /v2/health` has answered `protocol: 2` this session (§2.8). */
    let protocolChecked = false;

    /** The newest state, and when it was last painted — see `publish`. */
    let latest: SyncState = SYNC_IDLE;
    let paintedAt = 0;
    let paintTimer: ReturnType<typeof setTimeout> | null = null;

    function paint(): void {
      if (paintTimer !== null) {
        clearTimeout(paintTimer);
        paintTimer = null;
      }
      paintedAt = Date.now();
      Effect.runSync(SubscriptionRef.set(stateRef, latest));
    }

    /** Publishes progress, coalesced to one paint per `PAINT_INTERVAL_MS`. */
    function publish(): void {
      const since = Date.now() - paintedAt;
      if (since >= PAINT_INTERVAL_MS) {
        paint();
        return;
      }
      if (paintTimer === null) paintTimer = setTimeout(paint, PAINT_INTERVAL_MS - since);
    }

    /** Publishes a transition immediately — a delayed phase change is a lie. */
    function publishNow(next: SyncState): void {
      latest = next;
      paint();
    }

    /**
     * Replaces one group's slice of `latest`, leaving the other groups alone.
     *
     * `progress` is clamped upward: a bar that can shrink is a bar that runs
     * backwards, and no phase boundary — let alone a page of a growing backlog —
     * should ever take it back. The byte counters get the same treatment through
     * `monotoneSide`, because their totals are projections. Everything else is a
     * plain replacement, so the caption and phase still change freely.
     */
    function setGroup(group: SyncGroup, fields: Partial<GroupState>): void {
      latest = {
        ...latest,
        groups: latest.groups.map((entry) => {
          if (entry.group !== group) return entry;
          const next = { ...entry, ...fields };
          if (fields.progress !== undefined && fields.progress !== null) {
            next.progress = Math.max(entry.progress ?? 0, fields.progress);
          }
          if (fields.transfer !== undefined) {
            next.transfer = {
              down: monotoneSide(entry.transfer.down, fields.transfer.down),
              up: monotoneSide(entry.transfer.up, fields.transfer.up),
            };
          }
          return next;
        }),
      };
    }

    /** A group's progress tick (coalesced). */
    function publishGroup(group: SyncGroup, fields: Partial<GroupState>): void {
      setGroup(group, fields);
      publish();
    }

    /** A group's phase change (immediate). */
    function publishGroupNow(group: SyncGroup, fields: Partial<GroupState>): void {
      setGroup(group, fields);
      publishNow(latest);
    }

    /** Reads a store key, treating "absent" as the default. */
    function read<T>(key: string, fallback: T): Effect.Effect<T> {
      return store.get<T>(key).pipe(Effect.orElseSucceed(() => fallback));
    }

    function write(key: string, value: unknown): Effect.Effect<void, SyncError> {
      return store
        .set(key, value)
        .pipe(Effect.mapError((error) => new SyncError({ message: error.message })));
    }

    /**
     * A group's bookmark, from SQLite (§9.4.1).
     *
     * A database that predates the bookmark table has no row yet; its value lives
     * in `store.json` under `sync.<group>.bookmark`. That value is read once and
     * written into the table, so the next merge commits it with its page and the
     * legacy key is never consulted again. A reset writes the table directly, so
     * it cannot be undone by a stale store key.
     */
    function readBookmark(group: SyncGroup): Effect.Effect<number, SyncError> {
      return Effect.gen(function* () {
        const rows = yield* db
          .selectMany<{ seq: number }>("SELECT seq FROM sync_bookmark WHERE group_name = $1", [
            group,
          ])
          .pipe(
            Effect.mapError(
              (error) =>
                new SyncError({ message: `Gagal membaca posisi sinkronisasi: ${error.message}` }),
            ),
          );
        const stored = rows[0]?.seq;
        if (stored !== undefined) return stored;

        const legacy = numeric(yield* read<unknown>(legacyBookmarkKey(group), 0)) ?? 0;
        if (legacy > 0) {
          const statement = bookmarkStatement(group, legacy);
          yield* db
            .execute(statement.sql, statement.bindings ?? [])
            .pipe(Effect.orElseSucceed(() => undefined));
        }
        return legacy;
      });
    }

    /** True once this device has a durable bookmark row for the group. */
    function hasBookmarkRow(group: SyncGroup): Effect.Effect<boolean> {
      return db
        .selectMany<{ seq: number }>("SELECT seq FROM sync_bookmark WHERE group_name = $1", [group])
        .pipe(
          Effect.map((rows) => rows.length > 0),
          Effect.orElseSucceed(() => false),
        );
    }

    /**
     * The parked money rows (§7.5).
     *
     * The table is authoritative once a bookmark row exists — it is written with
     * the page that parked the rows. Before that, the pre-table `store.json` list
     * is read and will be migrated by the first merge.
     */
    function readParked(group: SyncGroup): Effect.Effect<ParkedMoney[]> {
      return Effect.gen(function* () {
        if (group !== "money") return [];
        const durable = yield* hasBookmarkRow(group);
        const rows = yield* db
          .selectMany<{ seq: number; row_json: string }>(
            "SELECT seq, row_json FROM sync_parked_money ORDER BY money_id",
          )
          .pipe(Effect.orElseSucceed(() => []));
        if (durable) {
          const out: ParkedMoney[] = [];
          for (const row of rows) {
            try {
              out.push({ seq: row.seq, row: JSON.parse(row.row_json) as WireRow });
            } catch {
              // A corrupt row is dropped; the page that parked it is re-pulled
              // only if the bookmark never advanced past it.
            }
          }
          return out;
        }
        const legacy = yield* read<unknown>(LEGACY_PARKED_KEY, []);
        return parkedFrom(legacy);
      });
    }

    /**
     * Re-reads the service that owns this group's tables, so the screen shows the
     * merged rows. A refresh is a convenience for the running UI; the merge itself
     * is on disk and correct, so failing the whole sync over it would be worse.
     */
    function refreshGroup(group: SyncGroup): Effect.Effect<void> {
      const refresh: Effect.Effect<void, unknown> =
        group === "money"
          ? money.refresh()
          : group === "customer"
            ? customer.refresh()
            : group === "supplier"
              ? supplier.refresh()
              : group === "method"
                ? method.refresh()
                : group === "social"
                  ? social.refresh()
                  : group === "extra"
                    ? extra.refresh()
                    : group === "product"
                      ? product.refresh()
                      : record.refresh();
      return refresh.pipe(
        Effect.asVoid,
        Effect.catchAllCause((cause) =>
          Effect.sync(() =>
            log.error(new Error(`sync: refresh ${group} failed: ${String(cause)}`)),
          ),
        ),
      );
    }

    /**
     * The installation id, minted on first use.
     *
     * Failing to persist it would not fail the sync: an unattributable request is
     * worse than a missing one, but it is not worse than not syncing at all.
     */
    function deviceId(): Effect.Effect<string> {
      return Effect.gen(function* () {
        const stored = yield* read<unknown>(KEY_DEVICE_ID, "");
        if (typeof stored === "string" && stored !== "") return stored;
        const minted = crypto.randomUUID();
        yield* write(KEY_DEVICE_ID, minted).pipe(Effect.orElseSucceed(() => undefined));
        return minted;
      });
    }

    function getConfig(): Effect.Effect<SyncConfig, SyncError> {
      return Effect.gen(function* () {
        const baseUrl = yield* read<unknown>(KEY_BASE_URL, SYNC_CONFIG_DEFAULT.baseUrl);
        const token = yield* read<unknown>(KEY_TOKEN, SYNC_CONFIG_DEFAULT.token);
        return {
          baseUrl: typeof baseUrl === "string" ? baseUrl : SYNC_CONFIG_DEFAULT.baseUrl,
          token: typeof token === "string" ? token : "",
        };
      });
    }

    /**
     * The configured server as a request target, or the sentence that says which
     * half is missing.
     *
     * Trailing slashes are stripped here rather than trusted from the store: the
     * Rust side appends `/v2/...` to whatever it is given, so `https://x/` would
     * ask for `https://x//v2/...`. A plain-`http` URL is refused unless it names
     * the local machine, because the token is a full read/write credential and a
     * token sent in the clear is a leaked token (§2.5).
     */
    function endpointOf(config: SyncConfig): Effect.Effect<Endpoint, SyncError> {
      return Effect.gen(function* () {
        const baseUrl = config.baseUrl.trim().replace(/\/+$/, "");
        const token = config.token.trim();
        if (baseUrl === "") {
          return yield* Effect.fail(
            new SyncError({
              message: "Alamat server belum diisi. Isi di Pengaturan → Sinkronisasi.",
              code: "bad_request",
            }),
          );
        }
        if (token === "") {
          return yield* Effect.fail(
            new SyncError({
              message: "Token sinkronisasi belum diisi. Isi di Pengaturan → Sinkronisasi.",
              code: "unauthorized",
              status: 401,
            }),
          );
        }
        if (baseUrl.startsWith("http://")) {
          let host = "";
          try {
            host = new URL(baseUrl).hostname;
          } catch {
            host = "";
          }
          if (!isLocalHost(host)) {
            return yield* Effect.fail(
              new SyncError({
                message:
                  "Alamat server harus memakai https. http hanya diizinkan untuk server lokal.",
                code: "bad_request",
              }),
            );
          }
        }
        return { baseUrl, token, deviceId: yield* deviceId() };
      });
    }

    /**
     * The Cek button's one question: does this server answer, and does this token
     * work against it?
     *
     * The address goes through `endpointOf` like a real run, so a Cek that passes
     * is a check of exactly the request the cycle will make. Only a 2xx becomes a
     * `SyncHealth`; everything else — a rejected token, a host that does not
     * resolve, a proxy's HTML error page — is a `SyncError` carrying the sentence
     * the screen shows inline.
     */
    function checkHealth(config: SyncConfig): Effect.Effect<SyncHealth, SyncError> {
      return Effect.gen(function* () {
        const endpoint = yield* endpointOf(config);
        return yield* Effect.tryPromise({
          try: () => transport.health(endpoint),
          catch: toSyncError,
        });
      });
    }

    /**
     * `GET /v2/health` must report `protocol: 2` before a group route is called
     * (§2.8). Checked once per session: the server does not change protocol while
     * the app runs, and a request per cycle would be a request per cycle.
     *
     * A body that is not JSON is tolerated (a proxy or a minimal health endpoint);
     * a body that *does* carry `protocol` and names something other than 2 is a
     * refusal, because the base URL points at a server this client does not speak
     * to.
     */
    function ensureProtocol(endpoint: Endpoint): Effect.Effect<void, SyncError> {
      return Effect.gen(function* () {
        if (protocolChecked) return;
        const health = yield* Effect.tryPromise({
          try: () => transport.health(endpoint),
          catch: toSyncError,
        });
        let protocol: unknown;
        try {
          protocol = (JSON.parse(health.message) as { protocol?: unknown }).protocol;
        } catch {
          protocol = undefined;
        }
        if (typeof protocol === "number" && protocol !== 2) {
          return yield* Effect.fail(
            new SyncError({
              message: `Server ini memakai protokol ${protocol}, aplikasi membutuhkan protokol 2.`,
              code: "bad_request",
            }),
          );
        }
        protocolChecked = true;
      });
    }

    /** The statements, applied as one real transaction by `sync_merge` in Rust. */
    const mergeExecutor: MergeExecutor = (statements, what) =>
      statements.length === 0
        ? Effect.void
        : Effect.tryPromise({
            try: () => transport.merge(statements),
            catch: (error) =>
              new SyncError({
                message: `Sinkronisasi ${what} gagal disimpan: ${
                  error instanceof Error ? error.message : String(error)
                }`,
              }),
          }).pipe(Effect.asVoid);

    /**
     * `Sinkronisasi Ulang`: every bookmark to zero and every row queued for push.
     *
     * This is the contract's seeding procedure (§13.4) and the recovery from a
     * refused bookmark (§9.8) in one shape: mark every row dirty, keep its content
     * and its clock, delete nothing. For a device whose rows predate v2 it is what
     * gives them a server-side counterpart.
     */
    function resetLocal(): Effect.Effect<void, SyncError> {
      return Effect.gen(function* () {
        const statements = SYNC_GROUPS.flatMap((group) => [
          ...markAllUnsyncedStatements(group),
          // A re-seed of `product` re-claims its image bytes too: the operator who
          // presses Sinkronisasi Ulang is saying the server's copy is not to be
          // trusted, and that includes the objects behind the rows (§8.7.1).
          ...(group === "product" ? [forgetUploadedBlobsStatement()] : []),
          bookmarkStatement(group, 0),
        ]);
        // The same real transaction the merge uses: marking rows dirty and moving
        // the bookmark is one commit, not two.
        yield* mergeExecutor(statements, "reset");
        // The pre-table store keys must not resurrect a cursor the table just
        // reset; the table is authoritative from here on.
        for (const group of SYNC_GROUPS) {
          yield* store.remove(legacyBookmarkKey(group)).pipe(Effect.orElseSucceed(() => undefined));
        }
        yield* store.remove(LEGACY_PARKED_KEY).pipe(Effect.orElseSucceed(() => undefined));
        // `stocks` is a projection of the journal this reset is re-seeding, so it is
        // re-folded from it: Sinkronisasi Ulang is the operator's repair path, and a
        // catalogue whose cached costs came from somewhere else is exactly what they
        // are asking to be put right.
        const products = yield* db
          .selectMany<{ product_id: string }>(
            "SELECT DISTINCT product_id FROM product_events WHERE stock_id IS NOT NULL",
          )
          .pipe(Effect.orElseSucceed(() => []));
        yield* mergeExecutor(
          yield* stockFoldStatements(
            db,
            products.map((row) => row.product_id),
          ),
          "product stocks",
        );
        yield* Effect.forEach(SYNC_GROUPS, (group) => refreshGroup(group), { discard: true });
        log.info("sync: reset — every bookmark cleared, every synced row queued for push");
      });
    }

    /**
     * The recovery for a bookmark the server will not serve (§9.8): `400` (the
     * bookmark is ahead of the server) and `410` (older than its retained
     * history) both mean "this device's mirror came from somewhere else".
     *
     * The re-seed keeps every row: the bookmark goes to `0` on a `400` and to the
     * server's `floor` on a `410` (never `0`, which is below the floor and would
     * loop), and every synced row is marked dirty. Nothing is deleted and no clock
     * is touched. The pull then re-uploads nothing it did not need to.
     */
    function reseed(group: SyncGroup, error: SyncError): Effect.Effect<void, SyncError> {
      return Effect.gen(function* () {
        const target = error.status === 410 ? Math.max(0, error.floor ?? 0) : 0;
        yield* mergeExecutor(
          [
            ...markAllUnsyncedStatements(group),
            // A server that refused the bookmark may have lost its object store
            // with the log, so the picture claims go back on the queue (§8.7.1).
            ...(group === "product" ? [forgetUploadedBlobsStatement()] : []),
            bookmarkStatement(group, target),
          ],
          `${group} re-seed`,
        );
        yield* refreshGroup(group);
        log.info(
          `sync: ${group} bookmark refused (${error.status ?? "?"}) — re-seeding from ${target}`,
        );
      });
    }

    function isRefusedBookmark(error: SyncError): boolean {
      return error.status === 400 || error.status === 410;
    }

    /** Parked money rows left after a cycle (§7.5) — a visible, retried state. */
    function pendingCount(group: SyncGroup): Effect.Effect<number> {
      return readParked(group).pipe(Effect.map((parked) => parked.length));
    }

    /**
     * Live rows hidden behind a soft-deleted parent (§6.6, §15.13).
     *
     * They are kept and still counted; this figure is how the screen can say so
     * instead of leaving them invisible.
     */
    function orphanCount(group: SyncGroup): Effect.Effect<number> {
      const query =
        group === "money"
          ? `SELECT COUNT(*) AS total FROM money m
             JOIN pockets p ON p.pocket_id = m.pocket_id
             WHERE m.money_deleted_at IS NULL AND p.pocket_deleted_at IS NOT NULL`
          : group === "product"
            ? `SELECT
                 (SELECT COUNT(*) FROM product_names c JOIN products p ON p.product_id = c.product_id
                   WHERE c.product_name_deleted_at IS NULL AND p.product_deleted_at IS NOT NULL)
               + (SELECT COUNT(*) FROM properties c JOIN products p ON p.product_id = c.product_id
                   WHERE c.property_deleted_at IS NULL AND p.product_deleted_at IS NOT NULL)
               + (SELECT COUNT(*) FROM listings c JOIN products p ON p.product_id = c.product_id
                   WHERE c.listing_deleted_at IS NULL AND p.product_deleted_at IS NOT NULL)
               + (SELECT COUNT(*) FROM images c JOIN products p ON p.product_id = c.product_id
                   WHERE c.image_deleted_at IS NULL AND p.product_deleted_at IS NOT NULL) AS total`
            : null;
      if (query === null) return Effect.succeed(0);
      return db
        .selectMany<{ total: number }>(query)
        .pipe(
          Effect.map((rows) => rows[0]?.total ?? 0),
          Effect.orElseSucceed(() => 0),
        );
    }

    /**
     * One group's cycle: pull until caught up, push what is owed, pull once more
     * (§9.2).
     *
     * One page = one request + one merge + one bookmark write, and the bookmark is
     * written **inside** that merge transaction (§9.4.1). A refused bookmark is
     * re-seeded once per group per run; a second refusal is a real failure and
     * stops the group instead of looping.
     *
     * ## The one bar
     *
     * The cycle's work is counted **before** it starts: this group's remaining log
     * (`meta.count`, asked for on the first page), the rows this device still owes,
     * and the image files each direction. `planCycle` turns those counts into the
     * three slices of one bar, so a run that is all push does not spend its first
     * 60% on a pull that had three changes in it. Within a slice the fraction is
     * measured — changes stored, rows acked, files landed — never guessed.
     *
     * ## The byte counters
     *
     * Under the bar, in both directions: bytes that actually crossed, and — while a
     * file pass is running — where that pass will end. The `bytes` are sums of real
     * lines and real files. A `total` exists only when it is *known* (the manifest
     * states every file's size before the pass starts); a row pass has no byte
     * total to offer, so it says so with `null` rather than projecting one from the
     * rows that happened to arrive. That projection rose as bigger rows turned up,
     * and being clamped upward it could never come back down — a denominator that
     * grew the longer the sync ran.
     */
    function groupCycle(group: SyncGroup, endpoint: Endpoint): Effect.Effect<GroupReport, SyncError> {
      return Effect.gen(function* () {
        let parked = yield* readParked(group);
        let pulled = 0;
        let stale = 0;
        // Image bytes are their own channel (§8.7.1): no `seq`, no log entry, no
        // bookmark. Only the product group moves them, and both passes are bounded.
        let imagesUp = 0;
        let imagesDown = 0;
        const movesBytes = group === "product";

        // The bookmark this run started from, and the first snapshot it saw.
        const startAt = yield* readBookmark(group);
        let target: number | null = null;

        // --- what this cycle owes, counted before the first request -----------
        //
        // The push backlog is a local count; the pull's size arrives with the first
        // page (`meta.count`), and the image work follows from it (one fetch pass
        // per page). Counted once: the plan is fixed for the whole cycle, and
        // `push` is handed the backlog so it does not scan every unsynced table a
        // second time.
        const pushRows = yield* countUnsynced(db, group);
        let plan: CyclePlan | null = null;
        /** Changes this cycle's pulls owe, once the server said (best estimate otherwise). */
        let pullChanges: number | null = null;

        // --- what has crossed so far ----------------------------------------
        let changesDone = 0;
        let pushedRows = 0;
        const moved = { rowsDown: 0, rowsUp: 0, imagesDown: 0, imagesUp: 0 };
        /**
         * The log entries this device's own push created in this cycle.
         *
         * Handed to the closing pull, which drops them on sight: they are this
         * device's rows coming straight back as `noop`s, and after a first upload
         * that is the whole catalogue — thirty-odd pages re-merged to change
         * nothing, with the bar already reading 100%.
         */
        const ownSeqs = new Set<number>();

        /** The group's byte counters, as the screen reads them (nothing owed right now). */
        const transfer = (sides?: { down?: TransferSide; up?: TransferSide }): GroupTransfer => ({
          down: sides?.down ?? side(moved.rowsDown + moved.imagesDown, 0),
          up: sides?.up ?? side(moved.rowsUp + moved.imagesUp, 0),
        });

        /** How far a stage is, as a 0…1 fraction of the units it was planned with. */
        const stageFraction = (stage: Stage, done: number): number => {
          if (plan === null) return 0;
          const units = plan.units[stage];
          if (units <= 0) return 1;
          return done / units;
        };

        /** Places this stage's own fraction on the cycle's single bar. */
        const staged = (stage: Stage, done: number): number =>
          plan === null ? 0 : place(plan.slices[stage], stageFraction(stage, done));

        const pullAll = (
          recover: boolean,
          stage: Stage,
          askCount: boolean,
          /** Entries this cycle's own push created — dropped, not merged (§9.2). */
          skip: ReadonlySet<number> | null = null,
        ): Effect.Effect<void, SyncError> =>
          Effect.gen(function* () {
            const settling = stage === "settle";
            /**
             * Where this pull sits on the cycle's bar.
             *
             * The main pull counts what it has stored — changes plus image files
             * landed, against the units it was planned with. The closing pull has a
             * small fixed slice instead (`plan.units.settle`): it is one empty page
             * most of the time, and occasionally everything another till wrote in
             * the last minute, so a row count would swing its share mid-run. It
             * cannot measure itself, so the slice sits where it starts until the
             * last page lands — which is why the slice is a visible 1.5% instead of
             * rounding the bar up to 100% before this phase has begun.
             */
            const at = (imagesLanded: number, finished: boolean): number => {
              if (settling) {
                return place(plan?.slices.settle ?? { from: 0, to: 1 }, finished ? 1 : 0);
              }
              return staged(stage, changesDone * PLAN_UNITS.row + imagesLanded * PLAN_UNITS.image);
            };

            for (;;) {
              const after = yield* readBookmark(group);

              publishGroupNow(group, {
                phase: settling ? "settle" : "pull",
                message: settling
                  ? "Memeriksa perubahan lain…"
                  : after === 0
                    ? "Mengunduh semua perubahan…"
                    : "Mengunduh perubahan…",
              });
              const outcome = yield* pullPageWithRetry({
                transport,
                endpoint,
                group,
                after,
                // Only the first request of a sequence asks: `count` costs the
                // server a scan of the whole remaining range, and a later page
                // already knows what was left.
                count: askCount,
                onProgress: () =>
                  // A page arrives whole, so there is nothing to report mid-request.
                  publishGroup(group, {
                    phase: settling ? "settle" : "pull",
                    message: settling ? "Memeriksa perubahan lain…" : "Mengunduh perubahan…",
                  }),
              }).pipe(Effect.either);
              // Only the first request of this sequence asks for a count.
              askCount = false;

              if (outcome._tag === "Left") {
                if (!recover || !isRefusedBookmark(outcome.left)) {
                  return yield* Effect.fail(outcome.left);
                }
                yield* reseed(group, outcome.left);
                // The target of a re-seeded mirror is meaningless; the restart
                // sizes it again from the first page of the fresh pull.
                target = null;
                pullChanges = null;
                plan = null;
                return yield* pullAll(false, stage, true, skip);
              }

              const page = outcome.right;
              if (target === null && page.snapshot !== null && page.snapshot > startAt) {
                target = page.snapshot;
              }
              if (pullChanges === null) {
                // `meta.count` is this group's own backlog; without it (an older
                // server) the shared counter is the only denominator there is, so
                // the bar falls back to its old, coarser estimate.
                pullChanges = page.count ?? (target === null ? 0 : Math.max(0, target - startAt));
                // The image passes run once per pull page, so their planned share
                // depends on how many pages this pull will take.
                const pages = Math.max(1, Math.ceil(pullChanges / pullLimit(group)));
                const images = movesBytes ? yield* countImageBlobs(db, pages) : { up: 0, down: 0 };
                plan = planCycle({ pullChanges, pushRows, images });
              }

              // §9.2: the closing pull hands back the entries this device's own push
              // created. They are `noop`s by construction — the row is already here,
              // with the seq the ack carried — so dropping them costs nothing and
              // saves re-merging (and re-folding stocks for) a whole catalogue. The
              // bookmark still advances past them: they were read, and skipping the
              // seq would make the next page the same page forever.
              const incoming = skip === null ? page.page : withoutSeqs(page.page, skip);
              const arrived =
                page.page.changes.length + page.page.aggregates.length + page.page.deletions.length;
              const frames =
                incoming.changes.length + incoming.aggregates.length + incoming.deletions.length;
              // A page that carried something and had all of it dropped revealed
              // nothing: no merge to write, no refresh to do, and nothing that could
              // have brought a picture this device is still missing.
              const echoPage = arrived > 0 && frames === 0;

              publishGroupNow(group, {
                phase: "merge",
                message: echoPage ? "Melewati data yang sudah ada…" : "Menyimpan hasil unduhan…",
              });
              // §3.3: `done.s`, never `meta.snapshot` — the page can stop early.
              // Never backwards: a page that reports a seq below the bookmark is
              // a broken server, and moving back would loop on the same page.
              const stored = Math.max(after, page.lastSeq);
              const merged = yield* mergePage(
                { db, execute: mergeExecutor },
                group,
                incoming,
                parked,
                { bookmark: stored },
              );
              parked = merged.parked;
              if (!echoPage) yield* refreshGroup(group);

              changesDone += frames;
              moved.rowsDown += echoPage ? 0 : page.bytes;

              // §8.7.1 "bytes after the page": the page and its bookmark are
              // committed, so a picture that is still missing cannot hold either of
              // them back. The pass is bounded, and whatever it leaves is still owed
              // on the next cycle.
              if (movesBytes && !echoPage) {
                // A pass reports its own running total (`bytes` is cumulative
                // within the pass), so the state add-up happens once it returns.
                let passBytes = 0;
                const report = yield* fetchImageBlobs({
                  db,
                  transport,
                  endpoint,
                  onProgress: (tick: BlobTick) => {
                    passBytes = tick.bytes;
                    // What is left of *this* pass, stated by the manifest before the
                    // first file moved. The only byte total in the whole cycle that
                    // is known rather than guessed.
                    const left =
                      tick.bytesTotal === null ? 0 : Math.max(0, tick.bytesTotal - tick.bytes);
                    publishGroup(group, {
                      phase: settling ? "settle" : "pull",
                      progress: at(imagesDown + tick.done, false),
                      message: `Mengunduh gambar ${tick.done}/${tick.total}…`,
                      transfer: {
                        down: side(moved.rowsDown + moved.imagesDown + tick.bytes, left),
                        up: transfer().up,
                      },
                    });
                  },
                });
                moved.imagesDown += passBytes;
                imagesDown += report.fetched + report.adopted;
              }

              pulled += frames;
              stale += merged.stats.stale;
              // Progress is published after the commit, so the bar only ever
              // reports data that is actually on disk.
              publishGroup(group, {
                phase: settling ? "settle" : "pull",
                progress: at(imagesDown, !page.more),
                message: settling
                  ? page.more
                    ? "Memeriksa perubahan lain…"
                    : "Pemeriksaan selesai"
                  : page.more
                    ? "Mengunduh perubahan…"
                    : "Unduhan selesai",
                transfer: transfer(),
              });
              if (!page.more) return;
            }
          });

        yield* pullAll(true, "pull", true);

        publishGroupNow(group, { phase: "push", message: "Mengunggah perubahan…" });
        const pushed = yield* push({
          db,
          transport,
          endpoint,
          group,
          execute: mergeExecutor,
          // The same count the bar was planned with: counting again would scan
          // every unsynced table twice for a number already in hand.
          expected: pushRows,
          onProgress: (progress) => {
            pushedRows = progress.done;
            moved.rowsUp = progress.bytes;
            publishGroup(group, {
              phase: "push",
              progress: staged(
                "push",
                progress.done * PLAN_UNITS.row + imagesUp * PLAN_UNITS.image,
              ),
              message:
                progress.entity === null
                  ? "Mengunggah perubahan…"
                  : `Mengunggah ${progress.entity}…`,
              transfer: transfer(),
            });
          },
        });
        yield* refreshGroup(group);
        // The acked rows are the row half of the push; the entries it created are
        // the half the closing pull must not re-download.
        moved.rowsUp = pushed.bytes;
        pushedRows = pushed.pushed;
        for (const seq of pushed.written) ownSeqs.add(seq);

        // `stocks` is a projection of the journal, and a device folds it as it
        // writes its own events — but a journal that predates the projection (or
        // came from a schema migration) has never been folded, and its own rows no
        // longer come back through the closing pull to be folded there. So the fold
        // for what this push uploaded happens here, in its own transaction.
        if (movesBytes && pushed.appliedJournal.length > 0) {
          yield* mergeExecutor(yield* stockFoldStatements(db, pushed.appliedJournal), "product");
          yield* refreshGroup(group);
        }

        // §8.7.1 "rows, then bytes": an upload carries the `version` the file was
        // produced for, and the server accepts bytes only for a row it already has.
        // Running after the push is what makes that true — and an upload for a
        // version the server answered `stale` never happens, because a stale row is
        // no longer the local clock.
        if (movesBytes) {
          let passBytes = 0;
          const uploads = yield* uploadImageBlobs({
            db,
            transport,
            endpoint,
            onProgress: (tick: BlobTick) => {
              passBytes = tick.bytes;
              // The files this pass is going to send, sized from disk before the
              // first one left — a real total, unlike a projection from average row
              // sizes.
              const left = tick.bytesTotal === null ? 0 : Math.max(0, tick.bytesTotal - tick.bytes);
              publishGroup(group, {
                phase: "push",
                progress: staged(
                  "push",
                  pushedRows * PLAN_UNITS.row + (imagesUp + tick.done) * PLAN_UNITS.image,
                ),
                message: `Mengunggah gambar ${tick.done}/${tick.total}…`,
                transfer: {
                  down: transfer().down,
                  up: side(moved.rowsUp + moved.imagesUp + tick.bytes, left),
                },
              });
            },
          });
          imagesUp += uploads.uploaded;
          moved.imagesUp += passBytes;
        }

        // §9.2 "pull → push → pull": the final pull picks up whatever another
        // till wrote while this one was pushing, and is usually one empty page.
        // The entries this device's own push created are dropped as they arrive
        // (`ownSeqs`) — they are this device's rows coming back, and re-merging
        // them is a page of `noop`s that costs a page's worth of waiting.
        yield* pullAll(false, "settle", false, ownSeqs);

        return {
          bookmark: yield* readBookmark(group),
          pulled,
          pushed: pushed.pushed,
          // Anything the push could not send is part of this group's outcome, not
          // a footnote: the screen must not say "Selesai" over owed rows.
          remaining: pushed.remaining,
          stale: stale + pushed.stale,
          pending: yield* pendingCount(group),
          orphans: yield* orphanCount(group),
          imagesUp,
          imagesDown,
        };
      });
    }

    /**
     * The whole run: every group in order, one progress bar each.
     *
     * Every state published here carries this run's `startedAt`, so the pill can
     * count elapsed time and a finished run still says when it began. The builder
     * is per-run on purpose: two runs must never blend their counters.
     *
     * A group's failure is its own, except `401`: an unauthorised device would
     * produce eight identical errors, so that one stops every group (§9.11).
     */
    function execute(mode: SyncMode): Effect.Effect<SyncReport, SyncError> {
      const startedAt = Date.now();
      const state = (status: SyncStatus, fields: Partial<SyncState> = {}): SyncState => ({
        status,
        // A fresh counter pair per group per run: the byte totals are mutable state
        // with a lifetime, and a copy of `SYNC_IDLE`'s objects would be shared by
        // every run that ever started.
        groups: SYNC_IDLE.groups.map((entry) => ({ ...entry, transfer: idleTransfer() })),
        message: "",
        startedAt,
        finishedAt: null,
        report: null,
        error: null,
        ...fields,
      });

      return Effect.gen(function* () {
        const endpoint = yield* endpointOf(yield* getConfig());
        yield* ensureProtocol(endpoint);

        if (mode === "reset") {
          publishNow(state("preparing", { message: "Menyiapkan sinkronisasi ulang…" }));
          yield* resetLocal();
        }

        // A fresh run starts every bar at idle, so a previous run's "Selesai"
        // does not sit next to a group that is working again.
        publishNow(state("running", { message: "Menyinkronkan…" }));

        const reports = {} as Record<SyncGroup, GroupReport>;
        const failures: { group: SyncGroup; error: SyncError }[] = [];

        for (const group of SYNC_GROUPS) {
          const outcome = yield* groupCycle(group, endpoint).pipe(
            Effect.map((report) => ({ report, error: null as SyncError | null })),
            Effect.catchAll((error) =>
              Effect.succeed({ report: null, error: error as SyncError | null }),
            ),
          );

          if (outcome.error !== null) {
            const error = outcome.error;
            publishGroupNow(group, {
              phase: "failed",
              message: error.message,
              error: error.message,
            });
            failures.push({ group, error });
            // `401` is the device, not the group: stop before the next group
            // produces the same error again.
            if (error.status === 401) break;
            continue;
          }

          const report = outcome.report;
          if (report === null) continue;
          reports[group] = report;
          // The one line a finished bar shows. Image counts only appear when the
          // product group actually moved bytes, so a money-only till is not told
          // about pictures it does not have.
          const parts = [`${report.pulled} diunduh`, `${report.pushed} diunggah`];
          if (report.imagesUp > 0) parts.push(`${report.imagesUp} gambar diunggah`);
          if (report.imagesDown > 0) parts.push(`${report.imagesDown} gambar diunduh`);
          // A group that still owes rows says so here. It is not an error — the
          // rows are on disk and the next run sends them — but a bar that claims
          // to be finished while a catalogue is half-uploaded is worse than a
          // slower run.
          if (report.remaining > 0) parts.push(`${report.remaining} belum terkirim`);
          publishGroupNow(group, {
            phase: "done",
            progress: 1,
            message: `Selesai — ${parts.join(", ")}`,
            report,
          });
        }

        if (failures.length > 0) {
          const first = failures[0]!;
          const message =
            failures.length === 1
              ? first.error.message
              : `${first.error.message} (${failures.length} grup gagal)`;
          return yield* Effect.fail(new SyncError({ ...first.error, message }));
        }

        const complete = {} as Record<SyncGroup, GroupReport>;
        for (const group of SYNC_GROUPS) {
          const report = reports[group];
          if (report === undefined) {
            return yield* Effect.fail(
              new SyncError({ message: `Sinkronisasi grup ${group} tidak selesai` }),
            );
          }
          complete[group] = report;
        }

        const totals = Object.values(complete).reduce(
          (sum, report) => ({
            pulled: sum.pulled + report.pulled,
            pushed: sum.pushed + report.pushed,
            stale: sum.stale + report.stale,
            pending: sum.pending + report.pending,
            orphans: sum.orphans + report.orphans,
            remaining: sum.remaining + report.remaining,
          }),
          { pulled: 0, pushed: 0, stale: 0, pending: 0, orphans: 0, remaining: 0 },
        );
        const report: SyncReport = { groups: complete, ...totals };
        // A run with rows still owed is not "selesai" in the one sense an operator
        // cares about; say it in the same sentence as the totals.
        const owed =
          totals.remaining > 0 ? ` — ${totals.remaining} baris belum terkirim` : "";
        publishNow(
          state("done", {
            groups: latest.groups,
            message: `Selesai — ${totals.pulled} diunduh, ${totals.pushed} diunggah${owed}`,
            report,
            finishedAt: Date.now(),
          }),
        );
        return report;
      }).pipe(
        // The terminal states belong to the run, not to whoever is watching: a
        // background run's failure must be visible after the screen that started
        // it is long gone.
        Effect.catchAll((error) =>
          Effect.gen(function* () {
            publishNow(
              state("failed", {
                groups: latest.groups,
                message: error.message,
                error: error.message,
                finishedAt: Date.now(),
              }),
            );
            return yield* Effect.fail(error);
          }),
        ),
        Effect.onInterrupt(() =>
          Effect.sync(() => {
            publishNow(
              state("cancelled", {
                groups: latest.groups,
                message: "Sinkronisasi dibatalkan",
                finishedAt: Date.now(),
              }),
            );
          }),
        ),
      );
    }

    /**
     * The loop, registering itself so `cancel` can interrupt it.
     *
     * A trigger that arrives while the loop is running asked for one more pass,
     * not for a second loop: the flag is consumed once, after the current run
     * settles, so a burst of triggers costs one extra cycle (§9.11).
     */
    function loop(mode: SyncMode): Effect.Effect<SyncReport, SyncError> {
      return Effect.withFiberRuntime((fiber) =>
        Effect.gen(function* () {
          yield* Ref.set(running, fiber);
          return yield* Effect.gen(function* () {
            let report = yield* execute(mode);
            const again = yield* Ref.modify(rerun, (value) => [value, false] as const);
            if (again) report = yield* execute("sync");
            return report;
          }).pipe(Effect.ensuring(Ref.set(running, null)));
        }),
      );
    }

    return {
      config: {
        get: () => getConfig(),
        // The same mint-and-persist the sync itself uses: one definition, so the
        // id on screen is the id that reaches the server's log.
        deviceId: () => deviceId(),
        set: (config) =>
          Effect.gen(function* () {
            yield* write(KEY_BASE_URL, config.baseUrl.trim());
            yield* write(KEY_TOKEN, config.token.trim());
          }),
      },
      check: (config) => checkHealth(config),
      cursor: (group: SyncGroup = "money") => readBookmark(group),
      run: (mode) => loop(mode),
      start: (mode) =>
        Effect.gen(function* () {
          // A scoped product sync is foreground and has no loop to consume
          // `rerun`; refuse a full run rather than queue a phantom extra pass.
          if (yield* Ref.get(scopedBusy)) return "already-running" as const;

          // Atomic claim: two callers that both saw "not busy" must not both fork.
          const free = yield* Ref.modify(busy, (current): readonly [boolean, boolean] =>
            current ? [false, current] : [true, true],
          );
          if (!free) {
            // One cycle per group at a time: coalesce the request into one more
            // pass of the running loop (§9.11).
            yield* Ref.set(rerun, true);
            return "already-running" as const;
          }

          // A daemon, not a child of the caller: the run must outlive the fiber
          // that asked for it (a screen that unmounts, a dialog that closes).
          yield* loop(mode).pipe(Effect.ensuring(Ref.set(busy, false)), Effect.forkDaemon);
          return "started" as const;
        }).pipe(
          // Between the claim and the fork there is no fiber to inherit the
          // release, so an interrupt here would leave the gate shut for the rest
          // of the session — every later `start` answering `already-running`.
          Effect.onInterrupt(() => Ref.set(busy, false)),
        ),
      syncProduct: (productId) =>
        Effect.gen(function* () {
          const id = productId.trim();
          if (id === "") {
            return yield* Effect.fail(
              new SyncError({ message: "Produk tidak dikenal untuk sinkronisasi", code: "bad_request" }),
            );
          }

          // Claim the scoped gate atomically; two clicks must not run two pushes
          // over the same rows. The full-run gate is checked after, and the
          // `ensuring` releases this one on that failure too.
          const free = yield* Ref.modify(scopedBusy, (current): readonly [boolean, boolean] =>
            current ? [false, current] : [true, true],
          );
          if (!free) {
            return yield* Effect.fail(
              new SyncError({
                message: "Sinkronisasi produk lain sedang berjalan",
                code: "busy",
              }),
            );
          }

          return yield* Effect.gen(function* () {
            const fullRunning = yield* Ref.get(busy);
            if (fullRunning) {
              return yield* Effect.fail(
                new SyncError({
                  message: "Sinkronisasi lain sedang berjalan. Coba lagi setelah selesai.",
                  code: "busy",
                }),
              );
            }

            const endpoint = yield* endpointOf(yield* getConfig());
            yield* ensureProtocol(endpoint);

            return yield* syncOneProduct({
              db,
              transport,
              endpoint,
              productId: id,
              execute: mergeExecutor,
              refresh: () => refreshGroup("product"),
            });
          }).pipe(Effect.ensuring(Ref.set(scopedBusy, false)));
        }),
      cancel: () =>
        Effect.gen(function* () {
          const current = yield* Ref.get(running);
          if (current === null) return;
          // Said before the interrupt: delivery happens at the loop's next async
          // boundary, so an in-flight request or merge settles first.
          publishNow({
            ...latest,
            status: "cancelling",
            message: "Membatalkan…",
            finishedAt: null,
          });
          yield* Fiber.interrupt(current);
        }),
      // A `SubscriptionRef.changes` stream already replays the current value, so
      // a pill that mounts in the middle of a run paints immediately.
      state: stateRef.changes,
    };
  }),
);
