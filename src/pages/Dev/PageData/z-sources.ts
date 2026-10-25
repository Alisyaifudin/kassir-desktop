import { Data, Effect, Stream, SubscriptionRef } from "effect";

/**
 * The playground's fake backend.
 *
 * It is deliberately shaped like a real service: an `Effect` is a "read once"
 * query (`service.x.get.all()`), a `Stream` is live state
 * (`service.x.get.changes`), and a mutation writes then lets the read answer the
 * new value. Pointing a real page at the pattern is exactly this file's job —
 * swap the values, leave the widgets alone.
 */

export class DemoError extends Data.TaggedError("DemoError")<{ message: string }> {}

export type DemoProfile = { name: string; role: string; shop: string };
export type DemoStats = { orders: number; revenue: number; average: number };
export type DemoFeedItem = { id: string; text: string; at: number };
export type DemoActivity = { id: string; text: string };
export type DemoBeat = { beat: number; at: number };

/** Latencies picked so the arrival order is readable at a glance. */
export const LATENCY = {
  profile: 400,
  broken: 800,
  flaky: 500,
  stats: 1300,
  feed: 2600,
  mutation: 700,
  refetch: 800,
} as const;

const sleep = (ms: number) => Effect.sleep(`${ms} millis`);

function once<A>(ms: number, value: A): Effect.Effect<A, never> {
  return Effect.zipRight(sleep(ms), Effect.sync(() => value));
}

const profile: DemoProfile = { name: "Siti Rahma", role: "Admin", shop: "Kassir · Cabang Ciledug" };

const feed: DemoFeedItem[] = [
  { id: "f1", text: "Penjualan #A-1043 · Rp 128.000", at: 1 },
  { id: "f2", text: "Stok kopi arabika diperbarui", at: 2 },
  { id: "f3", text: "Pembayaran utang pelanggan Budi", at: 3 },
];

/** The state a mutation writes to. `stats` reads it when it (re)loads. */
let extraOrders = 0;
let statsRuns = 0;

/**
 * A read-once query, exactly like `service.analytics.get.summary()`: it answers
 * from whatever the write path left behind, so re-running it after a mutation is
 * a genuine refetch. The first load is slow, a refetch is quicker — as a real
 * query usually is.
 */
export const stats: Effect.Effect<DemoStats, never> = Effect.gen(function* () {
  const first = statsRuns === 0;
  yield* sleep(first ? LATENCY.stats : LATENCY.refetch);
  statsRuns += 1;
  const orders = 128 + extraOrders;
  return { orders, revenue: orders * 36_875, average: 36_875 };
});

/** The write: changes what `stats` will answer next, and nothing else. */
export const addOrders = (count: number): Effect.Effect<{ added: number }, DemoError> =>
  Effect.gen(function* () {
    yield* sleep(LATENCY.mutation);
    extraOrders += count;
    return { added: count };
  });

/**
 * Live state, like `service.record.get.changes`: the mutation pushes into the
 * same ref a service would own, so subscribers update without a refetch.
 */
export const activityRef = Effect.runSync(
  SubscriptionRef.make<DemoActivity[]>([{ id: "a1", text: "Kasir Raisya masuk" }]),
);

let activitySeq = 1;

export const addActivity = (text: string): Effect.Effect<DemoActivity, DemoError> =>
  Effect.gen(function* () {
    yield* sleep(LATENCY.mutation);
    activitySeq += 1;
    const item: DemoActivity = { id: `a${activitySeq}`, text };
    yield* SubscriptionRef.update(activityRef, (items) => [...items, item]);
    return item;
  });

/**
 * Succeeds once, then fails on every refresh — the case `useStatus`'s `stale`
 * exists for: there is a value on screen and the attempt to renew it lost.
 */
let flakyRuns = 0;

export const flaky: Effect.Effect<string, DemoError> = Effect.gen(function* () {
  flakyRuns += 1;
  const run = flakyRuns;
  yield* sleep(LATENCY.flaky);
  if (run > 1) {
    return yield* Effect.fail(
      new DemoError({ message: "Penyegaran gagal — nilai lama tetap ditampilkan." }),
    );
  }
  return "Nilai pertama (berhasil dimuat)";
});

/**
 * A write that changes nothing except asking `flaky` to read again — which then
 * refuses. The `useMutation` demo for `stale`: the write succeeds, the refetch
 * that follows it does not.
 */
export const touchFlaky = (): Effect.Effect<{ touched: true }, DemoError> =>
  Effect.zipRight(sleep(LATENCY.mutation), Effect.succeed({ touched: true as const }));

/**
 * Every key is one source. None of them waits for another: the provider
 * subscribes to all of them in parallel, so the whole page settles in ~2.6 s (the
 * slowest key) instead of the sum of the latencies.
 */
export const devSources = {
  /** Read-once `Effect`, like a one-shot query. */
  profile: once(LATENCY.profile, profile),

  /** Read-once `Effect` that answers differently on every run. */
  stats,

  /** Live `Stream`, like `SubscriptionRef.changes`: pushes a new value forever. */
  beat: Stream.tick("1500 millis").pipe(
    Stream.scan(0, (beat) => beat + 1),
    Stream.map((beat): DemoBeat => ({ beat, at: Date.now() })),
  ),

  /** Live `Stream` whose value the "tambah aktivitas" mutation pushes into. */
  activity: activityRef.changes,

  /** Delivered late, so a widget that needs it is the last one to appear. */
  feed: Stream.fromEffect(once(LATENCY.feed, feed)),

  /** Fails on every refresh after the first answer, to show `stale`. */
  flaky,

  /** Always fails, to show that a failure stays inside its own widget. */
  broken: Effect.zipRight(
    sleep(LATENCY.broken),
    Effect.fail(new DemoError({ message: "Laporan gagal dimuat (server menolak, 503)." })),
  ),
};
