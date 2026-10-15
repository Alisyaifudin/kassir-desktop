import { Calendar } from "~/components/Calendar";
import { Spinner } from "~/components/Spinner";
import { TextError } from "~/components/TextError";
import { formatDate, formatTime, getDayName } from "~/lib/date";
import type { RecordFull } from "~/services/record";
import { useChangePaidAt } from "./use-change-paid-at";

/** When the record was paid, edited in place. Admin-only, like the record's day. */
export function PaidAt({ record }: { record: RecordFull }) {
  const { loading, error, change } = useChangePaidAt(record.id);
  const day = getDayName(record.paidAt);

  return (
    <div className="flex gap-1 flex-col justify-end">
      <div className="flex gap-2 items-center justify-end">
        <Spinner when={loading} />
        <Calendar
          className="w-fit small:w-fit"
          time={record.paidAt}
          setTime={change}
        >
          <p>
            {formatTime(record.paidAt, "long")} {day}, {formatDate(record.paidAt, "long")}
          </p>
        </Calendar>
      </div>
      <TextError>{error}</TextError>
    </div>
  );
}
