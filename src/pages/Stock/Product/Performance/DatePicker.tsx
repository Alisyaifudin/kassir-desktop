import { ChevronLeft, ChevronRight } from "lucide-react";
import { Temporal } from "temporal-polyfill";
import { Calendar } from "~/components/Calendar";
import { Button } from "~/components/ui/button";
import { monthNames } from "~/lib/utils";
import { useTime } from "./use-time";
import { useInterval } from "./use-interval";

export function DatePicker() {
  const [time, setTime] = useTime();
  const tz = Temporal.Now.timeZoneId();
  const date = Temporal.Instant.fromEpochMilliseconds(time).toZonedDateTimeISO(tz).startOfDay();
  const [interval] = useInterval();
  const handlePrev = () => {
    switch (interval) {
      case "month":
        setTime(date.subtract(Temporal.Duration.from({ months: 1 })).epochMilliseconds);
        break;
      case "year":
        setTime(date.subtract(Temporal.Duration.from({ years: 1 })).epochMilliseconds);
        break;
    }
  };
  const handleNext = () => {
    switch (interval) {
      case "month":
        setTime(date.add(Temporal.Duration.from({ months: 1 })).epochMilliseconds);
        break;
      case "year":
        setTime(date.add(Temporal.Duration.from({ years: 1 })).epochMilliseconds);
        break;
    }
  };
  if (interval === "all") return null;
  return (
    <div className="flex items-center gap-7">
      <div className="flex items-center gap-2">
        <Button onClick={handlePrev}>
          <ChevronLeft />
        </Button>
        <Calendar
          time={time}
          setTime={(time) => {
            setTime(time);
          }}
          mode={interval}
        >
          <CalendarLabel time={time} interval={interval} />
        </Calendar>
        <Button onClick={handleNext}>
          <ChevronRight />
        </Button>
      </div>
    </div>
  );
}

function CalendarLabel({ time, interval }: { time: number; interval: "month" | "year" }) {
  const tz = Temporal.Now.timeZoneId();
  const date = Temporal.Instant.fromEpochMilliseconds(time).toZonedDateTimeISO(tz);
  switch (interval) {
    case "month":
      return (
        <p>
          {monthNames[date.month]} {date.year}
        </p>
      );
    case "year":
      return <p>{date.year}</p>;
  }
}
