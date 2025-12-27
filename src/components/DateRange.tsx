import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTrigger,
  DialogFooter,
  DialogTitle,
} from "~/components/ui/dialog";
import { memo, useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { cn, formatDate, monthNames } from "~/lib/utils";
import { Temporal } from "temporal-polyfill";
import { Input } from "~/components/ui/input";
import { MONTHS, tz } from "~/lib/constants";
import { useSize } from "~/hooks/use-size";

type Interval = "day" | "month" | "year";

const timeLowest = Temporal.ZonedDateTime.from({
  timeZone: tz,
  year: 1900,
  month: 1,
  day: 1,
}).startOfDay();

const timeHighest = Temporal.ZonedDateTime.from({
  timeZone: tz,
  year: 2100,
  month: 1,
  day: 1,
}).startOfDay();

function sanitizeTime(t: number): number;
function sanitizeTime(t: Temporal.ZonedDateTime): Temporal.ZonedDateTime;
function sanitizeTime(t: number | Temporal.ZonedDateTime): number | Temporal.ZonedDateTime {
  if (typeof t === "number") {
    if (t >= timeHighest.epochMilliseconds) {
      return timeHighest.epochMilliseconds;
    }
    if (t <= timeLowest.epochMilliseconds) {
      return timeLowest.epochMilliseconds;
    }
    return t;
  }
  if (t.epochMilliseconds >= timeHighest.epochMilliseconds) {
    return timeHighest;
  }
  if (t.epochMilliseconds <= timeLowest.epochMilliseconds) {
    return timeLowest.epochMilliseconds;
  }
  return t;
}

export const DateRange = memo(function ({
  className,
  range,
  setRange,
}: {
  className?: string;
  range: [number, number];
  setRange: (start: number, end: number) => void;
}) {
  const [interval, setInterval] = useState<[Interval, Interval]>(["day", "day"]);
  const [open, setOpen] = useState(false);
  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        setInterval(["day", "day"]);
        setOpen(open);
      }}
    >
      <Button asChild variant="ghost" className={cn("flex items-center gap-2 outline", className)}>
        <DialogTrigger>
          <CalendarLabel range={range} />
        </DialogTrigger>
      </Button>
      <DialogContent className="flex flex-col gap-5 max-w-full w-fit justify-center">
        <div className="grid grid-cols-2">
          <p>
            <b>Dari: </b>
            {formatDate(range[0], "long")}
          </p>
          <p>
            <b>Sampai: </b>
            {formatDate(range[1], "long")}
          </p>
        </div>
        <div className="flex items-start gap-5 max-w-full w-fit justify-center">
          <Content
            mode={0}
            interval={interval[0]}
            range={range}
            setInterval={(s) => setInterval([s, interval[1]])}
            setTime={(start) => {
              const end = start > range[1] ? start : range[1];
              setRange(start, end);
            }}
          />
          <Content
            mode={1}
            interval={interval[1]}
            range={range}
            setInterval={(s) => setInterval([interval[0], s])}
            setTime={(end) => {
              const start = end < range[0] ? end : range[0];
              setRange(start, end);
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
});

function CalendarLabel({ range }: { range: [number, number] }) {
  return (
    <p className="flex items-center gap-2">
      {formatDate(range[0], "long")} &ndash; {formatDate(range[1], "long")}{" "}
      <CalendarDays className="icon" />
    </p>
  );
}

function Content({
  mode,
  interval,
  range,
  setTime,
  setInterval: setInterval,
}: {
  mode: 0 | 1;
  interval: Interval;
  range: [number, number];
  setTime: (time: number) => void;
  setInterval: (interval: Interval) => void;
}) {
  const [date, setDate] = useState(() =>
    Temporal.Instant.fromEpochMilliseconds(range[mode]).toZonedDateTimeISO(tz).startOfDay()
  );
  switch (interval) {
    case "day":
      return (
        <DayCalendar
          date={date}
          setDate={setDate}
          mode={mode}
          range={range}
          setTime={setTime}
          setInterval={setInterval}
        />
      );
    case "month":
      return (
        <MonthCalendar
          date={date}
          setDate={setDate}
          mode={mode}
          range={range}
          setInterval={setInterval}
        />
      );
  }
  return <YearCalendar date={date} setDate={setDate} setInterval={setInterval} />;
}

type Day = {
  label: number;
  ms: number;
  inside: boolean;
};

const style = {
  big: {
    width: "600px",
  },
  small: {
    width: "400px",
  },
};

function DayCalendar({
  setTime,
  range,
  mode,
  setInterval: setInterval,
  date,
  setDate,
}: {
  range: [number, number];
  mode: 0 | 1;
  setTime: (time: number) => void;
  setInterval: (interval: Interval) => void;
  date: Temporal.ZonedDateTime;
  setDate: (date: Temporal.ZonedDateTime) => void;
}) {
  const time = range[mode];
  const selectedMs = Temporal.Instant.fromEpochMilliseconds(time)
    .toZonedDateTimeISO(tz)
    .startOfDay().epochMilliseconds;
  const today = Temporal.Now.zonedDateTimeISO().startOfDay();
  const size = useSize();
  const { start, end, startOfMonth, endOfMonth } = useMemo(() => {
    const startOfMonth = Temporal.ZonedDateTime.from({
      timeZone: tz,
      year: date.year,
      month: date.month,
      day: 1,
    });
    const deltaStart = startOfMonth.dayOfWeek - 1;
    const start = startOfMonth.subtract(Temporal.Duration.from({ days: deltaStart }));
    const endOfMonth = startOfMonth.add(
      Temporal.Duration.from({ days: startOfMonth.daysInMonth - 1 })
    );
    const deltaEnd = 7 - endOfMonth.dayOfWeek;
    const end = endOfMonth.add(Temporal.Duration.from({ days: deltaEnd + 1 }));
    return { start, end, startOfMonth, endOfMonth };
  }, [date]);
  const days = useMemo(() => {
    const days: Day[] = [];
    for (
      let curr = start;
      curr.epochMilliseconds < end.epochMilliseconds;
      curr = curr.add(Temporal.Duration.from({ days: 1 }))
    ) {
      const label = curr.day;
      const ms = curr.epochMilliseconds;
      const inside = ms >= startOfMonth.epochMilliseconds && ms <= endOfMonth.epochMilliseconds;
      days.push({ ms, label, inside });
    }
    return days;
  }, [start.epochMilliseconds]);
  const handlePrev = () => {
    const t = sanitizeTime(startOfMonth.subtract(Temporal.Duration.from({ months: 1 })));
    setDate(t);
  };
  const handleNext = () => {
    const t = sanitizeTime(startOfMonth.add(Temporal.Duration.from({ months: 1 })));
    setDate(t);
  };
  return (
    <div style={style[size]} className="flex flex-col gap-2">
      <DialogHeader>
        <div className="flex flex-row items-center gap-2">
          <Button onClick={handlePrev} className="p-2">
            <ChevronLeft className="icon" />
          </Button>
          <Button variant="secondary" onClick={() => setInterval("month")}>
            <DialogTitle className="text-mormal">
              {monthNames[date.month]} {date.year}
            </DialogTitle>
          </Button>
          <Button onClick={handleNext} className="p-2">
            <ChevronRight className="icon" />
          </Button>
        </div>
      </DialogHeader>
      <div className="grid grid-cols-7">
        <div className="col-span-7 grid grid-cols-7 gap-2">
          <p className="text-center">Sen</p>
          <p className="text-center">Sel</p>
          <p className="text-center">Rab</p>
          <p className="text-center">Kam</p>
          <p className="text-center">Jum</p>
          <p className="text-center">Sab</p>
          <p className="text-center">Min</p>
        </div>
        {days.map(({ inside, label, ms }) => (
          <div
            key={ms}
            className={cn("p-1 flex justify-center items-center", {
              "bg-blue-100": ms <= range[1] && ms >= range[0],
            })}
          >
            <Button
              variant={
                ms === selectedMs ? "default" : ms === today.epochMilliseconds ? "outline" : "ghost"
              }
              className={inside ? "" : ms === selectedMs ? "text-zinc-100" : "text-zinc-500"}
              onClick={() => {
                const t = sanitizeTime(ms);
                setDate(
                  Temporal.Instant.fromEpochMilliseconds(t).toZonedDateTimeISO(tz).startOfDay()
                );
                setTime(t);
              }}
            >
              {label}
            </Button>
          </div>
        ))}
      </div>
      <DialogFooter className="flex items-center justify-end">
        <Button
          variant="outline"
          onClick={() => {
            setDate(today);
            setTime(today.epochMilliseconds);
          }}
        >
          Hari Ini
        </Button>
      </DialogFooter>
    </div>
  );
}

function MonthCalendar({
  range,
  mode,
  setInterval,
  date,
  setDate,
}: {
  range: [number, number];
  mode: 0 | 1;
  setInterval: (interval: Interval) => void;
  date: Temporal.ZonedDateTime;
  setDate: (date: Temporal.ZonedDateTime) => void;
}) {
  const time = range[mode];
  const selectedTime = Temporal.Instant.fromEpochMilliseconds(time)
    .toZonedDateTimeISO(tz)
    .startOfDay();
  const today = Temporal.Now.zonedDateTimeISO().startOfDay();
  const startOfYear = Temporal.ZonedDateTime.from({
    timeZone: tz,
    year: date.year,
    month: 1,
    day: 1,
  }).startOfDay();
  const handleClick = (month: number) => {
    const t = sanitizeTime(
      Temporal.Instant.fromEpochMilliseconds(month).toZonedDateTimeISO(tz).startOfDay()
    );
    setDate(t);
    setInterval("day");
  };
  const handlePrev = () => {
    setDate(sanitizeTime(date.subtract(Temporal.Duration.from({ years: 1 }))));
  };
  const handleNext = () => {
    setDate(sanitizeTime(date.add(Temporal.Duration.from({ years: 1 }))));
  };
  const size = useSize();
  const months = useMemo(() => {
    const months: { month: string; start: number; end: number }[] = new Array(12);
    let start = Temporal.ZonedDateTime.from(startOfYear);
    for (let i = 0; i < 12; i++) {
      const end = start.add(Temporal.Duration.from({ months: 1 }));
      months[i] = { month: MONTHS[i], start: start.epochMilliseconds, end: end.epochMilliseconds };
      start = end;
    }
    return months;
  }, [startOfYear.epochMilliseconds]);
  return (
    <div style={style[size]} className="flex flex-col gap-2">
      <DialogHeader>
        <div className="flex flex-row items-center gap-2">
          <Button onClick={handlePrev} className="p-2">
            <ChevronLeft className="icon" />
          </Button>
          <Button className="w-fit" variant="secondary" onClick={() => setInterval("year")}>
            <DialogTitle className="text-normal">{date.year}</DialogTitle>
          </Button>
          <Button onClick={handleNext} className="p-2">
            <ChevronRight className="icon" />
          </Button>
        </div>
      </DialogHeader>
      <div className="grid grid-cols-4">
        {months.map(({ month, start, end }, i) => (
          <div
            key={i}
            className={cn("p-1 flex justify-center items-center", {
              "bg-blue-100": start <= range[1] && end > range[0],
            })}
          >
            <Button
              variant={
                selectedTime.month === i + 1 && selectedTime.year === date.year
                  ? "default"
                  : today.month === i + 1 && today.year === date.year
                  ? "outline"
                  : "ghost"
              }
              onClick={() => handleClick(start)}
            >
              {month}
            </Button>
          </div>
        ))}
      </div>
      <DialogFooter className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => {
            setDate(today);
            setInterval("day");
          }}
        >
          Bulan Ini
        </Button>
      </DialogFooter>
    </div>
  );
}
function YearCalendar({
  setInterval,
  date,
  setDate,
}: {
  setInterval: (interval: Interval) => void;
  date: Temporal.ZonedDateTime;
  setDate: (date: Temporal.ZonedDateTime) => void;
}) {
  const size = useSize();
  const today = Temporal.Now.zonedDateTimeISO().startOfDay();
  const [year, setYear] = useState(date.year);
  const handleSubmitYear = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!Number.isInteger(year)) {
      return;
    }
    const t = sanitizeTime(
      Temporal.ZonedDateTime.from({
        timeZone: tz,
        year,
        month: today.month,
        day: today.day,
      })
    ).startOfDay();
    setDate(t);
    setInterval("month");
  };
  function handlePrev() {
    let t = year - 1;
    if (t < timeLowest.year) {
      t = timeLowest.year;
    }
    setYear(t);
  }
  function handleNext() {
    let t = year + 1;
    if (t > timeHighest.year) {
      t = timeHighest.year;
    }
    setYear(t);
  }
  return (
    <div style={style[size]} className="flex flex-col gap-2">
      <DialogHeader className="flex flex-row items-center gap-2">
        <Button onClick={handlePrev} className="p-2">
          <ChevronLeft className="icon" />
        </Button>
        <Button className="w-fit" variant="secondary" onClick={() => setInterval("day")}>
          <DialogTitle className="text-normal">Tahun</DialogTitle>
        </Button>
        <Button onClick={handleNext} className="p-2">
          <ChevronRight className="icon" />
        </Button>
      </DialogHeader>
      <form className="flex items-center gap-2" onSubmit={handleSubmitYear}>
        <Input
          type="number"
          value={year}
          onChange={(e) => setYear(Number(e.currentTarget.value))}
          name="year"
          id="year-input"
          aria-autocomplete="list"
        />
        <Button className="py-1 px-3">Ok</Button>
      </form>
      <DialogFooter className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => {
            const inputEl = document.getElementById("year-input") as HTMLInputElement;
            inputEl.value = today.year.toString();
            setInterval("month");
            setDate(today);
          }}
        >
          Tahun Ini
        </Button>
      </DialogFooter>
    </div>
  );
}
