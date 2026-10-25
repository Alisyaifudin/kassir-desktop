import { DateRange } from "~/components/DateRange";
import { useRange } from "../use-range";

export function TimePicker() {
  const { range, setRange } = useRange();

  return (
    <div className="flex items-center gap-2">
      <span>Rentang:</span>
      <DateRange range={range} setRange={setRange} />
    </div>
  );
}
