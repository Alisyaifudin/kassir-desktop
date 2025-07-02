import { Temporal } from "temporal-polyfill";
import { z } from "zod";
import { numeric } from "~/lib/utils";

export function getOption(search: URLSearchParams) {
	const option = z
		.enum(["cashflow", "profit", "crowd", "products"])
		.catch("cashflow")
		.parse(search.get("option"));
	const interval = z
		.enum(["daily", "weekly", "monthly", "yearly"])
		.catch("weekly")
		.parse(search.get("interval"));
	const tz = Temporal.Now.timeZoneId();
	const time_p = numeric.safeParse(search.get("time"));
	const time: [number, boolean] = time_p.success
		? [time_p.data, false]
		: [Temporal.Now.instant().toZonedDateTimeISO(tz).startOfDay().epochMilliseconds, true];
	const mode = z.enum(["buy", "sell"]).catch("sell").parse(search.get("mode"));
	return { option, interval, time, mode };
}
