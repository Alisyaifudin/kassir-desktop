import { use, useEffect } from "react";
import { TextError } from "~/components/TextError";
import { Record } from "~/database/record/get-by-range";
import { Result } from "~/lib/utils";
import { getFlow } from "../utils/group-items";
import { GraphUp } from "./GraphUp";
import { GraphDown } from "./GraphDown";
import { useInterval } from "../use-interval";
import { useSummary } from "./Summary";
import Decimal from "decimal.js";
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

function Wrapper({ records, start, end }: { records: Record[]; start: number; end: number }) {
  const [int] = useInterval("month");
  const interval = int === "day" ? "week" : int;
  const [, setSummary] = useSummary();
  const { revenues, debts, labels, spendings } = getFlow({ records, start, end, interval });
  const size = useSize();
  useEffect(() => {
    setSummary({
      loading: false,
      revenue: Decimal.sum(...revenues).toNumber(),
      debt: Decimal.sum(...debts).toNumber(),
      spending: Decimal.sum(...spendings).toNumber(),
    });
  }, [records]);
  return (
    <div className="flex flex-col flex-1 py-5">
      <GraphUp vals={revenues} />
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
      <GraphDown debts={debts} vals={spendings} />
    </div>
  );
}
