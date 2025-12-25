import { use, useEffect } from "react";
import { TextError } from "~/components/TextError";
import { Record } from "~/database/record/get-by-range";
import { Result } from "~/lib/utils";
import { getFlow, getTicks } from "../utils/group-items";
import { useInterval } from "../use-interval";
import Decimal from "decimal.js";
import { Bar } from "../Bar";
import { useSummary } from "./Summary";
import { formatTick } from "../utils/format-tick";
import { useSize } from "~/hooks/use-size";

export function Graph({
  records: promise,
  start,
  end,
}: {
  records: Promise<Result<"Aplikasi bermasalah", Record[]>>;
  start: number;
  end: number;
}) {
  const [errMsg, records] = use(promise);
  if (errMsg !== null) {
    return <TextError>{errMsg}</TextError>;
  }
  return <Wrapper start={start} end={end} records={records} />;
}

function Wrapper({ records, start, end }: { records: Record[]; start: number; end: number }) {
  const [int] = useInterval("month");
  const interval = int === "day" ? "week" : int;
  const [, setSummary] = useSummary();
  const { revenues, labels, spendings, debts } = getFlow({ records, start, end, interval });
  const profits: number[] = revenues.map((rev, i) =>
    new Decimal(rev).minus(spendings[i]).plus(debts[i]).toNumber()
  );
  const size = useSize();
  useEffect(() => {
    setSummary({
      loading: false,
      profit: Decimal.sum(...profits).toNumber(),
    });
  }, [records]);
  return (
    <div className="flex flex-col flex-1 py-5">
      <GraphBar orientation="up" vals={profits} />
      <div className="flex w-full" style={style.height[size]}>
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
      <GraphBar orientation="down" vals={profits} />
    </div>
  );
}

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
};

function GraphBar({ vals, orientation }: { vals: number[]; orientation: "up" | "down" }) {
  let maxVal = Math.max(Math.max(...vals), -1 * Math.min(...vals));
  const size = useSize();
  const ticks = getTicks(maxVal);
  return (
    <div className="flex gap-1 w-full h-full">
      <div className="relative h-full border-r" style={style.width[size]}>
        {ticks.map((tick) => (
          <p
            key={tick}
            className="right-1 absolute"
            style={{ top: `${((orientation === "up" ? maxVal - tick : tick) / maxVal) * 100}%` }}
          >
            {formatTick(tick)}
          </p>
        ))}
      </div>
      {orientation === "up" ? (
        <div className="w-full h-full flex-1 flex gap-1 items-end">
          {vals.map((v, i) =>
            v < 0.0001 ? (
              <div key={i} style={{ width: `${100 / vals.length}%` }} />
            ) : (
              <Bar orientation={orientation} v={v} key={i} maxVal={maxVal} length={vals.length} />
            )
          )}
        </div>
      ) : (
        <div className="w-full h-full flex-1 flex gap-1">
          {vals.map((v, i) =>
            v > -0.0001 ? (
              <div key={i} style={{ width: `${100 / vals.length}%` }} />
            ) : (
              <Bar orientation={orientation} v={-v} key={i} maxVal={maxVal} length={vals.length} />
            )
          )}
        </div>
      )}
    </div>
  );
}
