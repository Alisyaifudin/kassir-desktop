import { Stream } from "effect";
import { useQuery, type Result } from "~/components/Loader";
import { useRecordRevision } from "~/hooks/use-record-revision";
import { service } from "~/services";
import type { DebtRecord, RecordError } from "~/services/record";

/** Unsettled credit records, newest first. */
export function useData(): Result<DebtRecord[], RecordError> {
  // Settling, deleting or re-crediting a record moves it in or out of this list,
  // so the query re-reads on the shared write counter.
  const revision = useRecordRevision();
  return useQuery(() => Stream.fromEffect(service.record.get.debt()), [revision]);
}
