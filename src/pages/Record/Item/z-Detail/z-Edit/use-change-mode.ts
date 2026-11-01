import { Either, Effect } from "effect";
import { useNavigate, useSearchParams } from "~/services/route/react";
import { useMutation } from "~/components/Loader";
import { service } from "~/services";
import { route } from "~/services/route/instance";
import type { RecordMode } from "~/services/record";

/** The screens whose list is filtered by a record's mode, and so follow a flip. */
const MODE_LISTS = new Set(["/records", "/records/search"]);

/**
 * Where the flipped record's page should lead back to. Both record lists are
 * filtered by mode, so the tab this record was opened from will no longer hold
 * it — retarget that filter at the mode it moved to, and drop the row the pane
 * had selected: that row is the record the flip replaces.
 *
 * The screen to retarget is the one the stack remembers, not a `url_back` in the
 * query: `useChangeMode` reads it with `peekBack` and rewrites it with `setBack`.
 */
export function retargetUrlBack(urlBack: string | null, mode: RecordMode): string | null {
  if (urlBack === null) return null;
  const [path, query = ""] = urlBack.split("?");
  if (!MODE_LISTS.has(path)) return urlBack;
  const params = new URLSearchParams(query);
  params.set("mode", mode);
  params.delete("selected");
  const search = params.toString();
  return search === "" ? path : `${path}?${search}`;
}

/**
 * Flipping a sale into a purchase. A record is immutable once written, so the
 * service writes a copy in the other mode — same body, same `paidAt` — soft-
 * deletes this one, and returns the copy's id. Staying here would leave the
 * cashier on a tombstone, so the page follows the copy; the history entry is
 * replaced for the same reason, since Back has nothing left to return to.
 */
export function useChangeMode(id: string) {
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const { pending, error, mutate } = useMutation((mode: RecordMode) =>
    service.record.set.mode(id, mode),
  );

  async function change(mode: RecordMode) {
    const result = await mutate(mode);
    // A refusal (or a no-op flip) leaves the record in place: only the copy's
    // own id is somewhere else to go.
    if (Either.isLeft(result) || result.right === id) return;

    // The list behind this record no longer holds it, so it is retargeted at the
    // mode the record moved to. Below two entries there is nothing behind, and
    // `Back` falls back to the record list anyway.
    const below = Effect.runSync(route.peekBack());
    if (below !== null) {
      Effect.runSync(route.setBack(retargetUrlBack(below, mode) ?? below));
    }

    // The copy takes this screen's place — the record it replaced is soft-deleted,
    // so `Back` has nothing to return to — and keeps the face it was open on.
    const query = search.toString();
    navigate(
      { pathname: `/records/${result.right}`, search: query === "" ? "" : `?${query}` },
      { behavior: "replace" },
    );
  }

  return { loading: pending, error: error?.message ?? null, change } as const;
}
