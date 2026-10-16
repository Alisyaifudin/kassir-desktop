import { Effect } from "effect";
import { service } from "~/services";
import type { Info } from "~/services/info";

/**
 * The info service writes every field at once, so a partial change reads the
 * current info first. Both the form and the cashier checkbox go through here,
 * so neither can overwrite the other's field with a stale copy.
 */
export function patchInfo(patch: Partial<Info>) {
  return service.info
    .info()
    .pipe(Effect.flatMap((current) => service.info.set({ ...current, ...patch })));
}
