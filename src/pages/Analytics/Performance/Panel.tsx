import { DatePicker } from "../DatePicker";
import { ModeSelect } from "../ModeSelect";

export function Panel() {
  return (
    <div className="flex items-center gap-5">
      <DatePicker defaultInterval="month" />
      <ModeSelect />
    </div>
  );
}
