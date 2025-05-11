import { Temporal } from "temporal-polyfill";
import { useDB } from "../../../RootLayout";
import { useState } from "react";
import { z } from "zod";
import {
	constructCSV,
	dateStringSchema,
	dateToEpoch,
	err,
	formatDate,
	log,
	ok,
	Result,
} from "../../../lib/utils";
import JSZip from "jszip";
import { Input } from "../../../components/ui/input";
import { Button } from "../../../components/ui/button";
import { Database } from "../../../database";
import { TextError } from "../../../components/TextError";
import { Loader2 } from "lucide-react";

const dateRangeSchema = z.object({
	start: dateStringSchema,
	end: dateStringSchema,
});

export default function Record() {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const db = useDB();
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
		setLoading(true);
		const start = dateToEpoch(parsed.data.start);
		const end = dateToEpoch(parsed.data.end);
		const [errMsg, blob] = await getBlob(db, start, end);
		if (errMsg !== null) {
			setError(errMsg);
			setLoading(false);
			return;
		}
		setError("");
		setLoading(false);
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `records_data_${today.epochMilliseconds}.zip`;
		a.click();
		URL.revokeObjectURL(url);
	};
	return (
		<div className="flex gap-2 flex-col p-2 bg-sky-50">
			<div className="flex gap-2 items-center justify-between ">
				<h3 className="italic">Riwayat</h3>
			</div>
			<form onSubmit={handleDownload} className="text-2xl flex justify-between items-end">
				<div className="flex gap-3 items-end">
					<label className="flex flex-col gap-1">
						<span>Dari:</span>
						<Input
							type="date"
							name="start"
							defaultValue={formatDate(startOfMonth.epochMilliseconds)}
						/>
					</label>
					<div className="h-12">&mdash;</div>
					<label className="flex flex-col gap-1">
						<span>Sampai:</span>
						<Input type="date" name="end" defaultValue={formatDate(endOfMonth.epochMilliseconds)} />
					</label>
				</div>
				<Button>Unduh {loading ? <Loader2 className="animate-spin" /> : null}</Button>
			</form>
			{error ? <TextError>{error}</TextError> : null}
		</div>
	);
}

async function getBlob(db: Database, start: number, end: number): Promise<Result<string, Blob>> {
	const [[errRecords, records], [errItems, items], [errAdd, additionals]] = await Promise.all([
		db.record.getByRange(start, end),
		db.recordItem.getByRange(start, end),
		db.additional.getByRange(start, end),
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
	const recordCSV = constructCSV(records);
	const itemCSV = constructCSV(items);
	const additionalsCSV = constructCSV(additionals);

	const zip = new JSZip();
	zip.file(`records_${start}_${end}.csv`, recordCSV);
	zip.file(`record_items_${start}_${end}.csv`, itemCSV);
	zip.file(`additional_${start}_${end}.csv`, additionalsCSV);

	const blob = await zip.generateAsync({ type: "blob" });
	return ok(blob);
}
