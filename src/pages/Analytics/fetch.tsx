import { Temporal } from "temporal-polyfill";
import { useAsync } from "~/hooks/useAsync";
import { useDb } from "~/RootLayout";

export function useFetchData(
	interval: "weekly" | "monthly" | "yearly",
	time: number
) {
	const db = useDb();
	const tz = Temporal.Now.timeZoneId();
	const date = Temporal.Instant.fromEpochMilliseconds(time).toZonedDateTimeISO(tz);
	const [start, end] = getRange(date, interval, tz);
	const state = useAsync(db.record.getByRange(start, end, "ASC"), [interval, time]);
	return {state, start, end};
}

function getRange(
	date: Temporal.ZonedDateTime,
	interval: "weekly" | "monthly" | "yearly",
	tz: string
): [number, number] {
	switch (interval) {
		case "yearly": {
			const start = Temporal.ZonedDateTime.from({
				timeZone: tz,
				year: date.year,
				month: 1,
				day: 1,
			}).startOfDay();
			const end = start.add(Temporal.Duration.from({ years: 1 }));
			return [start.epochMilliseconds, end.epochMilliseconds];
		}
		case "monthly": {
			const start = Temporal.ZonedDateTime.from({
				timeZone: tz,
				year: date.year,
				month: date.month,
				day: 1,
			}).startOfDay();
			const end = start.add(Temporal.Duration.from({ months: 1 }));
			return [start.epochMilliseconds, end.epochMilliseconds];
		}
		case "weekly": {
			const start = date.subtract(Temporal.Duration.from({ days: date.dayOfWeek - 1 }));
			const end = start.add(Temporal.Duration.from({ days: date.daysInWeek }));
			return [start.epochMilliseconds, end.epochMilliseconds];
		}
	}
}
