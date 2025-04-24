import { RouteObject } from "react-router";
import { Button } from "../../components/ui/button";
import { useDb, useStore } from "../../Layout";
import { useState } from "react";
import { Input } from "../../components/ui/input";
import { setSetting, useSetting } from "./setting-api";
import { Loader2 } from "lucide-react";
import { Await } from "../../components/Await";
import { Store } from "../../store";
import { Temporal } from "temporal-polyfill";
import { dateStringSchema, dateToEpoch, formatDate } from "../../utils";
import { z } from "zod";
import JSZip from "jszip";

export const route: RouteObject = {
	path: "setting",
	children: [{ index: true, Component: Page }],
};

export default function Page() {
	const setting = useSetting();
	return <Await state={setting}>{(setting) => <Setting {...setting} />}</Await>;
}

function Setting({ owner, address, ig, tiktok, wa }: Partial<Record<keyof Store, string>>) {
	const store = useStore();
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const db = useDb();
	const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const formData = new FormData(e.currentTarget);
		setLoading(true);
		setSetting(store, {
			owner: (formData.get("owner") as string) ?? undefined,
			address: (formData.get("address") as string) ?? undefined,
			wa: (formData.get("wa") as string) ?? undefined,
			ig: (formData.get("ig") as string) ?? undefined,
			tiktok: (formData.get("tiktok") as string) ?? undefined,
		})
			.then(() => {
				setError("");
				setLoading(false);
			})
			.catch(() => {
				setError("Ada yang bermasalah.");
				setLoading(false);
			});
	};
	const today = Temporal.Now.zonedDateTimeISO();
	const startOfMonth = Temporal.ZonedDateTime.from({
		timeZone: today.timeZoneId,
		year: today.year,
		month: today.month,
		day: 1,
		hour: 0,
		minute: 0,
		second: 0,
		microsecond: 0,
	});
	const endOfMonth = startOfMonth.add(Temporal.Duration.from({ months: 1 }));
	const handleDownload = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const formData = new FormData(e.currentTarget);
		const parsed = z
			.object({
				start: dateStringSchema,
				end: dateStringSchema,
			})
			.safeParse({
				start: formData.get("start"),
				end: formData.get("end"),
			});
		if (!parsed.success) {
			console.error(parsed.error.flatten().fieldErrors);
			setError("Ada yang error");
			return;
		}
		const start = dateToEpoch(parsed.data.start);
		const end = dateToEpoch(parsed.data.end);
		const [[errRecords, records], [errItems, items], [errTax, taxes], [errProduct, products]] =
			await Promise.all([
				db.record.getByRange(start, end),
				db.recordItem.getByRange(start, end),
				db.tax.getByRange(start, end),
				db.product.getAll(),
			]);
		if (errRecords !== null) {
			console.error(errRecords);
			setError(errRecords);
			return;
		}
		if (errTax !== null) {
			console.error(errTax);
			setError(errTax);
			return;
		}
		if (errProduct !== null) {
			console.error(errProduct);
			setError(errProduct);
			return;
		}
		if (errItems !== null) {
			console.error(errItems);
			setError(errItems);
			return;
		}
		const headersRecord = "timestamp,total,pay,disc_val,disc_type,change,mode";
		const rowsRecord = records.map((row) => Object.values(row).join(","));
		const csvRecord = [headersRecord, ...rowsRecord].join("\n");
		const headersItem = "id,timestamp,name,price,qty,subtotal,disc_val,disc_type,capital";
		const rowsItem = items.map((row) => Object.values(row).join(","));
		const csvItem = [headersItem, ...rowsItem].join("\n");
		const headersTax = "id,timestamp,name,value";
		const rowsTax = taxes.map((row) => Object.values(row).join(","));
		const csvTax = [headersTax, ...rowsTax].join("\n");
		const headersProduct = "id,name,stock,barcode,price";
		const rowsProduct = products.map((row) => Object.values(row).join(","));
		const csvProduct = [headersProduct, ...rowsProduct].join("\n");
		const zip = new JSZip();
		zip.file("records.csv", csvRecord);
		zip.file("record_items.csv", csvItem);
		zip.file("tax.csv", csvTax);
		zip.file("products.csv", csvProduct);

		const blob = await zip.generateAsync({ type: "blob" });
		const url = URL.createObjectURL(blob);

		const a = document.createElement("a");
		a.href = url;
		a.download = "data.zip";
		a.click();
		URL.revokeObjectURL(url);
	};
	return (
		<main className="flex flex-col gap-2 p-2 flex-1 w-full max-w-xl mx-auto justify-between">
			<form onSubmit={handleSubmit} className="flex flex-col gap-2">
				<label className="grid grid-cols-[100px_1px_1fr] items-center gap-1">
					<span>Nama Toko</span>
					:
					<Input type="text" defaultValue={owner} name="owner" />
				</label>
				<label className="grid grid-cols-[100px_1px_1fr] items-center gap-1">
					<span>Alamat</span>
					:
					<Input type="text" defaultValue={address} name="address" />
				</label>
				<label className="grid grid-cols-[100px_1px_1fr]  items-center gap-1">
					<span>WA</span>
					:
					<Input type="text" defaultValue={wa} name="wa" pattern="\d*" />
				</label>
				<label className="grid grid-cols-[100px_1px_1fr] items-center gap-1">
					<span>Instagram</span>
					:
					<Input type="text" defaultValue={ig} name="ig" />
				</label>
				<label className="grid grid-cols-[100px_1px_1fr] items-center gap-1">
					<span>TikTok</span>
					:
					<Input type="text" defaultValue={tiktok} name="tiktok" />
				</label>
				<Button>Simpan {loading && <Loader2 className="animate-spin" />}</Button>
				{error === "" ? null : <p className="text-red-500">{error}</p>}
			</form>
			<form onSubmit={handleDownload}>
				<p className="font-bold">Unduh Data</p>
				<div className="flex gap-3 items-end">
					<label className="flex flex-col gap-1">
						<span>Dari:</span>
						<Input
							type="date"
							name="start"
							defaultValue={formatDate(startOfMonth.epochMilliseconds)}
						/>
					</label>
					<div className="h-8">&mdash;</div>
					<label className="flex flex-col gap-1">
						<span>Sampai:</span>
						<Input type="date" name="end" defaultValue={formatDate(endOfMonth.epochMilliseconds)} />
					</label>
					<Button>Unduh</Button>
				</div>
			</form>
		</main>
	);
}
