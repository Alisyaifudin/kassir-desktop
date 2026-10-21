import { useStream } from "~/components/Loader";
import { service } from "~/services";

/**
 * The record service's write counter. Every commit, delete and credit settles
 * bumps it, so a day-scoped query re-reads by putting it in its deps. Seeded at
 * 0 so the first render already has a stable key instead of waiting on the
 * stream.
 *
 * It lives in `src/hooks/` because four page folders (Record, Debt, Home, …) and
 * the dashboard all need it; a page must not import another page's hook.
 */
export function useRecordRevision(): number {
  const res = useStream(service.record.get.revision, () => 0);
  return res.type === "success" ? res.data : 0;
}
