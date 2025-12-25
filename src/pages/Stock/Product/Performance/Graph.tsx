import { getTicks } from "./get-ticks";
import { useSize } from "~/hooks/use-size";
import { formatTick } from "./format-tick";
import { Bar } from "./Bar";
import { Data } from "./collect";
import { useInterval } from "./use-interval";

const style = {
  width: {
    small: {
      width: "60px",
    },
    big: {
      width: "80px",
    },
  },
  height: {
    small: {
      height: "50px",
    },
    big: {
      height: "70px",
    },
  },
  label: {
    small: {
      height: "130px",
    },
    big: {
      height: "170px",
    },
  },
};

export function Graph({ data }: { data: Data[] }) {
  const labels = data.map((d) => d.bin.label);
  return (
    <div className="flex flex-col flex-1 pt-5">
      <GraphUp vals={data.map((d) => d.count)} />
      <Labels labels={labels} />
    </div>
  );
}

function GraphUp({ vals }: { vals: number[] }) {
  const maxVal = Math.max(...vals);
  const ticks = getTicks(maxVal);
  const size = useSize();
  return (
    <div className="flex w-full gap-1 h-full">
      <div style={style.width[size]} className="relative h-full border-r">
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
          <Bar orientation={"up"} v={v} key={i} maxVal={maxVal} length={vals.length} />
        ))}
      </div>
    </div>
  );
}

function Labels({ labels }: { labels: string[] }) {
  const size = useSize();
  const [interval] = useInterval();
  if (interval === "all") {
    return (
      <div className="flex w-full gap-1" style={style.label[size]}>
        <div style={style.width[size]}></div>
        <div className="flex-1 flex gap-1">
          {labels.map((label) => (
            <div
              key={label}
              className="flex justify-center relative items-center"
              style={{ width: `${100 / labels.length}%` }}
            >
              <p className="text-small! absolute -rotate-45 bg-white px-1">{label}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className="flex w-full gap-1" style={style.height[size]}>
      <div style={style.width[size]}></div>
      <div className="flex-1 flex gap-1">
        {labels.map((label) => (
          <div
            key={label}
            className="flex justify-center items-center"
            style={{ width: `${100 / labels.length}%` }}
          >
            <p className="text-small! absolute">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
