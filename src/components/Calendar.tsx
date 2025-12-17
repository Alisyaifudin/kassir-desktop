import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTrigger,
  DialogFooter,
  DialogTitle,
} from "./ui/dialog";
import { memo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { cn, formatDate, monthNames, numeric } from "~/lib/utils";
import { Temporal } from "temporal-polyfill";
import { Input } from "./ui/input";

export const Calendar = memo(function ({
  time,
  setTime,
  mode: modeInit = "day",
  children,
  className,
}: {
  time: number;
  setTime: (time: number) => void;
  mode?: "day" | "month" | "year";
  children?: React.ReactNode;
  className?: string;
}) {
  const [mode, setMode] = useState<"day" | "month" | "year">(modeInit);
  const changeMode = (mode: "day" | "month" | "year") => {
    switch (modeInit) {
      case "year":
        break;
      case "month":
        if (mode === "day") setMode("month");
        else setMode(mode);
        break;
      case "day":
        setMode(mode);
    }
  };
  const [open, setOpen] = useState(false);
  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        setMode(modeInit);
        setOpen(open);
      }}
    >
      <Button asChild variant="ghost" className={cn("flex items-center gap-2 outline", className)}>
        <DialogTrigger>
          {children === undefined ? <CalendarLabel mode={modeInit} time={time} /> : children}
          <CalendarDays className="icon" />
        </DialogTrigger>
      </Button>
      <Content
        mode={mode}
        depth={modeInit}
        time={time}
        setTime={(time) => {
          setTime(time);
          setOpen(false);
        }}
        changeMode={changeMode}
      />
    </Dialog>
  );
});

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
  time,
  depth,
  setTime,
  changeMode,
}: {
  mode: "day" | "month" | "year";
  depth: "day" | "month" | "year";
  time: number;
  setTime: (time: number) => void;
  changeMode: (mode: "day" | "month" | "year") => void;
}) {
  const tz = Temporal.Now.timeZoneId();
  const timeStartOfDay = Temporal.Instant.fromEpochMilliseconds(time)
    .toZonedDateTimeISO(tz)
    .startOfDay();
  const [showTime, setShowTime] = useState(time);
  const date = Temporal.Instant.fromEpochMilliseconds(showTime).toZonedDateTimeISO(tz).startOfDay();
  const today = Temporal.Now.instant().toZonedDateTimeISO(tz).startOfDay();
  switch (mode) {
    case "day": {
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
      const days: [number, number, boolean][] = [];
      for (
        let curr = start;
        curr.epochMilliseconds < end.epochMilliseconds;
        curr = curr.add(Temporal.Duration.from({ days: 1 }))
      ) {
        const inside =
          curr.epochMilliseconds >= startOfMonth.epochMilliseconds &&
          curr.epochMilliseconds <= endOfMonth.epochMilliseconds;
        days.push([curr.day, curr.epochMilliseconds, inside]);
      }
      const handlePrev = () => {
        setShowTime(startOfMonth.subtract(Temporal.Duration.from({ months: 1 })).epochMilliseconds);
      };
      const handleNext = () => {
        setShowTime(startOfMonth.add(Temporal.Duration.from({ months: 1 })).epochMilliseconds);
      };
      return (
        <DialogContent>
          <DialogHeader>
            <div className="flex flex-row items-center gap-2">
              <Button onClick={handlePrev} className="p-2">
                <ChevronLeft className="icon" />
              </Button>
              <Button variant="secondary" onClick={() => changeMode("month")}>
                <DialogTitle className="text-mormal">
                  {monthNames[date.month]} {date.year}
                </DialogTitle>
              </Button>
              <Button onClick={handleNext} className="p-2">
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
            {days.map(([day, epoch, inside]) => (
              <Button
                key={epoch}
                variant={
                  epoch === timeStartOfDay.epochMilliseconds
                    ? "default"
                    : epoch === today.epochMilliseconds
                    ? "outline"
                    : "ghost"
                }
                className={
                  inside
                    ? ""
                    : epoch === timeStartOfDay.epochMilliseconds
                    ? "text-zinc-100"
                    : "text-zinc-500"
                }
                onClick={() => {
                  setShowTime(epoch);
                  setTime(epoch);
                }}
              >
                {day}
              </Button>
            ))}
          </div>
          <DialogFooter className="flex items-center justify-end">
            <Button variant="outline" onClick={() => setTime(today.epochMilliseconds)}>
              Hari Ini
            </Button>
          </DialogFooter>
        </DialogContent>
      );
    }
    case "month": {
      const handleClick = (month: number) => {
        const t = Temporal.ZonedDateTime.from({ timeZone: tz, year: date.year, month, day: 1 });
        if (depth === "month") {
          setTime(t.epochMilliseconds);
        } else {
          setShowTime(t.epochMilliseconds);
          changeMode("day");
        }
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
        setShowTime(date.subtract(Temporal.Duration.from({ years: 1 })).epochMilliseconds);
      };
      const handleNext = () => {
        setShowTime(date.add(Temporal.Duration.from({ years: 1 })).epochMilliseconds);
      };
      return (
        <DialogContent>
          <DialogHeader>
            <div className="flex flex-row items-center gap-2">
              <Button onClick={handlePrev} className="p-2">
                <ChevronLeft className="icon" />
              </Button>
              <Button className="w-fit" variant="secondary" onClick={() => changeMode("year")}>
                <DialogTitle className="text-normal">{date.year}</DialogTitle>
              </Button>
              <Button onClick={handleNext} className="p-2">
                <ChevronRight className="icon" />
              </Button>
            </div>
          </DialogHeader>
          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: 12 }).map((_, i) => (
              <Button
                key={i}
                variant={
                  timeStartOfDay.month === i + 1 && timeStartOfDay.year === date.year
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
                if (depth === "month") {
                  setTime(today.epochMilliseconds);
                } else {
                  setShowTime(today.epochMilliseconds);
                  changeMode("day");
                }
              }}
            >
              Bulan Ini
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
    let t = 0;
    if (year < 1900) {
      t = Temporal.ZonedDateTime.from({
        timeZone: tz,
        year: 1900,
        month: 1,
        day: 1,
      }).epochMilliseconds;
    } else if (year > 2100) {
      t = Temporal.ZonedDateTime.from({
        timeZone: tz,
        year: 2100,
        month: 1,
        day: 1,
      }).epochMilliseconds;
    } else {
      t = Temporal.ZonedDateTime.from({ timeZone: tz, year, month: 1, day: 1 }).epochMilliseconds;
    }
    if (depth === "year") {
      setTime(t);
    } else {
      setShowTime(t);
      changeMode("month");
    }
  };
  return (
    <DialogContent>
      <DialogHeader>
        <Button className="w-fit" variant="secondary" onClick={() => changeMode("day")}>
          <DialogTitle className="text-normal">Tahun</DialogTitle>
        </Button>
      </DialogHeader>
      <form onSubmit={handleSubmitYear}>
        <Input
          type="number"
          defaultValue={date.year}
          name="year"
          id="year-input"
          aria-autocomplete="list"
        />
      </form>
      <DialogFooter className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => {
            const inputEl = document.getElementById("year-input") as HTMLInputElement;
            inputEl.value = today.year.toString();
            if (depth === "year") {
              setTime(today.epochMilliseconds);
            } else {
              setShowTime(today.epochMilliseconds);
              changeMode("month");
            }
          }}
        >
          Tahun Ini
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
