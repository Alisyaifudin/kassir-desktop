import { Effect } from "effect";
import { log } from "~/lib/log";
import { service } from "~/services";

/** Clears the stored session and returns to the login screen. */
export function useLogout() {
  return function handleLogout() {
    // The reload below discards in-memory state either way, so a failed write
    // is logged instead of surfaced.
    void Effect.runPromise(service.auth.set(null))
      .catch((error) => log.error(error))
      .finally(() => {
        window.location.pathname = "/login";
      });
  };
}
