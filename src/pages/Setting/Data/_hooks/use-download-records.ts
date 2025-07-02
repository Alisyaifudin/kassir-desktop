import { Temporal } from "temporal-polyfill";
import { Database } from "~/database";
import { useAction } from "~/hooks/useAction";
import { constructCSV, dateStringSchema, dateToEpoch, err, log, ok, Result } from "~/lib/utils";
import JSZip from "jszip";
import { z } from "zod";

const dateRangeSchema = z.object({
	start: dateStringSchema,
	end: dateStringSchema,
});

export function useDownloadRecord(db: Database) {
	const { action, loading, error, setError } = useAction(
		"",
		(time: { start: number; end: number }) => getBlob(db, time.start, time.end)
	);
	const today = Temporal.Now.zonedDateTimeISO();
	const startOfMonth = Temporal.ZonedDateTime.from({
		timeZone: today.timeZoneId,
		year: today.year,
		month: today.month,
		day: 1,
	}).startOfDay();
	const endOfMonth = startOfMonth.add(Temporal.Duration.from({ months: 1 }));
	const handleDownload = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const formData = new FormData(e.currentTarget);
		const parsed = dateRangeSchema.safeParse({
			start: formData.get("start"),
			end: formData.get("end"),
		});
		if (!parsed.success) {
			log.error(JSON.stringify(parsed.error.flatten().fieldErrors));
			setError("Ada yang error");
			return;
		}
		const start = dateToEpoch(parsed.data.start);
		const end = dateToEpoch(parsed.data.end);
		const [errMsg, blob] = await action({ start, end });
		setError(errMsg);
		if (errMsg !== null) {
			return;
		}
		setError("");
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `records_data_${today.epochMilliseconds}.zip`;
		a.click();
		URL.revokeObjectURL(url);
	};
	return {
		loading,
		error,
		handleDownload,
		startOfMonth: startOfMonth.epochMilliseconds,
		endOfMonth: endOfMonth.epochMilliseconds,
	};
}

async function getBlob(db: Database, start: number, end: number): Promise<Result<string, Blob>> {
	const [[errRecords, records], [errItems, items], [errAdd, additionals], [errDisc, discounts]] =
		await Promise.all([
			db.record.get.byRange(start, end),
			db.recordItem.get.byRange(start, end),
			db.additional.get.byRange(start, end),
			db.discount.get.byRange(start, end),
		]);
	if (errRecords !== null) {
		log.error(errRecords);
		return err(errRecords);
	}
	if (errAdd !== null) {
		log.error(errAdd);
		return err(errAdd);
	}
	if (errItems !== null) {
		log.error(errItems);
		return err(errItems);
	}
	if (errDisc !== null) {
		log.error(errDisc);
		return err(errDisc);
	}
	const recordCSV = constructCSV(records);
	const itemCSV = constructCSV(items);
	const additionalsCSV = constructCSV(additionals);
	const discountsCSV = constructCSV(discounts);

	const zip = new JSZip();
	zip.file(`records_${start}_${end}.csv`, recordCSV);
	zip.file(`record_items_${start}_${end}.csv`, itemCSV);
	zip.file(`additional_${start}_${end}.csv`, additionalsCSV);
	zip.file(`discount_${start}_${end}.csv`, discountsCSV);

	const blob = await zip.generateAsync({ type: "blob" });
	return ok(blob);
}
