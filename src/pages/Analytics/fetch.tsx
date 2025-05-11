import { Temporal } from "temporal-polyfill";
import { useAsyncDep } from "~/hooks/useAsyncDep";
import { useDB } from "~/RootLayout";

export function useFetchData(interval: "daily" | "weekly" | "monthly" | "yearly", time: number) {
	const db = useDB();
	const tz = Temporal.Now.timeZoneId();
	const date = Temporal.Instant.fromEpochMilliseconds(time).toZonedDateTimeISO(tz);
	const [start, end] = getRange(date, interval, tz);
	const state = useAsyncDep(() =>
		Promise.all([db.record.getByRange(start, end, "ASC"), db.product.getByRange(start, end)]),
		[interval, time]
	);
	return { state, start, end };
}

function getRange(
	date: Temporal.ZonedDateTime,
	interval: "daily" | "weekly" | "monthly" | "yearly",
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
		case "daily": {
			const start = date.startOfDay();
			const end = start.add(Temporal.Duration.from({ days: 1 }));
			return [start.epochMilliseconds, end.epochMilliseconds];
		}
	}
}
