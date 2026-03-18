import { useLocation } from "react-router";
import { DateRange } from "~/components/DateRange";
import { useRange } from "./use-range";

export function TimePicker() {
  const { pathname } = useLocation();
  const [range, setRange] = useRange();
  const paths = pathname.split("/");
  if (paths.length !== 3) return null;

  return (
    <div className="flex items-center gap-2">
      <span>Rentang:</span>
      <DateRange range={range} setRange={setRange} />
    </div>
  );
}
