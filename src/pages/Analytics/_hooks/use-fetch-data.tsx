import { Temporal } from "temporal-polyfill";
import { Database } from "~/database";
import { ProductRecord } from "~/database/product";
import { useAsyncDep } from "~/hooks/useAsyncDep";
import { generateRecordSummary, RecordTransform } from "~/lib/record";
import { err, ok, Result } from "~/lib/utils";

export function useFetchData(interval: "daily" | "weekly" | "monthly" | "yearly", time: number, db: Database) {
	const tz = Temporal.Now.timeZoneId();
	const date = Temporal.Instant.fromEpochMilliseconds(time).toZonedDateTimeISO(tz);
	const [start, end] = getRange(date, interval, tz);
	const state = useAsyncDep(async (): Promise<
		Result<"Aplikasi bermasalah", { products: ProductRecord[]; records: RecordTransform[] }>
	> => {
		const data = await Promise.all([
			db.record.get.byRange(start, end, "ASC"),
			db.recordItem.get.byRange(start, end),
			db.additional.get.byRange(start, end),
			db.discount.get.byRange(start, end),
			db.product.get.byRange(start, end),
		]);
		for (const [errMsg] of data) {
			if (errMsg) return err(errMsg);
		}
		const records = data[0][1]!;
		const items = data[1][1]!;
		const additionals = data[2][1]!;
		const discounts = data[3][1]!;
		const products = data[4][1]!;
		const summaries = records.map((record) =>
			generateRecordSummary({ record, items, additionals, discounts })
		);
		return ok({ products, records: summaries.map((s) => s.record) });
	}, [interval, time]);
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
