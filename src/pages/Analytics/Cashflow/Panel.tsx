import { DatePicker } from "../DatePicker";
import { IntervalPicker } from "./IntervalPicker";

export function Panel() {
  return (
    <div className="flex items-center gap-5">
      <DatePicker defaultInterval="month">
        <IntervalPicker />
      </DatePicker>
    </div>
  );
}
