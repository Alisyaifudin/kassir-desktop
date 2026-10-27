import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { memo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { Temporal } from "temporal-polyfill";
import { Input } from "./ui/input";
import { cn, numeric } from "~/lib/utils";
import { formatDate, monthNames } from "~/lib/date";

/**
 * `"day"` snaps a pick to local midnight (a date filter: the day is all that
 * matters); `"instant"` keeps the incoming clock reading, because the caller is
 * editing a persisted timestamp. Picking a day in the record's "Dibayar" /
 * "Kredit" editor used to rewind the sale to 00:00 — the record, the day list's
 * time order and a reprinted receipt all inherited it, and the picker has no
 * time control to put it back.
 */
type CalendarGranularity = "day" | "instant";

export const Calendar = memo(function Calendar({
  time,
  setTime,
  mode: modeInit = "day",
  granularity = "day",
  children,
  className,
}: {
  time: number;
  setTime: (time: number) => void;
  mode?: "day" | "month" | "year";
  granularity?: CalendarGranularity;
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
      <Button asChild variant="ghost" className={cn("flex items-center gap-2 w-[320px] outline", className)}>
        <DialogTrigger>
          {children === undefined ? <CalendarLabel mode={modeInit} time={time} /> : children}
          <CalendarDays className="size-5" />
        </DialogTrigger>
      </Button>
      <Content
        mode={mode}
        depth={modeInit}
        granularity={granularity}
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
  granularity,
  setTime,
  changeMode,
}: {
  mode: "day" | "month" | "year";
  depth: "day" | "month" | "year";
  granularity: CalendarGranularity;
  time: number;
  setTime: (time: number) => void;
  changeMode: (mode: "day" | "month" | "year") => void;
}) {
  const tz = Temporal.Now.timeZoneId();
  const original = Temporal.Instant.fromEpochMilliseconds(time).toZonedDateTimeISO(tz);
  // The clock reading carried onto the picked date for `granularity === "instant"`.
  const clock = {
    hours: original.hour,
    minutes: original.minute,
    seconds: original.second,
    milliseconds: original.millisecond,
  };
  /** The instant the caller receives for a picked calendar date. */
  const pick = (year: number, month: number, day: number) => {
    const first = Temporal.ZonedDateTime.from({ timeZone: tz, year, month, day: 1 });
    const picked = first.with({ day: Math.min(day, first.daysInMonth) });
    return (granularity === "instant" ? picked.add(clock) : picked).epochMilliseconds;
  };
  const timeStartOfDay = original.startOfDay();
  const [showTime, setShowTime] = useState(time);
  const date = Temporal.Instant.fromEpochMilliseconds(showTime).toZonedDateTimeISO(tz).startOfDay();
  // The year drill-down's field is controlled, so "Tahun Ini" can set it through
  // state instead of poking the DOM.
  const [yearInput, setYearInput] = useState(date.year);
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
                <ChevronLeft className="size-5" />
              </Button>
              <Button variant="secondary" onClick={() => changeMode("month")}>
                <DialogTitle className="text-base">
                  {monthNames[date.month]} {date.year}
                </DialogTitle>
              </Button>
              <Button onClick={handleNext} className="p-2">
                <ChevronRight className="size-5" />
              </Button>
            </div>
          </DialogHeader>
          <DialogDescription>Pilih tanggal.</DialogDescription>
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
                  const picked = Temporal.Instant.fromEpochMilliseconds(epoch).toZonedDateTimeISO(tz);
                  setTime(pick(picked.year, picked.month, picked.day));
                }}
              >
                {day}
              </Button>
            ))}
          </div>
          <DialogFooter className="flex items-center justify-end">
            <Button
              variant="outline"
              onClick={() => setTime(pick(today.year, today.month, today.day))}
            >
              Hari Ini
            </Button>
          </DialogFooter>
        </DialogContent>
      );
    }
    case "month": {
      const handleClick = (month: number) => {
        const day = granularity === "instant" ? original.day : 1;
        const t = Temporal.ZonedDateTime.from({ timeZone: tz, year: date.year, month, day: 1 });
        if (depth === "month") {
          setTime(pick(date.year, month, day));
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
                <ChevronLeft className="size-5" />
              </Button>
              <Button className="w-fit" variant="secondary" onClick={() => changeMode("year")}>
                <DialogTitle className="text-base">{date.year}</DialogTitle>
              </Button>
              <Button onClick={handleNext} className="p-2">
                <ChevronRight className="size-5" />
              </Button>
            </div>
          </DialogHeader>
          <DialogDescription>Pilih bulan.</DialogDescription>
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
                  setTime(pick(today.year, today.month, granularity === "instant" ? original.day : 1));
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
    const clampedYear = Math.min(Math.max(year, 1900), 2100);
    const month = granularity === "instant" ? original.month : 1;
    const day = granularity === "instant" ? original.day : 1;
    const t = Temporal.ZonedDateTime.from({
      timeZone: tz,
      year: clampedYear,
      month: 1,
      day: 1,
    }).epochMilliseconds;
    if (depth === "year") {
      setTime(pick(clampedYear, month, day));
    } else {
      setShowTime(t);
      changeMode("month");
    }
  };
  return (
    <DialogContent>
      <DialogHeader>
        <Button className="w-fit" variant="secondary" onClick={() => changeMode("day")}>
          <DialogTitle className="text-base">Tahun</DialogTitle>
        </Button>
      </DialogHeader>
      <DialogDescription>Pilih tahun.</DialogDescription>
      <form onSubmit={handleSubmitYear}>
        <Input
          type="number"
          value={yearInput}
          onChange={(event) => setYearInput(Number(event.currentTarget.value))}
          name="year"
          id="year-input"
          aria-autocomplete="list"
        />
      </form>
      <DialogFooter className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => {
            // Drive the controlled year field through state: a DOM write is
            // reverted by React on the next render.
            setYearInput(today.year);
            if (depth === "year") {
              setTime(
                pick(
                  today.year,
                  granularity === "instant" ? original.month : 1,
                  granularity === "instant" ? original.day : 1,
                ),
              );
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
