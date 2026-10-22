import { Either } from "effect";
import { useNavigate, useSearchParams } from "react-router";
import { useMutation } from "~/components/Loader";
import { urlBackOf } from "~/lib/utils";
import { service } from "~/services";
import type { RecordMode } from "~/services/record";

/** The screens whose list is filtered by a record's mode, and so follow a flip. */
const MODE_LISTS = new Set(["/records", "/records/search"]);

/**
 * Where the flipped record's page should lead back to. Both record lists are
 * filtered by mode, so the tab this record was opened from will no longer hold
 * it — retarget that filter at the mode it moved to, and drop the row the pane
 * had selected: that row is the record the flip replaces.
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

    const next = new URLSearchParams(search);
    const back = retargetUrlBack(urlBackOf(search), mode);
    if (back === null) next.delete("url_back");
    else next.set("url_back", back);
    const query = next.toString();

    navigate(
      { pathname: `/records/${result.right}`, search: query === "" ? "" : `?${query}` },
      { replace: true },
    );
  }

  return { loading: pending, error: error?.message ?? null, change } as const;
}
