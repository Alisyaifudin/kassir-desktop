import { Temporal } from "temporal-polyfill";
import { Interval } from "./type";
import { useMemo } from "react";
import { DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "~/lib/utils";

export const YEAR_LOWEST = 1900;
export const YEAR_HIGHEST = 2100;
const PAGE_SIZE = 15;

export function YearCalendar({
  setInterval,
  selected,
  show,
  setShow,
  setSelected,
  yearClass,
}: {
  setInterval: (interval: Interval) => void;
  selected: Temporal.PlainDate;
  show: Temporal.PlainYearMonth;
  setShow: (date: Temporal.PlainYearMonth) => void;
  setSelected: (date: Temporal.PlainDate) => void;
  yearClass?: (year: number) => string;
}) {
  const today = Temporal.Now.plainDateISO();
  const startYear = Math.max(
    YEAR_LOWEST,
    Math.floor((show.year - YEAR_LOWEST) / PAGE_SIZE) * PAGE_SIZE + YEAR_LOWEST,
  );
  const endYear = Math.min(startYear + PAGE_SIZE - 1, YEAR_HIGHEST);
  const years = useMemo(
    () => Array.from({ length: endYear - startYear + 1 }).map((_, i) => startYear + i),
    [startYear, endYear],
  );

  const handleChangeYear = (year: number) => {
    if (year > YEAR_HIGHEST || year < YEAR_LOWEST) return;
    setSelected(new Temporal.PlainDate(year, 1, 1));
    setInterval("month");
  };

  const canPrev = startYear > YEAR_LOWEST;
  const canNext = endYear < YEAR_HIGHEST;

  const handlePrev = () => {
    setShow(show.subtract(Temporal.Duration.from({ years: PAGE_SIZE })));
  };
  const handleNext = () => {
    setShow(show.add(Temporal.Duration.from({ years: PAGE_SIZE })));
  };

  return (
    <div className="small:w-[400px] w-[600px] flex flex-col gap-2">
      <DialogHeader>
        <div className="flex flex-row items-center gap-2">
          <Button onClick={handlePrev} disabled={!canPrev} className="p-2">
            <ChevronLeft className="icon" />
          </Button>
          <Button className="w-fit" variant="secondary" onClick={() => setInterval("day")}>
            <DialogTitle className="text-normal">
              {startYear} - {endYear}
            </DialogTitle>
          </Button>
          <Button onClick={handleNext} disabled={!canNext} className="p-2">
            <ChevronRight className="icon" />
          </Button>
        </div>
      </DialogHeader>
      <div className="grid grid-cols-5 gap-2">
        {years.map((year) => (
          <div key={year} className={cn("p-1 flex justify-center items-center", yearClass?.(year))}>
            <Button
              variant={
                year === selected.year ? "default" : year === today.year ? "outline" : "ghost"
              }
              className={cn("h-10", year === selected.year && "font-semibold")}
              onClick={() => handleChangeYear(year)}
            >
              {year}
            </Button>
          </div>
        ))}
      </div>
      <DialogFooter className="flex items-center justify-end">
        <Button
          variant="outline"
          onClick={() => {
            const targetShow = Temporal.PlainYearMonth.from(
              new Temporal.PlainDate(today.year, today.month, 1),
            );
            setShow(targetShow);
            handleChangeYear(today.year);
          }}
        >
          Tahun Ini
        </Button>
      </DialogFooter>
    </div>
  );
}
