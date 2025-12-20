import { use, useEffect } from "react";
import { TextError } from "~/components/TextError";
import { Record } from "~/database/record/get-by-range";
import { Result } from "~/lib/utils";
import { getFlow } from "../utils/group-items";
import { DatePicker } from "../DatePicker";
import { GraphUp } from "../GraphUp";
import { GraphDown } from "../GraphDown";
import { useInterval } from "../use-interval";
import { useSummary } from "./Summary";
import Decimal from "decimal.js";

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
  const [int] = useInterval("week");
  const interval = int === "day" ? "week" : int;
  const [, setSummary] = useSummary();
  const { revenues, debts, labels, spendings } = getFlow({ records, start, end, interval });
  useEffect(() => {
    setSummary({
      loading: false,
      revenue: Decimal.sum(...revenues).toNumber(),
      debt: Decimal.sum(...debts).toNumber(),
      spending: Decimal.sum(...spendings).toNumber(),
    });
  }, [records]);
  return (
    <div className="flex flex-col gap-2 py-1 w-full h-full overflow-hidden">
      <DatePicker option="cashflow" defaultInterval="week" />
      <div className="flex flex-col flex-1 py-5">
        <GraphUp vals={revenues} />
        <div className="flex gap-1 w-full">
          <div className="w-[100px]"></div>
          <div className="flex gap-1 w-full">
            {labels.map((label) => (
              <div
                key={label}
                className="h-[50px] flex justify-center items-center text-2xl"
                style={{ width: `${100 / labels.length}%` }}
              >
                <p>{label}</p>
              </div>
            ))}
          </div>
        </div>
        <GraphDown debts={debts} vals={spendings} />
      </div>
    </div>
  );
}
