import { useSize } from "~/hooks/use-size";
import { DatePicker } from "./z-DatePicker";
import { IntervalPicker } from "./z-IntervalPicker";
import { ModeSelect } from "./z-ModeSelect";

const style = {
  big: {
    height: "52px",
  },
  small: {
    height: "44px",
  },
};

export function Panel() {
  const size = useSize();
  return (
    <div style={style[size]} className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <IntervalPicker />
        <DatePicker />
      </div>
      <ModeSelect />
    </div>
  );
}
