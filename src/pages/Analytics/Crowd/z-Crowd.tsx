import { getTicks } from "../utils/group-items";
import { Bar } from "../z-Bar";
import { formatTick } from "../utils/format-tick";

type Props = {
  daily: {
    visitors: number[];
    labels: string[];
  };
  weekly: {
    visitors: number[];
    labels: string[];
  };
};

export function Crowd({ daily, weekly }: Props) {
  return (
    <div className="flex flex-col flex-1 py-5">
      <Graph vals={daily.visitors.filter((_, i) => i >= 6)} />
      <div className="flex gap-1 w-full">
        <div className="w-[80px] small:w-[60px]"></div>
        <div className="flex gap-1 w-full">
          {daily.labels
            .filter((_, i) => i >= 6)
            .map((label) => (
              <div
                key={label}
                className="h-[50px] flex justify-center items-center text-2xl"
                style={{ width: `${100 / (daily.labels.filter((_, i) => i >= 6).length || 1)}%` }}
              >
                <p>{label}</p>
              </div>
            ))}
        </div>
      </div>
      <Graph vals={weekly.visitors} />
      <div className="flex gap-1 w-full">
        <div className="w-[80px] small:w-[60px]"></div>
        <div className="flex gap-1 w-full">
          {weekly.labels.map((label) => (
            <div
              key={label}
              className="h-[50px] flex justify-center items-center text-2xl"
              style={{ width: `${100 / (weekly.labels.length || 1)}%` }}
            >
              <p>{label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Graph({ vals }: { vals: number[] }) {
  const maxVal = vals.length === 0 ? 1 : Math.max(...vals);
  const ticks = getTicks(maxVal);
  return (
    <div className="flex gap-1 w-full h-full">
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
      <div className="w-full h-full flex-1 flex gap-1 items-end">
        {vals.map((v, i) => (
          <Bar orientation={"up"} v={v} key={i} maxVal={maxVal} length={vals.length} />
        ))}
      </div>
    </div>
  );
}
