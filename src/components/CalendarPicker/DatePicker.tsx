import { Button } from "~/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "~/components/ui/dialog";
import { useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";
import { cn } from "~/lib/utils";
import { Temporal } from "temporal-polyfill";
import { formatDate } from "~/lib/date";
import { Interval } from "./type";
import { DayCalendar } from "./DayCalendar";
import { MonthCalendar } from "./MonthCalendar";
import { YearCalendar } from "./YearCalendar";

export function DatePicker({
  date,
  setDate,
  label,
  className,
}: {
  date: Temporal.PlainDate;
  setDate: (date: Temporal.PlainDate) => void;
  label?: (date: Temporal.PlainDate) => React.ReactNode;
  className?: string;
}) {
  const [interval, setInterval] = useState<Interval>("day");
  const [open, setOpen] = useState(false);
  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        setInterval("day");
        setOpen(open);
      }}
    >
      <Button asChild variant="ghost" className={cn("flex items-center gap-2 outline", className)}>
        <DialogTrigger>{label?.(date) ?? <DefaultLabel date={date} />}</DialogTrigger>
      </Button>
      <DialogContent className="flex flex-col gap-5 max-w-full w-fit justify-center">
        <p>
          <b>Tanggal: </b>
          {formatDate(date, "long")}
        </p>
        <div className="flex items-start gap-5 max-w-full w-fit justify-center">
          <Content
            selected={date}
            setSelected={setDate}
            setInterval={setInterval}
            interval={interval}
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
  interval,
  selected,
  setInterval,
  setSelected,
}: {
  interval: Interval;
  setInterval: (interval: Interval) => void;
  selected: Temporal.PlainDate;
  setSelected: (date: Temporal.PlainDate) => void;
}) {
  const [show, setShow] = useState(Temporal.PlainYearMonth.from(selected));
  useEffect(() => {
    setShow(Temporal.PlainYearMonth.from(selected));
  }, [selected]);
  switch (interval) {
    case "day":
      return (
        <DayCalendar
          setInterval={setInterval}
          selected={selected}
          setSelected={setSelected}
          show={show}
          setShow={setShow}
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
        />
      );
    case "year":
      return (
        <YearCalendar setInterval={setInterval} selected={selected} setSelected={setSelected} />
      );
  }
}
