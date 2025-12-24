import { ChevronLeft, ChevronRight } from "lucide-react";
import { Temporal } from "temporal-polyfill";
import { Calendar } from "~/components/Calendar";
import { Button } from "~/components/ui/button";
import { dayNames, formatDate, monthNames } from "~/lib/utils";
import { useTime } from "./use-time";
import { useInterval } from "./use-interval";

const mode = {
  day: "day",
  week: "day",
  month: "month",
  year: "year",
} as const;

export function DatePicker({
  defaultInterval,
  children,
}: {
  defaultInterval: "day" | "week" | "month";
  children?: React.ReactNode;
}) {
  const [time, setTime] = useTime();
  const tz = Temporal.Now.timeZoneId();
  const date = Temporal.Instant.fromEpochMilliseconds(time).toZonedDateTimeISO(tz).startOfDay();
  const [interval] = useInterval(defaultInterval);
  const handlePrev = () => {
    switch (interval) {
      case "day":
        setTime(date.subtract(Temporal.Duration.from({ days: 1 })).epochMilliseconds);
        break;
      case "week":
        setTime(date.subtract(Temporal.Duration.from({ weeks: 1 })).epochMilliseconds);
        break;
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
      case "day":
        setTime(date.add(Temporal.Duration.from({ days: 1 })).epochMilliseconds);
        break;
      case "week":
        setTime(date.add(Temporal.Duration.from({ weeks: 1 })).epochMilliseconds);
        break;
      case "month":
        setTime(date.add(Temporal.Duration.from({ months: 1 })).epochMilliseconds);
        break;
      case "year":
        setTime(date.add(Temporal.Duration.from({ years: 1 })).epochMilliseconds);
        break;
    }
  };
  return (
    <div className="flex items-center gap-7">
      {children}
      <div className="flex items-center gap-2">
        <Button onClick={handlePrev}>
          <ChevronLeft />
        </Button>
        <Calendar
          time={time}
          setTime={(time) => {
            setTime(time);
          }}
          mode={mode[interval]}
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

function CalendarLabel({
  time,
  interval,
}: {
  time: number;
  interval: "day" | "week" | "month" | "year";
}) {
  const tz = Temporal.Now.timeZoneId();
  const date = Temporal.Instant.fromEpochMilliseconds(time).toZonedDateTimeISO(tz);
  switch (interval) {
    case "day": {
      return (
        <p className="font-normal">
          {formatDate(date.epochMilliseconds).replace(/-/g, "/")} {dayNames[date.dayOfWeek]}
        </p>
      );
    }
    case "week": {
      const start = date.subtract(Temporal.Duration.from({ days: date.dayOfWeek - 1 }));
      const end = date.add(Temporal.Duration.from({ days: 7 - date.dayOfWeek }));
      return (
        <p className="font-normal">
          {formatDate(start.epochMilliseconds).replace(/-/g, "/")} &ndash;{" "}
          {formatDate(end.epochMilliseconds).replace(/-/g, "/")}
        </p>
      );
    }
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
