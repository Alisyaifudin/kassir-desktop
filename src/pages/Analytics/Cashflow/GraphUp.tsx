import { useSize } from "~/hooks/use-size";
import { Bar } from "../Bar";
import { formatTick } from "../utils/format-tick";
import { getTicks } from "../utils/group-items";

const style = {
  small: {
    width: "60px",
  },
  big: {
    width: "80px",
  },
};

export function GraphUp({ vals }: { vals: number[] }) {
  const maxVal = Math.max(...vals);
  const ticks = getTicks(maxVal);
  const size = useSize();
  return (
    <div className="flex gap-1 w-full h-full">
      <div style={style[size]} className="relative h-full border-r">
        {ticks.map((tick) => (
          <p
            key={tick}
            className="right-1 absolute"
            style={{ top: `${((maxVal - tick) / maxVal) * 100}%` }}
          >
            {formatTick(tick)}
          </p>
        ))}
      </div>
      <div className="w-full h-full flex-1 flex gap-1 items-end">
        {vals.map((v, i) => (
          <Bar orientation={"up"} v={v} key={i} maxVal={maxVal} length={vals.length} />
        ))}
      </div>
    </div>
  );
}
