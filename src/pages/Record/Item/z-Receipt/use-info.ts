import { Effect } from "effect";
import { log } from "~/lib/log";
import { service } from "~/services";

/**
 * Compatibility bridge for the still-legacy Social and Shop settings pages.
 * Their writes run outside the new services, so after a successful write they
 * tell the service-backed receipt view to re-read the store/table.
 */
export function revalidateInfo() {
  void Effect.runPromise(
    Effect.all([service.info.refresh(), service.social.get.refresh()], {
      concurrency: "unbounded",
    }).pipe(
      Effect.catchAll((error) =>
        Effect.sync(() => {
          log.error(error.message);
        }),
      ),
    ),
  );
}
