import { Bar } from "../z-Bar";
import { formatTick } from "../utils/format-tick";
import { getTicks } from "../utils/group-items";

export function GraphUp({ vals }: { vals: { number: number; timestamp: number }[] }) {
  const maxVal = vals.length === 0 ? 1 : Math.max(...vals.map((v) => v.number));
  const ticks = getTicks(maxVal);
  return (
    <div className="flex w-full h-full">
      <div className="relative h-full border-r w-[80px] small:w-[60px]">
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
      <div className="h-full flex-1 flex gap-1">
        {vals.map((v, i) => (
          <Bar
            orientation={"up"}
            v={v.number}
            timestamp={v.timestamp}
            key={i}
            maxVal={maxVal}
            length={vals.length}
          />
        ))}
      </div>
    </div>
  );
}
