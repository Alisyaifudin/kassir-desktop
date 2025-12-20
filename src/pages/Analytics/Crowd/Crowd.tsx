import { Record } from "~/database/record/get-by-range";
import { useTime } from "../use-time";
import { useSummary } from "./Summary";
import { useEffect } from "react";
import { Temporal } from "temporal-polyfill";
import { getTicks, getVisitors } from "../utils/group-items";
import Decimal from "decimal.js";
import { DatePickerCrowd } from "./DatePicker";
import { Bar } from "../Bar";

type Props = {
  records: Record[];
  start: number;
  end: number;
};

export function Crowd({ records, start, end }: Props) {
  const [time, setTime] = useTime();
  const [, setSummary] = useSummary();
  const tz = Temporal.Now.timeZoneId();
  const startOfDay = Temporal.Instant.fromEpochMilliseconds(time)
    .toZonedDateTimeISO(tz)
    .startOfDay();
  const endOfDay = startOfDay.add(Temporal.Duration.from({ days: 1 }));
  const { visitors: visitorsDaily, labels: labelsDaily } = getVisitors({
    records,
    interval: "day",
    start: startOfDay.epochMilliseconds,
    end: endOfDay.epochMilliseconds,
  });
  const { visitors: visitorsWeekly, labels: labelsWeekly } = getVisitors({
    records,
    interval: "week",
    start,
    end,
  });
  useEffect(() => {
    setSummary({
      loading: false,
      daily: Decimal.sum(...visitorsDaily).toNumber(),
      weekly: Decimal.sum(...visitorsWeekly).toNumber(),
    });
  }, [records]);
  return (
    <div className="flex flex-col gap-2 py-1 w-full h-full overflow-hidden">
      <DatePickerCrowd setTime={setTime} time={time} />
      <div className="flex flex-col flex-1 py-5">
        <Graph vals={visitorsDaily.filter((_, i) => i >= 6)} />
        <div className="flex gap-1 w-full">
          <div className="w-[100px]"></div>
          <div className="flex gap-1 w-full">
            {labelsDaily
              .filter((_, i) => i >= 6)
              .map((label) => (
                <div
                  key={label}
                  className="h-[50px] flex justify-center items-center text-2xl"
                  style={{ width: `${100 / labelsDaily.filter((_, i) => i >= 6).length}%` }}
                >
                  <p>{label}</p>
                </div>
              ))}
          </div>
        </div>
        <Graph vals={visitorsWeekly} />
        <div className="flex gap-1 w-full">
          <div className="w-[100px]"></div>
          <div className="flex gap-1 w-full">
            {labelsWeekly.map((label) => (
              <div
                key={label}
                className="h-[50px] flex justify-center items-center text-2xl"
                style={{ width: `${100 / labelsWeekly.length}%` }}
              >
                <p>{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Graph({ vals }: { vals: number[] }) {
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
