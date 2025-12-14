import { SetURLSearchParams } from "react-router";
import { Temporal } from "temporal-polyfill";

export function getTime(search: URLSearchParams): {
	time: number;
	yesterday: number;
	tomorrow: number;
} {
	const time = getTimeBase(search);
	const yesterday = time.subtract(Temporal.Duration.from({ days: 1 })).epochMilliseconds;
	const tomorrow = time.add(Temporal.Duration.from({ days: 1 })).epochMilliseconds;
	return {
		time: time.epochMilliseconds,
		yesterday,
		tomorrow,
	};
}

function getTimeBase(search: URLSearchParams): Temporal.ZonedDateTime {
	const tz = Temporal.Now.timeZoneId();
	const timeStr = search.get("time");
	if (timeStr === null || Number.isNaN(timeStr)) {
		const now = Temporal.Now.instant().toZonedDateTimeISO(tz);
		const search = new URLSearchParams(window.location.search);
		search.set("time", now.epochMilliseconds.toString());
		window.location.search = search.toString();
		return now;
	}
	return Temporal.Instant.fromEpochMilliseconds(Number(timeStr)).toZonedDateTimeISO(tz);
}

export function setTime(setSearch: SetURLSearchParams, time: number) {
	const search = new URLSearchParams(window.location.search);
	search.set("time", time.toString());
	setSearch(search);
}
