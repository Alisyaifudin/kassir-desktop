import { Stream } from "effect";
import { useQuery, useStream, type Result } from "~/components/Loader";
import { service } from "~/services";
import type { DebtRecord, RecordError } from "~/services/record";

/**
 * The service's write counter. Settling, deleting or re-crediting a record moves
 * it in or out of this list, so the query re-reads on it. Seeded at 0 so the
 * first render already has a stable key.
 */
function useRevision(): number {
  const res = useStream(service.record.get.revision, () => 0);
  return res.type === "success" ? res.data : 0;
}

/** Unsettled credit records, newest first. */
export function useData(): Result<DebtRecord[], RecordError> {
  const revision = useRevision();
  return useQuery(() => Stream.fromEffect(service.record.get.debt()), [revision]);
}
