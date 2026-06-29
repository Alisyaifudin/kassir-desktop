import { Temporal } from "temporal-polyfill";
import { Interval } from "./type";
import { DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { monthMap } from "~/lib/date";
import { useMemo } from "react";
import { cn } from "~/lib/utils";

export function DayCalendar({
  dayClass,
  selected,
  setInterval,
  setSelected,
  setShow,
  show,
}: {
  setInterval: (interval: Interval) => void;
  show: Temporal.PlainYearMonth;
  setShow: (date: Temporal.PlainYearMonth) => void;
  selected: Temporal.PlainDate;
  setSelected: (date: Temporal.PlainDate) => void;
  dayClass?: (day: Temporal.PlainDate) => string;
}) {
  const today = Temporal.Now.plainDateISO();
  const days = useMemo(() => {
    const days = Array.from({ length: show.daysInMonth }).map((_, i) => ({
      isInside: true,
      date: new Temporal.PlainDate(show.year, show.month, i + 1),
    }));
    const startOfMonth = new Temporal.PlainDate(show.year, show.month, 1);
    const deltaPrev = startOfMonth.dayOfWeek - 1;
    const daysPrev: { date: Temporal.PlainDate; isInside: boolean }[] = [];
    if (deltaPrev > 0) {
      daysPrev.push(
        ...Array.from({ length: deltaPrev }).map((_, i) => ({
          date: startOfMonth.subtract(Temporal.Duration.from({ days: deltaPrev - i })),
          isInside: false,
        })),
      );
    }
    const endOfMonth = new Temporal.PlainDate(show.year, show.month, show.daysInMonth);
    const deltaNext = 7 - endOfMonth.dayOfWeek;
    const daysNext: { date: Temporal.PlainDate; isInside: boolean }[] = [];
    if (deltaNext > 0) {
      daysNext.push(
        ...Array.from({ length: deltaNext }).map((_, i) => ({
          date: endOfMonth.add(Temporal.Duration.from({ days: i + 1 })),
          isInside: false,
        })),
      );
    }
    return [...daysPrev, ...days, ...daysNext];
  }, [show.year, show.month, show.daysInMonth]);
  const handlePrev = () => {
    setShow(show.subtract(Temporal.Duration.from({ months: 1 })));
  };
  const handleNext = () => {
    setShow(show.add(Temporal.Duration.from({ months: 1 })));
  };
  return (
    <div className="small:w-[400px] w-[600px] flex flex-col gap-2">
      <DialogHeader>
        <div className="flex flex-row items-center gap-2">
          <Button onClick={handlePrev} className="p-2">
            <ChevronLeft className="icon" />
          </Button>
          <Button variant="secondary" onClick={() => setInterval("month")}>
            <DialogTitle className="text-mormal">
              {monthMap[show.month]} {show.year}
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
        {days.map(({ date, isInside }) => (
          <div
            key={date.toString()}
            className={cn("p-1 flex justify-center items-center", dayClass?.(date))}
          >
            <Button
              variant={
                Temporal.PlainDate.compare(selected, date) === 0
                  ? "default"
                  : Temporal.PlainDate.compare(date, today) === 0
                    ? "outline"
                    : "ghost"
              }
              className={
                isInside
                  ? ""
                  : Temporal.PlainDate.compare(selected, date) === 0
                    ? "text-zinc-100"
                    : "text-zinc-500"
              }
              onClick={() => {
                setSelected(date);
              }}
            >
              {date.day}
            </Button>
          </div>
        ))}
      </div>
      <DialogFooter className="flex items-center justify-end">
        <Button
          variant="outline"
          onClick={() => {
            setSelected(today);
          }}
        >
          Hari Ini
        </Button>
      </DialogFooter>
    </div>
  );
}

// className={cn("p-1 flex justify-center items-center", {
//   "bg-blue-100": ms <= range[1] && ms >= range[0],
// })}
