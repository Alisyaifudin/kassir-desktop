import { Effect } from "effect";
import { service } from "~/services";

/** Anything the cart services fail with carries a cashier-facing `message`. */
export function cartErrorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message: unknown }).message;
    if (typeof message === "string" && message !== "") return message;
  }
  return "Keranjang belum tersimpan";
}

/**
 * Fire-and-forget a service write. The service owns the state and debounces the
 * database, so a UI edit does not need to await anything — but the failure still
 * has to reach the operator, so it goes to the same channel `<SaveError>` renders
 * (and the app log). An unhandled `Effect.runFork` used to drop it: the screen
 * said saved, the disk disagreed.
 */
export function run(effect: Effect.Effect<unknown, unknown>) {
  void Effect.runFork(
    effect.pipe(
      Effect.catchAll((error) =>
        // `reportError` never fails, so this branch cannot drop the message.
        Effect.flatMap(Effect.sync(() => cartErrorMessage(error)), service.transaction.reportError),
      ),
    ),
  );
}
