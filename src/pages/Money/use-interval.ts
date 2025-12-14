import { useMemo } from "react";
import { Temporal } from "temporal-polyfill";
import { z } from "zod";
import { numeric } from "~/lib/utils";

export function useInterval(search: URLSearchParams) {
	const { time, date, kind } = useMemo(() => {
		const kind = z.enum(["saving", "debt", "diff"]).catch("saving").parse(search.get("kind"));
		const now = Temporal.Now.instant().epochMilliseconds;
		const timestamp = numeric.catch(now).parse(search.get("time"));
		const tz = Temporal.Now.timeZoneId();
		const date = Temporal.Instant.fromEpochMilliseconds(timestamp)
			.toZonedDateTimeISO(tz)
			.startOfDay();
		return {
			kind,
			time: timestamp,
			date,
		};
	}, [search]);
	return { kind, time, date };
}
