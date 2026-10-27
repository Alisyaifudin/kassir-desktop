import { Calendar } from "~/components/Calendar";
import { Spinner } from "~/components/Spinner";
import { TextError } from "~/components/TextError";
import { formatDate, formatTime } from "~/lib/date";
import type { RecordFull } from "~/services/record";
import { useChangeCreditAt } from "./use-change-credit-at";

/** The day the credit was opened, editable where it is read. Admin-only. */
export function CreditAt({ record }: { record: RecordFull }) {
  const { loading, error, change } = useChangeCreditAt(record.id);
  const creditAt = record.creditAt;
  if (creditAt === null) return null;

  return (
    <div className="flex shrink-0 flex-col items-end">
      <div className="flex items-center gap-1">
        <Spinner when={loading} />
        <Calendar
          className="w-fit"
          granularity="instant"
          time={creditAt}
          setTime={change}
        >
          <p className="text-sm tabular-nums">Kredit {formatTime(creditAt, "short")} · {formatDate(creditAt, "long")}</p>
        </Calendar>
      </div>
      <TextError>{error}</TextError>
    </div>
  );
}
