import { Button } from "~/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "~/components/ui/dialog";
import { useCallback, useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";
import { cn } from "~/lib/utils";
import { Temporal } from "temporal-polyfill";
import { formatDate } from "~/lib/date";
import { Interval } from "./type";
import { DayCalendar } from "./DayCalendar";
import { MonthCalendar } from "./MonthCalendar";
import { YearCalendar } from "./YearCalendar";

export function RangePicker({
  range,
  setRange,
  label,
  className,
}: {
  range: [Temporal.PlainDate, Temporal.PlainDate];
  setRange: (range: [Temporal.PlainDate, Temporal.PlainDate]) => void;
  label?: (date: Temporal.PlainDate) => React.ReactNode;
  className?: string;
}) {
  const [intervals, setIntervals] = useState<[Interval, Interval]>(["day", "day"]);
  const [open, setOpen] = useState(false);
  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        setIntervals(["day", "day"]);
        setOpen(open);
      }}
    >
      <Button asChild variant="ghost" className={cn("flex items-center gap-2 outline", className)}>
        <div className="flex items-center gap-1">
          <DialogTrigger>{label?.(range[0]) ?? <DefaultLabel date={range[0]} />}</DialogTrigger>
          &mdash;
          <DialogTrigger>{label?.(range[1]) ?? <DefaultLabel date={range[1]} />}</DialogTrigger>
        </div>
      </Button>
      <DialogContent className="flex flex-col gap-5 max-w-full w-fit justify-center">
        <div className="flex flex-col gap-2">
          <p className="flex items-center gap-2">Dari tanggal: {formatDate(range[0], "long")}</p>
          <p className="flex items-center gap-2">Sampai tanggal: {formatDate(range[1], "long")}</p>
        </div>
        <div className="flex items-start gap-5 max-w-full w-fit justify-center">
          <Content
            mode={0}
            range={range}
            setRange={setRange}
            intervals={intervals}
            setIntervals={setIntervals}
          />
          <Content
            mode={1}
            range={range}
            setRange={setRange}
            intervals={intervals}
            setIntervals={setIntervals}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DefaultLabel({ date }: { date: Temporal.PlainDate }) {
  return (
    <p className="flex items-center gap-2">
      {formatDate(date)}
      <CalendarDays className="icon" />
    </p>
  );
}

function Content({
  mode,
  intervals,
  range,
  setIntervals,
  setRange,
}: {
  mode: 0 | 1; // 0 is from, 1 is to
  intervals: [Interval, Interval];
  setIntervals: (intervals: [Interval, Interval]) => void;
  range: [Temporal.PlainDate, Temporal.PlainDate];
  setRange: (range: [Temporal.PlainDate, Temporal.PlainDate]) => void;
}) {
  const selected = range[mode];
  const [show, setShow] = useState(Temporal.PlainYearMonth.from(selected));
  useEffect(() => {
    setShow(Temporal.PlainYearMonth.from(selected));
  }, [selected]);
  const setInterval = useCallback(
    (interval: Interval) => {
      const newIntervals: [Interval, Interval] = [...intervals];
      newIntervals[mode] = interval;
      setIntervals(newIntervals);
    },
    [intervals, mode, setIntervals],
  );
  const setSelected = useCallback(
    (date: Temporal.PlainDate) => {
      const newRange: [Temporal.PlainDate, Temporal.PlainDate] = [
        Temporal.PlainDate.from(range[0]),
        Temporal.PlainDate.from(range[1]),
      ];
      newRange[mode] = date;
      setRange(newRange);
    },
    [range, mode, setRange],
  );
  switch (intervals[mode]) {
    case "day":
      return (
        <DayCalendar
          setInterval={setInterval}
          selected={selected}
          setSelected={setSelected}
          show={show}
          setShow={setShow}
          dayClass={(date) =>
            Temporal.PlainDate.compare(date, range[0]) >= 0 &&
            Temporal.PlainDate.compare(date, range[1]) <= 0
              ? "bg-blue-100"
              : ""
          }
        />
      );
    case "month":
      return (
        <MonthCalendar
          setInterval={setInterval}
          selected={selected}
          setSelected={setSelected}
          show={show}
          setShow={setShow}
          monthClass={(date) => {
            const rangeMonths = [range[0].toPlainYearMonth(), range[1].toPlainYearMonth()];
            if (
              Temporal.PlainYearMonth.compare(date, rangeMonths[0]) >= 0 &&
              Temporal.PlainYearMonth.compare(date, rangeMonths[1]) <= 0
            )
              return "bg-blue-100";
            return "";
          }}
        />
      );
    case "year":
      return (
        <YearCalendar
          setInterval={setInterval}
          show={show}
          setShow={setShow}
          selected={selected}
          setSelected={setSelected}
          yearClass={(year) =>
            year >= range[0].year && year <= range[1].year ? "bg-blue-100" : ""
          }
        />
      );
  }
}
