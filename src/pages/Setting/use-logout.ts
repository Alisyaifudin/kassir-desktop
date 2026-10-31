import { Effect } from "effect";
import { log } from "~/lib/log";
import { service } from "~/services";
import { route } from "~/services/route/instance";

/** Clears the stored session and returns to the login screen. */
export function useLogout() {
  return function handleLogout() {
    // The reload below discards in-memory state either way, so a failed write
    // is logged instead of surfaced.
    void Effect.runPromise(service.auth.set(null))
      .catch((error) => log.error(error))
      .finally(() => {
        // The session ends with the page: no screen behind the login form may be
        // reachable any more, or `Back` would walk into the account that just
        // signed out.
        Effect.runSync(route.reset("/login"));
        window.location.pathname = "/login";
      });
  };
}
