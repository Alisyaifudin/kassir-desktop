/**
 * The merge half of the loop (contract §5.2, §6).
 *
 * ## Shape: one pull, one plan, applied in slices
 *
 * `pull.ts` streams the whole gap and hands the frames here. This module plans the
 * whole pull at once — which is why the references can be resolved up front: the
 * merger knows every id the pull carries, so "does this parent exist?" is answered
 * against `local ∪ incoming` instead of "not yet, try again later" — and then
 * applies that plan in **bounded slices**, one transaction each.
 *
 * The plan has to be whole-pull; the apply does not. A run is a background task in
 * this app, so it writes while a cashier is selling, and the cart flushes on a
 * 100 ms debounce. One transaction for a first full sync would hold SQLite's writer
 * lock long enough for that flush to time out (`SQLITE_BUSY` after sqlx's 5 s), which
 * is a failed sale caused by a sync the operator never started. A slice keeps the
 * lock to tens of milliseconds.
 *
 * Slicing gives up "all or nothing", deliberately and safely: every statement is
 * LWW-idempotent, merged rows are marked synced so nothing is pushed back, and the
 * cursor only advances after the last slice — so a crash mid-merge re-pulls the
 * same gap and re-merges it into the same result. Between slices the mirror is
 * half-merged, which every reader in this app already tolerates (dangling
 * references are legal, §5.2).
 *
 * ## The rules, as implemented
 *
 *   * a row applies iff `incoming.updated_at > local.updated_at`; a tie keeps the
 *     local row, because the server applies the same comparison and only reaches us
 *     as a `stale` ack payload when it won (§6.2);
 *   * a `record` header that wins replaces **all five** child arrays; if it loses,
 *     the children are not touched (§5.2);
 *   * `product_event` is `INSERT OR IGNORE` — never updated, never deleted (§6.3);
 *   * every merged row gets its `_sync_at` set, so it is not pushed straight back
 *     (§3.1).
 *
 * ## Foreign keys
 *
 * The local schema enforces FKs the server deliberately omits, and two references
 * are genuinely circular on the wire: a `product_event` names its `record`, and a
 * record's children name their events. Statement order breaks the knot —
 * events → records — with the events' `record_id` written by a trailing `UPDATE`
 * in the same batch (§5.2 "dangling references are legal"). References whose
 * target exists nowhere are written `NULL` and logged; a soft delete keeps a row,
 * so that is a truly orphaned pointer, not a normal race.
 */
import { Context, Effect } from "effect";
import type { DatabaseService, Statement } from "../db";
import { CHILDREN, ENTITY_ORDER, TABLES, type Entity, type WireRow, type WireValue } from "./schema";
import {
  forceRowStatement,
  mergeEventStatement,
  mergeRowStatement,
  recordAggregateStatements,
} from "./sql";
import { log } from "~/lib/log";
import { SyncError } from "./index";
import type { PullFrames } from "./pull";

type DatabaseServiceImpl = Context.Tag.Service<typeof DatabaseService>;

/**
 * How many statements one transaction may carry.
 *
 * Sized for the lock, not for the driver: a slice commits in tens of milliseconds
 * on the hardware this ships on, so a queued cart write waits rather than failing.
 * It also bounds the IPC payload of one `sync_merge` call.
 */
const MAX_STATEMENTS_PER_SLICE = 200;

/** One frame's statements — the smallest unit a slice may not cut in half. */
type PlannedGroup = { statements: Statement[]; frame: boolean };

/** One transaction: its statements, and how many frames they account for. */
type Slice = { statements: Statement[]; frames: number };

/**
 * Applies a statement batch in one transaction.
 *
 * Injected rather than reached for directly: the app's implementation sends the
 * batch to `sync_merge` in Rust (plugin-sql exposes no transaction), while the bun
 * tests run it against a real `BEGIN … COMMIT` on `bun:sqlite`. Both are one atomic
 * unit; neither is a loop of autocommitted statements.
 */
export type MergeExecutor = (
  statements: Statement[],
  what: Entity | "pull",
) => Effect.Effect<void, SyncError>;

export type MergeStats = {
  /**
   * Frames planned into the batch.
   *
   * This is not "rows the server's copy beat": whether a frame wins is now decided
   * by SQL inside the transaction (see `recordAggregateStatements`), where this
   * side cannot see it. Counting it in TypeScript would need the clock read the
   * guard exists to avoid — a number nobody renders is not worth a race.
   */
  merged: number;
  /** Pointers written by a trailing `UPDATE` because their target came later. */
  deferred: number;
};

/** Ids per table, as carried by the pull. */
type IdSets = Map<string, Set<string>>;

function idsOf(value: WireValue | undefined): string | null {
  return typeof value === "string" && value !== "" ? value : null;
}

function addId(sets: IdSets, table: string, id: string | null): void {
  if (id === null) return;
  const set = sets.get(table) ?? new Set<string>();
  set.add(id);
  sets.set(table, set);
}

/**
 * Builds a merger.
 *
 * `now` is a thunk, not a number: a background run can be minutes old by the time
 * its merge starts, and `_sync_at` is the marker that means "the server has this
 * row" — stamping it with the run's start time is a small lie that gets larger the
 * longer the run takes. One stamp per batch, so every row a single plan writes
 * carries the same marker.
 */
export function makeMerger(
  db: DatabaseServiceImpl,
  now: () => number,
  execute: MergeExecutor,
) {
  /** Local existence answers, cached for the batch (`table` → id → present). */
  const local = new Map<string, Map<string, boolean>>();

  /** Every id the pull itself carries, so a reference to a not-yet-written parent resolves. */
  function collectIncoming(frames: PullFrames): IdSets {
    const sets: IdSets = new Map();
    for (const { entity, row } of frames.rows) addId(sets, TABLES[entity].table, idsOf(row[TABLES[entity].pk]));
    for (const { row, children } of frames.aggregates) {
      addId(sets, TABLES.record.table, idsOf(row[TABLES.record.pk]));
      const listings = children["record_listings"] ?? [];
      for (const child of listings) {
        addId(sets, "record_listings", idsOf(child["record_listing_id"]));
        addId(sets, "products", idsOf(child["product_id"]));
      }
      for (const child of children["record_methods"] ?? []) {
        addId(sets, "record_methods", idsOf(child["record_method_id"]));
        addId(sets, "methods", idsOf(child["method_id"]));
      }
      for (const child of children["record_extras"] ?? []) {
        addId(sets, "record_extras", idsOf(child["record_extra_id"]));
      }
      for (const child of children["record_images"] ?? []) {
        addId(sets, "record_images", idsOf(child["record_image_id"]));
      }
      for (const child of children["discounts"] ?? []) {
        addId(sets, "discounts", idsOf(child["discount_id"]));
      }
      addId(sets, "suppliers", idsOf(row["record_supplier_id"]));
    }
    return sets;
  }

  /** Which of `ids` exist in `table` locally, one query per chunk of ids. */
  function presentLocally(
    table: string,
    pkColumn: string,
    ids: readonly string[],
  ): Effect.Effect<Set<string>, SyncError> {
    const cache = local.get(table) ?? new Map<string, boolean>();
    local.set(table, cache);
    const unknown = [...new Set(ids)].filter((id) => !cache.has(id));
    if (unknown.length === 0) {
      return Effect.succeed(new Set([...ids].filter((id) => cache.get(id) === true)));
    }
    return Effect.gen(function* () {
      for (let start = 0; start < unknown.length; start += 400) {
        const slice = unknown.slice(start, start + 400);
        const placeholders = slice.map((_, index) => `$${index + 1}`).join(", ");
        const rows = yield* db
          .selectMany<Record<string, unknown>>(
            `SELECT ${pkColumn} FROM ${table} WHERE ${pkColumn} IN (${placeholders})`,
            slice,
          )
          .pipe(
            Effect.mapError(
              (error) =>
                new SyncError({
                  message: `Sinkronisasi gagal membaca data lokal: ${error.message}`,
                }),
            ),
          );
        const found = new Set(rows.map((row) => String(row[pkColumn])));
        for (const id of slice) cache.set(id, found.has(id));
      }
      return new Set([...ids].filter((id) => cache.get(id) === true));
    });
  }

  /** Known = already here or arriving in this same batch. */
  function known(
    table: string,
    pkColumn: string,
    ids: readonly string[],
    incoming: IdSets,
  ): Effect.Effect<Set<string>, SyncError> {
    const arriving = incoming.get(table) ?? new Set<string>();
    const wanted = [...new Set(ids)].filter((id) => id !== "");
    return presentLocally(
      table,
      pkColumn,
      wanted.filter((id) => !arriving.has(id)),
    ).pipe(Effect.map((found) => new Set([...found, ...wanted.filter((id) => arriving.has(id))])));
  }

  /** One pointer that will be written after the rows it names. */
  type Deferred = { table: string; column: string; pk: string; pkColumn: string; value: string };

  /**
   * Nulls the pointers whose target does not exist, and collects the ones that
   * only need to wait for a later statement in the batch.
   */
  function resolveRefs(
    entity: Entity,
    row: WireRow,
    children: Record<string, WireRow[]>,
    incoming: IdSets,
    deferred: Deferred[],
  ): Effect.Effect<void, SyncError> {
    return Effect.gen(function* () {
      if (entity === "product_event") {
        // `stocks` never syncs: a peer's lot id is meaningless here.
        const stockId = idsOf(row["stock_id"]);
        if (stockId !== null) {
          const stocks = yield* presentLocally("stocks", "stock_id", [stockId]);
          if (!stocks.has(stockId)) row["stock_id"] = null;
        }
        const recordId = idsOf(row["record_id"]);
        if (recordId !== null) {
          const records = yield* known("records", "record_id", [recordId], incoming);
          if (!records.has(recordId)) {
            row["record_id"] = null;
          } else if (!(yield* presentLocally("records", "record_id", [recordId])).has(recordId)) {
            // Arrives later in this batch: write the event first, link it after.
            row["record_id"] = null;
            deferred.push({
              table: "product_events",
              column: "record_id",
              pk: String(row["product_event_id"]),
              pkColumn: "product_event_id",
              value: recordId,
            });
          }
        }
        return;
      }

      if (entity !== "record") return;

      const supplierId = idsOf(row["record_supplier_id"]);
      if (supplierId !== null) {
        const suppliers = yield* known("suppliers", "supplier_id", [supplierId], incoming);
        if (!suppliers.has(supplierId)) row["record_supplier_id"] = null;
      }

      const pairId = idsOf(row["record_pair_id"]);
      if (pairId !== null) {
        const records = yield* known("records", "record_id", [pairId], incoming);
        if (!records.has(pairId)) row["record_pair_id"] = null;
        else if (!(yield* presentLocally("records", "record_id", [pairId])).has(pairId)) {
          row["record_pair_id"] = null;
          deferred.push({
            table: "records",
            column: "record_pair_id",
            pk: String(row["record_id"]),
            pkColumn: "record_id",
            value: pairId,
          });
        }
      }

      const listings = children["record_listings"] ?? [];
      if (listings.length === 0) return;
      // Events are written before this aggregate, so an incoming event is already
      // there; products are checked against the pull's own product frames.
      const productIds = listings.map((child) => idsOf(child["product_id"])).filter((id): id is string => id !== null);
      const eventIds = listings
        .map((child) => idsOf(child["product_event_id"]))
        .filter((id): id is string => id !== null);
      const products = yield* known("products", "product_id", productIds, incoming);
      const events = yield* known("product_events", "product_event_id", eventIds, incoming);
      for (const child of listings) {
        const productId = idsOf(child["product_id"]);
        if (productId !== null && !products.has(productId)) child["product_id"] = null;
        const eventId = idsOf(child["product_event_id"]);
        if (eventId !== null && !events.has(eventId)) child["product_event_id"] = null;
      }
    });
  }

  /**
   * Builds the batch for a whole pull: every parent row (pockets, products,
   * methods, …), then the event rows a record's children point at, then the record
   * aggregates, then the two circular pointers that had to wait for the records to
   * exist. Each step only names rows an earlier step has written, so no statement
   * can violate a foreign key.
   *
   * The result is **groups**, not a flat list: one group per frame. A slice of the
   * batch may only cut between groups, so an aggregate's header and its five child
   * arrays are never split across two transactions — a reader would see a record
   * with no lines. Order is preserved across slices, which is what keeps the
   * foreign keys satisfied when a parent lands in one slice and its child in the
   * next.
   */
  function plan(
    frames: PullFrames,
  ): Effect.Effect<{ groups: PlannedGroup[]; frames: number; stats: MergeStats }, SyncError> {
    return Effect.gen(function* () {
      const stamp = now();
      const incoming = collectIncoming(frames);
      const deferred: Deferred[] = [];
      const stats: MergeStats = { merged: 0, deferred: 0 };

      const plain: PlannedGroup[] = [];
      const events: PlannedGroup[] = [];

      for (const entity of ENTITY_ORDER) {
        if (entity === "record") continue;
        const def = TABLES[entity];
        for (const frame of frames.rows) {
          if (frame.entity !== entity) continue;
          yield* resolveRefs(entity, frame.row, {}, incoming, deferred);
          const statement =
            def.deletedAt === null
              ? mergeEventStatement(def, frame.row, stamp)
              : mergeRowStatement(def, frame.row, stamp);
          const group = { statements: [statement], frame: true };
          if (def.deletedAt === null) events.push(group);
          else plain.push(group);
          stats.merged += 1;
        }
      }

      // Resolve every aggregate's references before emitting any statement, so a
      // reference rewritten to NULL here cannot be half-applied by a later failure.
      for (const item of frames.aggregates) {
        yield* resolveRefs("record", item.row, item.children, incoming, deferred);
      }

      // No pre-read of the local clocks: whether a header wins is decided by the
      // upsert itself, and whether its children may be replaced by the guard in
      // `recordAggregateStatements`. A clock read here would be a decision about a
      // row that can change before the statement runs.
      const aggregates: PlannedGroup[] = [];
      for (const item of frames.aggregates) {
        aggregates.push({
          statements: recordAggregateStatements(item.row, item.children, stamp, { force: false }),
          frame: true,
        });
        stats.merged += 1;
      }

      // The two circular pointers are written last, once their targets exist: a
      // `product_event.record_id` waits for the record, and a `record_pair_id`
      // waits for its twin. `IS NULL` keeps the update from overwriting a value a
      // later frame already supplied. They are independent of each other, so they
      // are chunked into their own groups and allowed to spread over slices.
      const deferredUpdates: Statement[] = deferred.map((link) => ({
        sql: `UPDATE ${link.table} SET ${link.column} = $1
          WHERE ${link.pkColumn} = $2 AND ${link.column} IS NULL`,
        bindings: [link.value, link.pk],
      }));
      stats.deferred = deferredUpdates.length;
      const tail: PlannedGroup[] = [];
      for (let start = 0; start < deferredUpdates.length; start += MAX_STATEMENTS_PER_SLICE) {
        tail.push({
          statements: deferredUpdates.slice(start, start + MAX_STATEMENTS_PER_SLICE),
          frame: false,
        });
      }

      return {
        groups: [...plain, ...events, ...aggregates, ...tail],
        frames: frames.rows.length + frames.aggregates.length,
        stats,
      };
    });
  }

  /**
   * Cuts a planned batch into transactions of at most `MAX_STATEMENTS_PER_SLICE`
   * statements, never splitting a group.
   *
   * A group larger than the cap goes into a slice of its own rather than being cut:
   * half an aggregate is a record with the wrong lines.
   */
  function planSlices(groups: readonly PlannedGroup[]): Slice[] {
    const slices: Slice[] = [];
    let current: Slice = { statements: [], frames: 0 };
    for (const group of groups) {
      if (
        current.statements.length > 0 &&
        current.statements.length + group.statements.length > MAX_STATEMENTS_PER_SLICE
      ) {
        slices.push(current);
        current = { statements: [], frames: 0 };
      }
      current.statements.push(...group.statements);
      if (group.frame) current.frames += 1;
    }
    if (current.statements.length > 0) slices.push(current);
    return slices;
  }

  /**
   * Applies one slice as one transaction.
   *
   * Each statement carries at most one row's columns, so the per-statement
   * `SQLITE_MAX_VARIABLE_NUMBER` cap is not a concern; the cap here is about how
   * long the writer lock is held, not about the driver.
   */
  function applyStatements(
    statements: Statement[],
    what: Entity | "pull",
  ): Effect.Effect<void, SyncError> {
    if (statements.length === 0) return Effect.void;
    return execute(statements, what);
  }

  return {
    /**
     * Plans the whole pull once, then applies it in slices.
     *
     * The plan stays whole-pull because that is what lets a reference be resolved
     * against `local ∪ incoming`. Only the *apply* is sliced, to keep SQLite's
     * writer lock short enough that a cart write on the 100 ms debounce queues
     * behind a slice instead of failing after a 5 s busy timeout.
     *
     * A partial merge is safe, and that is what makes slicing possible at all:
     * every statement is LWW-idempotent, merged rows are marked synced so nothing
     * is pushed back, and the caller only advances the cursor after the last slice —
     * so an interrupted run re-pulls the same gap and re-merges it into a no-op.
     * The mirror is briefly half-merged, which every reader here already tolerates
     * (dangling references are legal, §5.2).
     */
    mergeFrames(
      frames: PullFrames,
      onProgress: (progress: { done: number; total: number }) => void = () => undefined,
    ): Effect.Effect<MergeStats, SyncError> {
      return Effect.gen(function* () {
        const planned = yield* plan(frames);
        const slices = planSlices(planned.groups);
        let done = 0;
        for (const slice of slices) {
          yield* applyStatements(slice.statements, "pull");
          done += slice.frames;
          onProgress({ done, total: planned.frames });
          // A yield point between transactions: it lets the UI and the cart's own
          // writes run, and it is where a `cancel` is delivered.
          yield* Effect.yieldNow();
        }
        return planned.stats;
      });
    },

    /**
     * A `stale` ack's row payload: the server won, so it is applied as-is (§5.2) —
     * unless the local row moved after the frame was encoded, in which case the
     * verdict was reached against a value that is no longer there.
     */
    mergeStaleRow(
      entity: Entity,
      row: WireRow,
      onlyIfClock: number,
    ): Effect.Effect<void, SyncError> {
      return Effect.gen(function* () {
        const incoming: IdSets = new Map();
        yield* resolveRefs(entity, row, {}, incoming, []);
        const def = TABLES[entity];
        const stamp = now();
        const statement =
          def.deletedAt === null
            ? mergeEventStatement(def, row, stamp)
            : forceRowStatement(def, row, stamp, onlyIfClock);
        yield* applyStatements([statement], entity);
      });
    },

    /** A `stale` ack's aggregate payload (§5.2), under the same clock guard. */
    mergeStaleAggregate(
      row: WireRow,
      children: Record<string, WireRow[]>,
      onlyIfClock: number,
    ): Effect.Effect<void, SyncError> {
      return Effect.gen(function* () {
        const incoming: IdSets = new Map();
        yield* resolveRefs("record", row, children, incoming, []);
        yield* applyStatements(
          recordAggregateStatements(row, children, now(), { force: true, onlyIfClock }),
          "record",
        );
      });
    },
  };
}

/**
 * A merge write failure. `message` is the cashier-facing sentence; the driver's
 * text goes to the log, like every other DbError consumer in the app.
 */
export function dbFailure(
  what: Entity | "pull",
  error: { message: string; detail?: string },
): SyncError {
  log.error(new Error(`sync merge ${what}: ${error.detail ?? error.message}`));
  return new SyncError({ message: `Sinkronisasi ${what} gagal disimpan: ${error.message}` });
}

/** Child keys a `record` frame carries, in wire order (§5.2) — for tests. */
export const RECORD_CHILD_KEYS = CHILDREN.map((child) => child.key);
