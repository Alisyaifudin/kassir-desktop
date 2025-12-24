import { DatePicker } from "../DatePicker";
import { ModeSelect } from "../ModeSelect";
import { IntervalPicker } from "./IntervalPicker";

export function Panel() {
  return (
    <div className="flex items-center gap-5">
      <DatePicker defaultInterval="week">
        <IntervalPicker />
      </DatePicker>
      <ModeSelect />
    </div>
  );
}
