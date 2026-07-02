import { Temporal } from "temporal-polyfill";
import { DateRangePicker } from "~/components/CalendarPicker/DateRangePicker";

export function TimePicker({
  range,
  setRange,
}: {
  range: [Temporal.PlainDate, Temporal.PlainDate];
  setRange: (range: [Temporal.PlainDate, Temporal.PlainDate]) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span>Rentang:</span>
      <DateRangePicker range={range} setRange={setRange} />
    </div>
  );
}
