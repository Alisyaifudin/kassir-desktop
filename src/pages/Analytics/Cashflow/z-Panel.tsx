import { DatePicker } from "../z-DatePicker";
import { IntervalPicker } from "./z-IntervalPicker";

export function Panel() {
  return (
    <div className="flex items-center gap-5">
      <DatePicker defaultInterval="month">
        <IntervalPicker />
      </DatePicker>
    </div>
  );
}
