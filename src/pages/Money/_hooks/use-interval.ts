import { useMemo } from "react";
import { Temporal } from "temporal-polyfill";
import { z } from "zod";
import { numeric } from "~/lib/utils";

export function useInterval(search: URLSearchParams) {
	const { start, end, time, date, kind } = useMemo(() => {
		const kind = z.enum(["saving", "debt", "diff"]).catch("saving").parse(search.get("kind"));
		const now = Temporal.Now.instant().epochMilliseconds;
		const timestamp = numeric.catch(now).parse(search.get("time"));
		const tz = Temporal.Now.timeZoneId();
		const date = Temporal.Instant.fromEpochMilliseconds(timestamp)
			.toZonedDateTimeISO(tz)
			.startOfDay();
		const start = Temporal.ZonedDateTime.from({
			timeZone: tz,
			year: date.year,
			month: date.month,
			day: 1,
		});
		const end = start.add(Temporal.Duration.from({ months: 1 }));
		return {
			kind,
			time: timestamp,
			date,
			start: start.epochMilliseconds,
			end: end.epochMilliseconds,
		};
	}, [search]);
	return { kind, time, date, start, end };
}
