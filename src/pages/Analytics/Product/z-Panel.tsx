import { DatePicker } from "../z-DatePicker";
import { ModeSelect } from "../z-ModeSelect";
import { IntervalPicker } from "./z-IntervalPicker";

export function Panel() {
  return (
    <div className="flex items-center gap-5">
      <DatePicker defaultInterval="day">
        <IntervalPicker />
      </DatePicker>
      <ModeSelect />
    </div>
  );
}
