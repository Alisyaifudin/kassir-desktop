import { err, formatDate, Result } from "~/lib/utils";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { TextError } from "~/components/TextError";
import { Spinner } from "~/components/Spinner";
import { Form, useActionData } from "react-router";
import { Temporal } from "temporal-polyfill";
import { useLoading } from "~/hooks/use-loading";
import JSZip from "jszip";
import { Action } from "./action";
import { useEffect } from "react";
import { RecordOk } from "./action/record";

export default function Record() {
	const { startOfMonth, endOfMonth } = useDateInterval();
	const loading = useLoading();
	const [error, res] = useAction();
	useDownload(res);
	return (
		<div className="flex gap-2 flex-col p-2 bg-sky-50">
			<div className="flex gap-2 items-center justify-between ">
				<h3 className="italic text-normal font-bold">Riwayat</h3>
			</div>
			<Form method="POST" className="text-2xl flex justify-between items-end">
				<input type="hidden" name="action" value="record"></input>
				<div className="flex gap-3 items-end">
					<label className="flex flex-col gap-1">
						<span>Dari:</span>
						<Input
							type="date"
							name="start"
							defaultValue={formatDate(startOfMonth)}
							aria-autocomplete="list"
						/>
					</label>
					<div className="h-12">&mdash;</div>
					<label className="flex flex-col gap-1">
						<span>Sampai:</span>
						<Input
							type="date"
							name="end"
							defaultValue={formatDate(endOfMonth)}
							aria-autocomplete="list"
						/>
					</label>
				</div>
				<Button>
					Unduh <Spinner when={loading} />
				</Button>
			</Form>
			<TextError>{error}</TextError>
		</div>
	);
}

export function useDateInterval() {
	const today = Temporal.Now.zonedDateTimeISO();
	const startOfMonth = Temporal.ZonedDateTime.from({
		timeZone: today.timeZoneId,
		year: today.year,
		month: today.month,
		day: 1,
	}).startOfDay();
	const endOfMonth = startOfMonth.add(Temporal.Duration.from({ months: 1 }));
	return {
		startOfMonth: startOfMonth.epochMilliseconds,
		endOfMonth: endOfMonth.epochMilliseconds,
	};
}

function useAction(): Result<string | null, RecordOk> {
	const data = useActionData<Action>();
	if (data !== undefined && data.action === "record") {
		return data.res;
	}
	return err(null);
}

function useDownload(res: RecordOk | null) {
	useEffect(() => {
		if (res === null) {
			return;
		}
		async function process(data: RecordOk) {
			const zip = new JSZip();
			const start = data.start;
			const end = data.end;
			zip.file(`records_${start}_${end}.csv`, data.record);
			zip.file(`record_items_${start}_${end}.csv`, data.record);
			zip.file(`additional_${start}_${end}.csv`, data.additional);
			zip.file(`discount_${start}_${end}.csv`, data.discount);

			const blob = await zip.generateAsync({ type: "blob" });
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = data.name;
			a.click();
			URL.revokeObjectURL(url);
		}
		process(res);
	}, [res]);
}
