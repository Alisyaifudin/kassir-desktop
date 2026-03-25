import { TextError } from "~/components/TextError";
import { Calendar } from "./Calendar";
import { Spinner } from "~/components/Spinner";
import { memo } from "react";
import { formatDate, formatTime, getDayName } from "~/lib/date";
import { useChangePaidAt } from "./use-change-paid-at";

export const CalendarController = memo(function CalendarController({
  paidAt,
  recordId,
}: {
  paidAt: number;
  recordId: string;
}) {
  const name = getDayName(paidAt);
  const { handleChange, loading, error } = useChangePaidAt(recordId);

  return (
    <div className="flex gap-1 flex-col justify-end">
      <div className="flex gap-2 items-center justify-end">
        <Spinner when={loading} />
        <Calendar time={paidAt} setTime={handleChange}>
          <p>
            {formatTime(paidAt, "long")} {name}, {formatDate(paidAt, "long")}
          </p>
        </Calendar>
      </div>
      <TextError>{error}</TextError>
    </div>
  );
});
