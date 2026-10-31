/**
 * The merge half of the loop (contract §5.2, §6).
 *
 * ## Shape: one pull, one write
 *
 * `pull.ts` streams the whole gap and hands the frames here; this module turns
 * them into **one statement batch** and applies it in one `execute` call — one
 * connection, one ordered run of statements. Nothing is merged between pages, so
 * an interrupted run cannot leave the database holding half of a pull: either the
 * batch was applied or it was not, and the cursor only advances after it was.
 *
 * That single-call shape is also why the references can be resolved up front. The
 * merger knows every id the pull carries, so "does this parent exist?" is answered
 * against `local ∪ incoming` instead of "not yet, try again later".
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
  /** Frames applied (a losing `record` header counts as skipped, not merged). */
  merged: number;
  /** Frames the local row won on a tie / newer local clock. */
  skipped: number;
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

export function makeMerger(
  db: DatabaseServiceImpl,
  now: number,
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

  /** The local merge clocks for a set of record ids, missing ids omitted. */
  function recordClocks(ids: readonly string[]): Effect.Effect<Map<string, number>, SyncError> {
    const unique = [...new Set(ids)];
    if (unique.length === 0) return Effect.succeed(new Map());
    return Effect.gen(function* () {
      const clocks = new Map<string, number>();
      for (let start = 0; start < unique.length; start += 400) {
        const slice = unique.slice(start, start + 400);
        const placeholders = slice.map((_, index) => `$${index + 1}`).join(", ");
        const rows = yield* db
          .selectMany<{ record_id: string; record_updated_at: number }>(
            `SELECT record_id, record_updated_at FROM records WHERE record_id IN (${placeholders})`,
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
        for (const row of rows) clocks.set(row.record_id, row.record_updated_at);
      }
      return clocks;
    });
  }

  /**
   * Builds the batch for a whole pull: events and plain rows first (parent-first
   * by the contract's entity order), then the record aggregates, then the two
   * circular pointers that had to wait for the records to exist.
   */
  function plan(frames: PullFrames): Effect.Effect<{ statements: Statement[]; stats: MergeStats }, SyncError> {
    return Effect.gen(function* () {
      const incoming = collectIncoming(frames);
      const deferred: Deferred[] = [];
      const stats: MergeStats = { merged: 0, skipped: 0, deferred: 0 };

      const plain: Statement[] = [];
      const events: Statement[] = [];

      for (const entity of ENTITY_ORDER) {
        if (entity === "record") continue;
        const def = TABLES[entity];
        for (const frame of frames.rows) {
          if (frame.entity !== entity) continue;
          yield* resolveRefs(entity, frame.row, {}, incoming, deferred);
          if (def.deletedAt === null) events.push(mergeEventStatement(def, frame.row, now));
          else plain.push(mergeRowStatement(def, frame.row, now));
          stats.merged += 1;
        }
      }

      const clocks = yield* recordClocks(frames.aggregates.map((item) => String(item.row["record_id"])));

      // Resolve every aggregate's references before emitting any statement, so a
      // decision to skip one cannot leave the resolver half-applied.
      for (const item of frames.aggregates) {
        yield* resolveRefs("record", item.row, item.children, incoming, deferred);
      }

      const aggregates: Statement[] = [];
      for (const item of frames.aggregates) {
        const id = String(item.row["record_id"]);
        const clock = clocks.get(id);
        const incomingClock = Number(item.row["record_updated_at"]);
        if (clock !== undefined && !(incomingClock > clock)) {
          // §5.2: the header lost, so the child arrays stay exactly as they are.
          stats.skipped += 1;
          continue;
        }
        aggregates.push(...recordAggregateStatements(item.row, item.children, now, { force: false }));
        stats.merged += 1;
      }

      // The two circular pointers are written last, once their targets exist: a
      // `product_event.record_id` waits for the record, and a `record_pair_id`
      // waits for its twin. `IS NULL` keeps the update from overwriting a value a
      // later frame already supplied.
      const deferredUpdates: Statement[] = deferred.map((link) => ({
        sql: `UPDATE ${link.table} SET ${link.column} = $1
          WHERE ${link.pkColumn} = $2 AND ${link.column} IS NULL`,
        bindings: [link.value, link.pk],
      }));
      stats.deferred = deferredUpdates.length;

      // Order: every parent row (pockets, products, methods, …), then the event
      // rows a record's children point at, then the aggregates themselves, then the
      // pointers that had to wait for them. Each step only names rows an earlier
      // step has written, so no statement in the batch can violate a foreign key.
      return { statements: [...plain, ...events, ...aggregates, ...deferredUpdates], stats };
    });
  }

  /**
   * Applies a batch as one transaction.
   *
   * No chunking: a real transaction run statement by statement has no
   * `SQLITE_MAX_VARIABLE_NUMBER` concern (that cap is per prepared statement, and
   * ours carry at most one row's columns), so the whole pull commits at once.
   */
  function applyStatements(
    statements: Statement[],
    what: Entity | "pull",
  ): Effect.Effect<void, SyncError> {
    if (statements.length === 0) return Effect.void;
    return execute(statements, what);
  }

  return {
    /** Plans and applies one pull's worth of frames. */
    mergeFrames(frames: PullFrames): Effect.Effect<MergeStats, SyncError> {
      return Effect.gen(function* () {
        const planned = yield* plan(frames);
        if (planned.stats.merged > 0) yield* applyStatements(planned.statements, "pull");
        return planned.stats;
      });
    },

    /** A `stale` ack's row payload: the server won, so it is applied as-is (§5.2). */
    mergeStaleRow(entity: Entity, row: WireRow): Effect.Effect<void, SyncError> {
      return Effect.gen(function* () {
        const incoming: IdSets = new Map();
        yield* resolveRefs(entity, row, {}, incoming, []);
        const def = TABLES[entity];
        const statement =
          def.deletedAt === null
            ? mergeEventStatement(def, row, now)
            : forceRowStatement(def, row, now);
        yield* applyStatements([statement], entity);
      });
    },

    /** A `stale` ack's aggregate payload (§5.2). */
    mergeStaleAggregate(
      row: WireRow,
      children: Record<string, WireRow[]>,
    ): Effect.Effect<void, SyncError> {
      return Effect.gen(function* () {
        const incoming: IdSets = new Map();
        yield* resolveRefs("record", row, children, incoming, []);
        yield* applyStatements(
          recordAggregateStatements(row, children, now, { force: true }),
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
