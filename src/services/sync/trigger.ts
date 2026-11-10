import { Context, Effect, Layer, Option, PubSub, Stream } from "effect";
import type { SyncGroup } from "./schema";

/**
 * "Somebody just wrote a row of this group", as one small bus.
 *
 * The domain services are the only thing that knows a *local* write happened;
 * the sync service is the only thing that knows whether a write should start a
 * cycle (`AutoSync.editGroups`). Rather than make `product` depend on `sync` —
 * which would be a cycle, because `sync` depends on `product` to refresh its
 * refs after a merge — the write side publishes here and the sync side reads.
 *
 * A pull cannot travel through this bus: a merged page is applied by
 * `sync_merge` in Rust, not by a domain service, so a cycle can never trigger
 * itself. That is the property the whole design rests on.
 */
export class SyncTriggerService extends Context.Tag("SyncTriggerService")<
  SyncTriggerService,
  {
    /** Announces a local write of `group`. Never fails, never blocks the write. */
    publish: (group: SyncGroup) => Effect.Effect<void>;
    /** Every announcement, for the one subscriber that turns them into runs. */
    changes: Stream.Stream<SyncGroup>;
  }
>() {}

/**
 * The service shape over a given bus.
 *
 * Exported so a test can hold the bus it provided — the sync tests publish a
 * write and assert the cycle it started, and they need the same instance the
 * layer was given.
 */
export function triggerOf(bus: PubSub.PubSub<SyncGroup>): Context.Tag.Service<SyncTriggerService> {
  return {
    publish: (group) => PubSub.publish(bus, group).pipe(Effect.asVoid),
    changes: Stream.fromPubSub(bus),
  };
}

export const SyncTriggerLive = Layer.effect(
  SyncTriggerService,
  Effect.gen(function* () {
    // Unbounded on purpose: the publisher is a database write that must never
    // wait on a listener, and the only subscriber is the sync scheduler, which
    // consumes a burst into a single cycle anyway.
    const bus = yield* PubSub.unbounded<SyncGroup>();
    return triggerOf(bus);
  }),
);

/**
 * Announces a write from inside a domain service.
 *
 * The bus is **optional**, not a requirement: `Effect.serviceOption` keeps a
 * service buildable on its own (`bun test` on `ProductLive`, the integration
 * harness), where nobody is listening and nothing should happen. A missing bus
 * is therefore not an error, and a failing publish — which cannot happen on an
 * unbounded `PubSub` — must never turn a committed write into a failed one.
 */
export function notifySync(group: SyncGroup): Effect.Effect<void> {
  return Effect.serviceOption(SyncTriggerService).pipe(
    Effect.flatMap((service) =>
      Option.match(service, {
        onNone: () => Effect.void,
        onSome: (bus) => bus.publish(group),
      }),
    ),
    Effect.catchAllCause(() => Effect.void),
  );
}
