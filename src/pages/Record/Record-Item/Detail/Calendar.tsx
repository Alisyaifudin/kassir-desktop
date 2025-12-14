import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTrigger,
  DialogFooter,
  DialogTitle,
} from "~/components/ui/dialog";
import { useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { formatDate, monthNames, numeric, sizeClass } from "~/lib/utils";
import { Temporal } from "temporal-polyfill";
import { Input } from "~/components/ui/input";
import { Size } from "~/lib/store-old";

export function Calendar({
  time,
  setTime,
  mode: modeInit = "day",
  children,
  size,
}: {
  time: number;
  setTime: (time: number) => void;
  mode?: "day" | "month" | "year";
  children?: React.ReactNode;
  size: Size;
}) {
  const [mode, setMode] = useState<"day" | "month" | "year">(modeInit);
  const tz = Temporal.Now.timeZoneId();
  const timeDate = Temporal.Instant.fromEpochMilliseconds(time).toZonedDateTimeISO(tz);
  const [date, setDate] = useState(timeDate);
  const [open, setOpen] = useState(false);
  const changeMode = (mode: "day" | "month" | "year") => {
    setMode(mode);
  };
  const handleTime = (time: number) => {
    setOpen(false);
    setTime(time);
  };
  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        setDate(timeDate);
        setOpen(open);
      }}
    >
      <Button asChild variant="ghost" className="flex items-center gap-2 outline">
        <DialogTrigger>
          {children === undefined ? <CalendarLabel mode={modeInit} time={time} /> : children}
          <CalendarDays />
        </DialogTrigger>
      </Button>
      <Content
        mode={mode}
        date={date}
        setDate={setDate}
        changeMode={changeMode}
        setTime={handleTime}
        size={size}
      />
    </Dialog>
  );
}

function CalendarLabel({ time, mode }: { time: number; mode?: "day" | "month" | "year" }) {
  const tz = Temporal.Now.timeZoneId();
  const date = Temporal.Instant.fromEpochMilliseconds(time).toZonedDateTimeISO(tz);
  switch (mode) {
    case "day":
      return <p className="font-normal">{formatDate(time).replace(/-/g, "/")}</p>;
    case "month":
      return (
        <p className="font-normal">
          {monthNames[date.month]} {date.year}
        </p>
      );
    case "year":
      return <p className="font-normal">{date.year}</p>;
  }
}

function Content({
  mode,
  setDate,
  date,
  changeMode,
  setTime,
  size,
}: {
  mode: "day" | "month" | "year";
  date: Temporal.ZonedDateTime;
  setDate: React.Dispatch<React.SetStateAction<Temporal.ZonedDateTime>>;
  changeMode: (mode: "day" | "month" | "year") => void;
  setTime: (time: number) => void;
  size: Size;
}) {
  const tz = Temporal.Now.timeZoneId();
  const timeStartOfDay = date.startOfDay();
  const [showTime, setShowTime] = useState(date);
  const startOfDate = showTime.startOfDay();
  const today = Temporal.Now.instant().toZonedDateTimeISO(tz);
  switch (mode) {
    case "day": {
      const startOfMonth = Temporal.ZonedDateTime.from({
        timeZone: tz,
        year: startOfDate.year,
        month: startOfDate.month,
        day: 1,
      }).startOfDay();
      const deltaStart = startOfMonth.dayOfWeek - 1;
      const start = startOfMonth.subtract(Temporal.Duration.from({ days: deltaStart }));
      const endOfMonth = startOfMonth.add(
        Temporal.Duration.from({ days: startOfMonth.daysInMonth - 1 }),
      );
      const deltaEnd = 7 - endOfMonth.dayOfWeek;
      const end = endOfMonth.add(Temporal.Duration.from({ days: deltaEnd + 1 }));
      const days: [number, Temporal.ZonedDateTime, boolean][] = [];
      for (
        let curr = start;
        curr.epochMilliseconds < end.epochMilliseconds;
        curr = curr.add(Temporal.Duration.from({ days: 1 }))
      ) {
        const inside =
          curr.epochMilliseconds >= startOfMonth.epochMilliseconds &&
          curr.epochMilliseconds < endOfMonth.epochMilliseconds;
        days.push([curr.day, curr, inside]);
      }
      const handlePrev = () => {
        setShowTime(startOfMonth.subtract(Temporal.Duration.from({ months: 1 })));
      };
      const handleNext = () => {
        setShowTime(startOfMonth.add(Temporal.Duration.from({ months: 1 })));
      };
      return (
        <DialogContent className={sizeClass[size]}>
          <DialogHeader>
            <div className="flex flex-row items-center gap-2">
              <Button onClick={handlePrev}>
                <ChevronLeft className="icon" />
              </Button>
              <Button variant="secondary" onClick={() => changeMode("month")}>
                <DialogTitle className="text-normal">
                  {monthNames[startOfDate.month]} {startOfDate.year}
                </DialogTitle>
              </Button>
              <Button onClick={handleNext}>
                <ChevronRight className="icon" />
              </Button>
            </div>
          </DialogHeader>
          <div className="grid grid-cols-7 gap-2">
            <p className="text-center">Sen</p>
            <p className="text-center">Sel</p>
            <p className="text-center">Rab</p>
            <p className="text-center">Kam</p>
            <p className="text-center">Jum</p>
            <p className="text-center">Sab</p>
            <p className="text-center">Min</p>
            {days.map(([day, d, inside]) => (
              <Button
                key={d.epochMilliseconds}
                variant={
                  d.year === date.year && d.month === date.month && d.day === date.day
                    ? "default"
                    : d.year === today.year && d.month === today.month && d.day === today.day
                      ? "outline"
                      : "ghost"
                }
                className={inside ? "" : d.equals(date) ? "text-zinc-100" : "text-zinc-500"}
                onClick={() => {
                  const t = Temporal.ZonedDateTime.from({
                    timeZone: tz,
                    year: d.year,
                    month: d.month,
                    day: d.day,
                    hour: date.hour,
                    minute: date.minute,
                    second: date.second,
                    millisecond: date.millisecond,
                  });
                  setShowTime(t);
                  setDate(t);
                }}
              >
                {day}
              </Button>
            ))}
          </div>
          <div className="flex items-center justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setDate(today);
                setShowTime(today);
              }}
            >
              Hari Ini
            </Button>
          </div>
          <Clock date={date} setDate={setDate} />
          <DialogFooter>
            <Button onClick={() => setTime(date.epochMilliseconds)}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      );
    }
    case "month": {
      const handleClick = (month: number) => {
        const t = Temporal.ZonedDateTime.from({
          timeZone: tz,
          year: date.year,
          month,
          day: 1,
          hour: date.hour,
          minute: date.minute,
          second: date.second,
          millisecond: date.millisecond,
        });
        setShowTime(t);
        changeMode("day");
      };
      const months = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "Mei",
        "Jun",
        "Jul",
        "Agu",
        "Sep",
        "Okt",
        "Nov",
        "Des",
      ];
      const handlePrev = () => {
        setShowTime(startOfDate.subtract(Temporal.Duration.from({ years: 1 })));
      };
      const handleNext = () => {
        setShowTime(startOfDate.add(Temporal.Duration.from({ years: 1 })));
      };
      return (
        <DialogContent className={sizeClass[size]}>
          <DialogHeader>
            <div className="flex flex-row items-center gap-2">
              <Button onClick={handlePrev}>
                <ChevronLeft className="icon" />
              </Button>
              <Button className="w-fit" variant="secondary" onClick={() => changeMode("year")}>
                <DialogTitle className="text-normal">{startOfDate.year}</DialogTitle>
              </Button>
              <Button onClick={handleNext}>
                <ChevronRight size={35} />
              </Button>
            </div>
          </DialogHeader>
          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: 12 }).map((_, i) => (
              <Button
                key={i}
                variant={
                  timeStartOfDay.month === i + 1 && timeStartOfDay.year === startOfDate.year
                    ? "default"
                    : "ghost"
                }
                onClick={() => handleClick(i + 1)}
              >
                {months[i]}
              </Button>
            ))}
          </div>
          <DialogFooter className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => {
                setShowTime(today);
                changeMode("day");
              }}
            >
              Bulan ini
            </Button>
          </DialogFooter>
        </DialogContent>
      );
    }
  }
  const handleSubmitYear = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const parsed = numeric.safeParse(formData.get("year"));
    if (!parsed.success) {
      return;
    }
    const year = parsed.data;
    if (!Number.isInteger(year)) {
      return;
    }
    if (year < 1900) {
      const t = Temporal.ZonedDateTime.from({
        timeZone: tz,
        year: 1900,
        month: 1,
        day: 1,
        hour: date.hour,
        minute: date.minute,
        second: date.second,
        millisecond: date.millisecond,
      });
      setShowTime(t);
      changeMode("month");
      return;
    }
    if (year > 2100) {
      const t = Temporal.ZonedDateTime.from({
        timeZone: tz,
        year: 2100,
        month: 1,
        day: 1,
        hour: date.hour,
        minute: date.minute,
        second: date.second,
        millisecond: date.millisecond,
      });
      setShowTime(t);
      changeMode("month");
      return;
    }
    const t = Temporal.ZonedDateTime.from({
      timeZone: tz,
      year,
      month: 1,
      day: 1,
      hour: date.hour,
      minute: date.minute,
      second: date.second,
      millisecond: date.millisecond,
    });
    setShowTime(t);
    changeMode("month");
  };
  return (
    <DialogContent className={sizeClass[size]}>
      <DialogHeader>
        <Button className="w-fit" variant="secondary" onClick={() => changeMode("day")}>
          <DialogTitle className="text-normal">Tahun</DialogTitle>
        </Button>
      </DialogHeader>
      <form onSubmit={handleSubmitYear}>
        <Input
          type="number"
          defaultValue={startOfDate.year}
          name="year"
          id="year-input"
          aria-autocomplete="list"
        />
      </form>
      <DialogFooter className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => {
            setShowTime(today);
            changeMode("month");
          }}
        >
          Tahun ini
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function Clock({
  date,
  setDate,
}: {
  date: Temporal.ZonedDateTime;
  setDate: React.Dispatch<React.SetStateAction<Temporal.ZonedDateTime>>;
}) {
  const tz = Temporal.Now.timeZoneId();
  return (
    <div className="grid grid-cols-3">
      <p className="text-center">Jam</p>
      <p className="text-center">Menit</p>
      <p className="text-center">Detik</p>
      <div className="flex justify-center">
        <select
          value={date.hour}
          className="px-2 w-fit"
          onChange={(e) =>
            setDate((date) =>
              Temporal.ZonedDateTime.from({
                timeZone: tz,
                year: date.year,
                month: date.month,
                day: date.day,
                hour: Number(e.currentTarget.value),
                minute: date.minute,
                second: date.second,
                millisecond: date.millisecond,
              }),
            )
          }
        >
          {Array.from({ length: 24 }).map((_, i) => (
            <option key={i} value={i}>
              {i}
            </option>
          ))}
        </select>
      </div>
      <div className="flex justify-center">
        <select
          value={date.minute}
          className="px-2 w-fit"
          onChange={(e) =>
            setDate((date) =>
              Temporal.ZonedDateTime.from({
                timeZone: tz,
                year: date.year,
                month: date.month,
                day: date.day,
                hour: date.hour,
                minute: Number(e.currentTarget.value),
                second: date.second,
                millisecond: date.millisecond,
              }),
            )
          }
        >
          {Array.from({ length: 60 }).map((_, i) => (
            <option key={i} value={i}>
              {i}
            </option>
          ))}
        </select>
      </div>
      <div className="flex justify-center">
        <select
          value={date.second}
          className="px-2 w-fit"
          onChange={(e) =>
            setDate((date) =>
              Temporal.ZonedDateTime.from({
                timeZone: tz,
                year: date.year,
                month: date.month,
                day: date.day,
                hour: date.hour,
                minute: date.minute,
                second: Number(e.currentTarget.value),
                millisecond: date.millisecond,
              }),
            )
          }
        >
          {Array.from({ length: 60 }).map((_, i) => (
            <option key={i} value={i}>
              {i}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
