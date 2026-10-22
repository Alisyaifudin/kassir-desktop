import { Calendar } from "~/components/Calendar";
import { Spinner } from "~/components/Spinner";
import { TextError } from "~/components/TextError";
import { formatDate, formatTime } from "~/lib/date";
import type { RecordFull } from "~/services/record";
import { useChangePaidAt } from "./use-change-paid-at";

/**
 * When the record was settled — the fact itself, with the control that corrects
 * it, instead of a control parked somewhere else and a date that cannot be
 * changed. Admin-only, like every date correction.
 */
export function PaidAt({ record }: { record: RecordFull }) {
  const { loading, error, change } = useChangePaidAt(record.id);
  const paidAt = record.paidAt;
  if (paidAt === null) return null;

  return (
    <div className="flex shrink-0 flex-col items-end">
      <div className="flex items-center gap-1">
        <Spinner when={loading} />
        {/* `granularity="instant"`: this edits a persisted timestamp, so a day
            pick must keep the time of day instead of rewriting it to 00:00. */}
        <Calendar
          className="w-fit small:w-fit"
          granularity="instant"
          time={paidAt}
          setTime={change}
        >
          <p className="text-small tabular-nums">Dibayar {formatTime(paidAt, "short")} · {formatDate(paidAt, "long")}</p>
        </Calendar>
      </div>
      <TextError>{error}</TextError>
    </div>
  );
}
