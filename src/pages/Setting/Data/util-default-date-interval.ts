import { Temporal } from "temporal-polyfill";

export function getDefaultInterval() {
  const today = Temporal.Now.zonedDateTimeISO();
  const startOfMonth = Temporal.ZonedDateTime.from({
    timeZone: today.timeZoneId,
    year: today.year,
    month: today.month,
    day: 1,
  }).startOfDay();
  const endOfMonth = startOfMonth.add(Temporal.Duration.from({ months: 1 }));
  return {
    startOfMonth: startOfMonth.epochMilliseconds,
    endOfMonth: endOfMonth.epochMilliseconds,
  };
}
