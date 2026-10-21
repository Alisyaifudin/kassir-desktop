import { Calendar } from "~/components/Calendar";
import { Spinner } from "~/components/Spinner";
import { TextError } from "~/components/TextError";
import { formatDate, formatTime, getDayName } from "~/lib/date";
import type { RecordFull } from "~/services/record";
import { useChangePaidAt } from "./use-change-paid-at";

/** When the record was paid, edited in place. Admin-only, like the record's day. */
export function PaidAt({ record }: { record: RecordFull }) {
  const { loading, error, change } = useChangePaidAt(record.id);
  const paidAt = record.paidAt;
  if (paidAt === null) return null;
  const day = getDayName(paidAt);

  return (
    <div className="flex gap-1 flex-col justify-end">
      <div className="flex gap-2 items-center justify-end">
        <Spinner when={loading} />
        {/* `granularity="instant"`: this edits a persisted timestamp, so a day
            pick must keep the time of day instead of rewriting it to 00:00. */}
        <Calendar
          className="w-fit small:w-fit"
          granularity="instant"
          time={paidAt}
          setTime={change}
        >
          <p>
            Dibayar: {formatTime(paidAt, "long")} {day}, {formatDate(paidAt, "long")}
          </p>
        </Calendar>
      </div>
      <TextError>{error}</TextError>
    </div>
  );
}
