import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "../ui/button";
import { DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Interval } from "./type";
import { Temporal } from "temporal-polyfill";
import { useMemo } from "react";
import { MONTHS } from "~/lib/date";
import { cn } from "~/lib/utils";

export function MonthCalendar({
  setInterval,
  show,
  monthClass,
  selected,
  setSelected,
  setShow,
}: {
  setInterval: (interval: Interval) => void;
  show: Temporal.PlainYearMonth;
  setShow: (date: Temporal.PlainYearMonth) => void;
  selected: Temporal.PlainDate;
  setSelected: (date: Temporal.PlainDate) => void;
  monthClass?: (month: Temporal.PlainYearMonth) => string;
}) {
  const today = Temporal.Now.plainDateISO().toPlainYearMonth();
  const handleClick = (date: Temporal.PlainYearMonth) => {
    setSelected(new Temporal.PlainDate(date.year, date.month, 1));
    setInterval("day");
  };
  const handlePrev = () => {
    setShow(show.subtract(Temporal.Duration.from({ months: 1 })));
  };
  const handleNext = () => {
    setShow(show.add(Temporal.Duration.from({ months: 1 })));
  };
  const months = useMemo(() => {
    return MONTHS.map((name, i) => ({ name, date: new Temporal.PlainYearMonth(show.year, i + 1) }));
  }, [show.year]);
  return (
    <div className="small:w-[400px] w-[600px] flex flex-col gap-2">
      <DialogHeader>
        <div className="flex flex-row items-center gap-2">
          <Button onClick={handlePrev} className="p-2">
            <ChevronLeft className="icon" />
          </Button>
          <Button className="w-fit" variant="secondary" onClick={() => setInterval("year")}>
            <DialogTitle className="text-normal">{show.year}</DialogTitle>
          </Button>
          <Button onClick={handleNext} className="p-2">
            <ChevronRight className="icon" />
          </Button>
        </div>
      </DialogHeader>
      <div className="grid grid-cols-4">
        {months.map(({ name, date }, i) => (
          <div key={i} className={cn("p-1 flex justify-center items-center", monthClass?.(date))}>
            <Button
              variant={
                selected.month === i + 1 && selected.year === date.year
                  ? "default"
                  : today.month === i + 1 && today.year === date.year
                    ? "outline"
                    : "ghost"
              }
              onClick={() => handleClick(date)}
            >
              {name}
            </Button>
          </div>
        ))}
      </div>
      <DialogFooter className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => {
            setShow(today);
            handleClick(today);
          }}
        >
          Bulan Ini
        </Button>
      </DialogFooter>
    </div>
  );
}

// className={cn("p-1 flex justify-center items-center", {
//   "bg-blue-100": start <= range[1] && end > range[0],
// })}
