import { Calendar } from "~/components/Calendar";
import { Spinner } from "~/components/Spinner";
import { TextError } from "~/components/TextError";
import { formatDate, formatTime, getDayName } from "~/lib/date";
import type { RecordFull } from "~/services/record";
import { useChangeCreditAt } from "./use-change-credit-at";

/** The date the credit was opened, editable without touching the record body. */
export function CreditAt({ record }: { record: RecordFull }) {
  const { loading, error, change } = useChangeCreditAt(record.id);
  const creditAt = record.creditAt;
  if (creditAt === null) return null;
  const day = getDayName(creditAt);

  return (
    <div className="flex gap-1 flex-col justify-end">
      <div className="flex gap-2 items-center justify-end">
        <Spinner when={loading} />
        {/* `granularity="instant"`: this edits a persisted timestamp, so a day
            pick must keep the time of day instead of rewriting it to 00:00. */}
        <Calendar
          className="w-fit small:w-fit"
          granularity="instant"
          time={creditAt}
          setTime={change}
        >
          <p>
            Kredit: {formatTime(creditAt, "long")} {day}, {formatDate(creditAt, "long")}
          </p>
        </Calendar>
      </div>
      <TextError>{error}</TextError>
    </div>
  );
}
