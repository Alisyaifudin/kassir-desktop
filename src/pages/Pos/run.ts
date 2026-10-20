import { Effect } from "effect";

/**
 * Fire-and-forget a service write. The service owns the state and debounces the
 * database, so a UI edit does not need to await anything.
 */
export function run(effect: Effect.Effect<unknown, unknown>) {
  void Effect.runFork(effect);
}
