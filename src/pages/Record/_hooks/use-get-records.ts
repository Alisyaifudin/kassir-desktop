import { useCallback } from "react";
import { Temporal } from "temporal-polyfill";
import { useFetch } from "~/hooks/useFetch";
import { err, ok, Result } from "~/lib/utils";
import type { Context } from "../Records";

type Data = {
	records: DB.Record[];
	items: DB.RecordItem[];
	additionals: DB.Additional[];
	discounts: DB.Discount[];
};

export function useGetRecords(timestamp: number, { db }: Context) {
	const tz = Temporal.Now.timeZoneId();
	const date = Temporal.Instant.fromEpochMilliseconds(timestamp).toZonedDateTimeISO(tz);
	const start = date.startOfDay().epochMilliseconds;
	const end = date.startOfDay().add(Temporal.Duration.from({ days: 1 })).epochMilliseconds;
	const fetch = useCallback(async (): Promise<Result<"Aplikasi bermasalah", Data>> => {
		const promises = Promise.all([
			db.record.get.byRange(start, end),
			db.recordItem.get.byRange(start, end),
			db.additional.get.byRange(start, end),
			db.discount.get.byRange(start, end),
		]);
		const res = await promises;
		for (const [errMsg] of res) {
			if (errMsg) return err(errMsg);
		}
		const records = res[0][1]!;
		const items = res[1][1]!;
		const additionals = res[2][1]!;
		const discounts = res[3][1]!;
		return ok({ records, items, additionals, discounts });
	}, [timestamp]);
	return useFetch(fetch);
}
