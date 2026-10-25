import { useStream } from "~/components/Loader";
import { service } from "~/services";

/**
 * The money service's write counter. Adding, deleting or importing an entry
 * moves a pocket's history, so a queried history re-reads by putting it in its
 * deps. Seeded at 0 so the first render already has a stable key.
 *
 * It lives in `src/hooks/` beside `useRecordRevision` for the same reason: the
 * Money pages each had a byte-identical private copy, and a change to how the
 * counter is read would have to be found in all of them.
 */
export function useMoneyRevision(): number {
  const res = useStream(service.money.entries.get.revision, () => 0);
  return res.type === "success" ? res.data : 0;
}
