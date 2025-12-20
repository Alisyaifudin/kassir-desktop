import { Bar } from "./Bar";
import { getTicks } from "./utils/group-items";

export function GraphUp({ vals }: { vals: number[] }) {
  const maxVal = Math.max(...vals);
  const ticks = getTicks(maxVal);
  return (
    <div className="flex gap-1 w-full h-full">
      <div className="relative h-full border-r w-[100px]">
        {ticks.map((tick) => (
          <p
            key={tick}
            className="right-1 absolute"
            style={{ top: `${((maxVal - tick) / maxVal) * 100}%` }}
          >
            {tick.toLocaleString("id-ID")}
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