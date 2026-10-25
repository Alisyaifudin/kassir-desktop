import { Data, Effect, Stream, SubscriptionRef } from "effect";

/**
 * The cache lab's fake backend — the same shape as `Dev/PageData/z-sources.ts`,
 * but built to answer the three questions the cache has to survive:
 *
 * 1. **Does a return visit cost a read?** `orders` takes 900 ms to answer, and a
 *    local SQLite query on a real page is the same kind of read: cheap to skip,
 *    visible when it repeats.
 * 2. **Does a write outside this page show up?** `writeElsewhere()` changes what
 *    the reads answer without telling anybody — `pageCache.invalidate` is the
 *    only thing that closes that gap, and the lab lets both halves be pressed
 *    separately.
 * 3. **What must never be cached?** `clock` is a derived stream (`Stream.tick`):
 *    its replay starts at 1 again, so a cached snapshot would be *wrong* the
 *    moment it is painted. `feed`/`activity` are the honest live case: a
 *    `SubscriptionRef` replays its current value, so cache and stream agree.
 */

export class LabError extends Data.TaggedError("LabError")<{ message: string }> {}

export type LabProfile = { name: string; role: string };
export type LabOrders = { orders: number; revenue: number };
export type LabLedgerRow = { id: string; text: string; amount: number };
export type LabActivity = { id: string; text: string };
export type LabClock = { tick: number };

/** Picked so "read again" is unmistakable against "painted from cache" (~0 ms). */
export const LATENCY = {
  profile: 120,
  ledger: 500,
  orders: 900,
  broken: 600,
} as const;

const sleep = (ms: number) => Effect.sleep(`${ms} millis`);

function once<A>(ms: number, value: A): Effect.Effect<A, never> {
  return Effect.zipRight(sleep(ms), Effect.sync(() => value));
}

/**
 * What the "write elsewhere" button changes. Nothing subscribes to it — the
 * reads pick it up the next time they run, which is exactly the staleness the
 * cache has to be told about.
 */
const world = { extraOrders: 0, ledgerRows: 3 };

/** A write nobody was told about: the store still holds the old answer. */
export function writeElsewhere(): void {
  world.extraOrders += 5;
  world.ledgerRows += 1;
}

export function resetWorld(): void {
  world.extraOrders = 0;
  world.ledgerRows = 3;
}

/** Read-once, slow: the key the whole experiment is about. */
export const orders: Effect.Effect<LabOrders, never> = Effect.gen(function* () {
  yield* sleep(LATENCY.orders);
  const count = 128 + world.extraOrders;
  return { orders: count, revenue: count * 36_875 };
});

/** Read-once, scoped by the range picker — proves deps are part of the cache key. */
export function ledger(days: number): Effect.Effect<LabLedgerRow[], never> {
  return Effect.gen(function* () {
    yield* sleep(LATENCY.ledger);
    return Array.from({ length: world.ledgerRows }, (_, index) => ({
      id: `l${index}`,
      text: `${days} hari · baris ${index + 1}`,
      amount: 12_000 * (index + 1),
    }));
  });
}

/** Read-once, fast: still a flash without a cache, invisible with one. */
export const profile: Effect.Effect<LabProfile, never> = once(LATENCY.profile, {
  name: "Siti Rahma",
  role: "Admin",
});

/** Always fails — a failure is never cached, so it never becomes permanent. */
export const broken: Effect.Effect<string, LabError> = Effect.zipRight(
  sleep(LATENCY.broken),
  Effect.fail(new LabError({ message: "Laporan gagal dimuat (server menolak, 503)." })),
);

/**
 * Live state, like `service.record.get.changes`. Replays its current value on
 * every subscribe, so the cache seed and the stream always agree.
 */
export const activityRef = Effect.runSync(
  SubscriptionRef.make<LabActivity[]>([{ id: "a1", text: "Kasir Raisya masuk" }]),
);

let activitySeq = 1;

export function pushActivity(text: string): void {
  activitySeq += 1;
  void Effect.runSync(
    SubscriptionRef.update(activityRef, (items) => [
      ...items,
      { id: `a${activitySeq}`, text },
    ]),
  );
}

/**
 * A *derived* stream: every subscribe starts the scan over, so its cached
 * snapshot is stale on purpose. The lab shows this to make the rule concrete —
 * cache read-once answers, not counters.
 */
export const clock: Stream.Stream<LabClock, never, never> = Stream.tick("1000 millis").pipe(
  Stream.scan(0, (tick) => tick + 1),
  Stream.map((tick): LabClock => ({ tick })),
);
