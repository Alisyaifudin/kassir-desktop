import { Fragment } from "react/jsx-runtime";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "~/components/ui/table";
import { TaxItem } from "../TaxItem";
import Decimal from "decimal.js";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { useState } from "react";
import { TextError } from "~/components/TextError";
import { Loader2 } from "lucide-react";
import { useDB } from "~/RootLayout";
import {
	dayNames,
	formatDate,
	formatTime,
	Method,
	METHOD_NAMES,
	METHODS,
	numeric,
} from "~/lib/utils";
import { useNavigate } from "react-router";
import { Calendar } from "./Calendar";
import { LinkProduct } from "./LinkProduct";
import { Textarea } from "~/components/ui/textarea";
import { z } from "zod";
import { useAction } from "~/hooks/useAction";
import { EditBtn } from "./EditBtn";
import { useProducts } from "~/hooks/useProducts";
import { Await } from "~/components/Await";
import { emitter } from "~/lib/event-emitter";
import { Temporal } from "temporal-polyfill";

export function Detail({
	items,
	record,
	additionals,
	discs,
	role,
	methods,
}: {
	items: DB.RecordItem[];
	record: DB.Record;
	additionals: DB.Additional[];
	discs: DB.Discount[];
	role: "admin" | "user";
	methods: DB.MethodType[];
}) {
	const methodType = methods.find((m) => m.id === record.method_type);
	const methodTypeName = methodType === undefined ? "" : " " + methodType.name;
	const [isEdit, setIsEdit] = useState(false);
	const navigate = useNavigate();
	const { credit, time } = useActions(record.timestamp);
	const handleSubmitPayCredit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const formData = new FormData(e.currentTarget);
		const parsed = numeric.safeParse(formData.get("pay"));
		if (!parsed.success) {
			credit.setError(parsed.error.flatten().formErrors.join("; "));
			return;
		}
		const pay = parsed.data;
		const change = new Decimal(pay).sub(record.grand_total).toNumber();
		if (change < 0) {
			credit.setError("Bayaran tidak cukup");
			return;
		}
		const [errMsg, now] = await credit.action({ pay, change });
		if (errMsg) {
			credit.setError(errMsg);
			return;
		}
		credit.setError("");
		await navigate(`/records/${now}?tab=detail`);
	};
	const handleChangeTime = async (newTime: number) => {
		const [errMsg, now] = await time.action(newTime);
		if (errMsg) {
			time.setError(errMsg);
			return;
		}
		time.setError("");
		await navigate(`/records/${now}?tab=detail`);
	};

	const date = getDay(record.timestamp);
	return (
		<div className="flex flex-col gap-2 text-3xl">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<p>No: {record.timestamp}</p>
					{record.cashier ? (
						<>
							<div className="border-left h-full border" />
							<p>Kasir: {record.cashier}</p>
						</>
					) : null}
				</div>
				{role === "admin" ? (
					<div className="flex gap-2 items-center">
						{time.error ? <TextError>{time.error}</TextError> : null}
						<Calendar time={record.timestamp} setTime={handleChangeTime}>
							<p>
								{formatTime(record.timestamp, "long")} {date.name},{" "}
								{formatDate(record.timestamp, "long")}
							</p>
						</Calendar>
						{time.loading ? <Loader2 className="animate-spin" /> : null}
					</div>
				) : null}
			</div>
			{record.credit && role === "admin" ? (
				<form onSubmit={handleSubmitPayCredit}>
					<label className="flex items-center gap-5">
						<span className="text-red-500">Kredit</span>
						<Input placeholder="Bayaran..." type="number" name="pay" className="w-[200px]" />
						<Button>Bayar {credit.loading ? <Loader2 className="animate-spin" /> : null}</Button>
						{credit.error ? <TextError>{credit.error}</TextError> : null}
					</label>
				</form>
			) : null}
			<Table className="text-3xl">
				<TableHeader>
					<TableRow>
						<TableHead className="w-[70px]">No</TableHead>
						<TableHead>Nama</TableHead>
						<TableHead className="w-[170px] text-end">Satuan</TableHead>
						<TableHead className="w-[170px] text-end">Modal</TableHead>
						<TableHead className="w-[70px]">Qty</TableHead>
						<TableHead className="w-[170px]  text-end">Total*</TableHead>
						<TableHead className="w-[170px]  text-end">Total</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody className="border-b">
					{items.map((item, i) => {
						const ds = discs.filter((d) => d.record_item_id === item.id);
						const fix = Math.max(
							findFixed(item.price),
							findFixed(item.total),
							findFixed(item.total)
						);
						let vals = [];
						let curr = new Decimal(item.total_before_disc);
						for (const d of ds) {
							switch (d.kind) {
								case "number":
									vals.push(d.value);
									curr = curr.sub(d.value);
									break;
								case "percent":
									const val = curr.times(d.value).div(100).toFixed(fix);
									vals.push(Number(val));
									curr = curr.sub(val);
							}
						}
						return (
							<Fragment key={i}>
								<TableRow>
									<TableCell className="flex items-center">
										{i + 1}
										{role === "admin" ? <LinkProductList item={item} /> : null}
									</TableCell>
									<TableCell>{item.name}</TableCell>
									<TableCell className="text-end flex items-center gap-1 justify-end">
										<EditBtn mode={record.mode} productId={item.product_id} />
										{item.price.toLocaleString("id-ID")}{" "}
									</TableCell>
									<TableCell className="text-end">{item.capital.toLocaleString("id-ID")}</TableCell>
									<TableCell className="text-center">{item.qty}</TableCell>
									<TableCell className="text-end">
										{item.total_before_disc.toLocaleString("id-ID")}
									</TableCell>
									<TableCell className="text-end">{item.total.toLocaleString("id-ID")}</TableCell>
								</TableRow>
								{ds.map((d, i) => (
									<Fragment key={d.id}>
										<TableRow>
											<TableCell colSpan={5} className="text-end">
												Diskon {d.kind === "percent" ? `${d.value}%` : null}
											</TableCell>
											<TableCell className="text-end">{vals[i].toLocaleString("id-ID")}</TableCell>
										</TableRow>
									</Fragment>
								))}
							</Fragment>
						);
					})}
				</TableBody>
			</Table>
			<div className="flex flex-col items-end">
				{record.disc_val > 0 ? (
					<>
						<div className="grid grid-cols-[170px_200px]">
							<p className="text-end">Subtotal:</p>
							<p className="text-end">Rp{record.total_before_disc.toLocaleString("id-ID")}</p>
						</div>
						<div className="grid grid-cols-[170px_200px]">
							<p className="text-end">Diskon:</p>
							<p className="text-end">
								Rp{(record.total_before_disc - record.total_after_disc).toLocaleString("id-ID")}
							</p>
						</div>
						<hr />
						<div className="grid grid-cols-[170px_200px]">
							<div></div>{" "}
							<p className="text-end">Rp{record.total_after_disc.toLocaleString("de-DE")}</p>
						</div>
					</>
				) : null}
				{additionals.length > 0 ? (
					<>
						{additionals.map((tax) => (
							<TaxItem key={tax.id} tax={tax} total={record.total_after_disc} />
						))}
						<hr className="w-full" />
						<div className="grid grid-cols-[170px_200px]">
							<div></div>{" "}
							<p className="text-end">Rp{record.total_after_tax.toLocaleString("de-DE")}</p>
						</div>
					</>
				) : null}
				{record.rounding ? (
					<div className="grid grid-cols-[170px_200px]">
						<p className="text-end">Pembulatan:</p>
						<p className="text-end">Rp{record.rounding.toLocaleString("id-ID")}</p>
					</div>
				) : null}
				<div className="grid grid-cols-[170px_200px]">
					<p className="text-end">Total:</p>
					<p className="text-end">Rp{Number(record.grand_total).toLocaleString("id-ID")}</p>
				</div>
				<div className="grid grid-cols-[170px_200px]">
					<p className="text-end">Pembayaran:</p>
					<p className="text-end">Rp{Number(record.pay).toLocaleString("id-ID")}</p>
				</div>
				<div className="grid grid-cols-[170px_200px]">
					<p className="text-end">Kembalian:</p>{" "}
					<p className="text-end">Rp{Number(record.change).toLocaleString("id-ID")}</p>
				</div>
			</div>
			<div className="flex flex-col gap-2">
				{isEdit || role === "user" ? null : (
					<Button className="w-fit" onClick={() => setIsEdit(true)} variant="secondary">
						Edit
					</Button>
				)}
				{isEdit ? (
					<Edit methods={methods} record={record} setIsEdit={setIsEdit} />
				) : (
					<div className="flex flex-col gap-2">
						<p>
							Metode: {METHOD_NAMES[record.method]}
							{methodTypeName}
						</p>
						<p>Catatan:</p>
						<p>{record.note}</p>
					</div>
				)}
			</div>
		</div>
	);
}

function findFixed(val: number): number {
	let fix = 0;
	while (val - Math.floor(val) !== 0) {
		fix += 1;
		val *= 10;
	}
	return fix;
}

function useActions(timestamp: number) {
	const db = useDB();
	const credit = useAction("", (data: { pay: number; change: number }) =>
		db.record.updateCreditPay(data.pay, data.change, timestamp)
	);
	const time = useAction("", (newTime: number) => db.record.updateTimestamp(timestamp, newTime));
	return { credit, time };
}

function LinkProductList({ item }: { item: DB.RecordItem }) {
	const state = useProducts();
	return (
		<Await state={state}>{(products) => <LinkProduct item={item} products={products} />}</Await>
	);
}

export function getDay(epochMilli: number) {
	const tz = Temporal.Now.timeZoneId();
	const date = Temporal.Instant.fromEpochMilliseconds(epochMilli).toZonedDateTimeISO(tz);
	return { day: date.day, name: dayNames[date.dayOfWeek] };
}

function Edit({
	record,
	setIsEdit,
	methods,
}: {
	record: DB.Record;
	setIsEdit: React.Dispatch<React.SetStateAction<boolean>>;
	methods: DB.MethodType[];
}) {
	const [meth, setMeth] = useState<{
		method: Method;
		type: number | null;
	}>({
		method: record.method,
		type: record.method_type,
	});
	const db = useDB();
	const { action, error, loading, setError } = useAction(
		"",
		(data: { note: string; method: Method; methodType: number | null }) =>
			db.record.updateNoteAndMethod(record.timestamp, data.note, data.method, data.methodType)
	);
	const handleSubmitEdit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const formData = new FormData(e.currentTarget);
		const parsed = z.string().safeParse(formData.get("note"));
		if (!parsed.success) {
			const errs = parsed.error.flatten().formErrors;
			setError(errs.join("; "));
			return;
		}
		setError(null);
		const errMsg = await action({ note: parsed.data, method: meth.method, methodType: meth.type });
		setError(errMsg);
		if (errMsg === null) {
			emitter.emit("fetch-record-item");
			setIsEdit(false);
		}
	};
	const handleChangeMethod = (e: React.ChangeEvent<HTMLSelectElement>) => {
		const parsed = z.enum(METHODS).safeParse(e.currentTarget.value);
		const method = parsed.success ? parsed.data : "cash";
		if (method === meth.method) {
			return;
		}
		setMeth({
			type: null,
			method,
		});
	};
	const handleChangeMethodType = (e: React.ChangeEvent<HTMLSelectElement>) => {
		const parsed = z
			.string()
			.refine((val) => val === "null" || (val !== "" && !isNaN(Number(val))), {
				message: "Harus angka",
			})
			.transform((v) => {
				if (v === "null") {
					return null;
				}
				return Number(v);
			})
			.safeParse(e.currentTarget.value);
		const methodType = parsed.success ? parsed.data : null;
		setMeth({
			type: methodType,
			method: meth.method,
		});
	};
	const methodTypes = methods.filter((r) => r.method === meth.method);
	return (
		<form onSubmit={handleSubmitEdit} className="flex flex-col gap-2">
			<Button className="w-fit" variant="secondary">
				Simpan
				{loading ? <Loader2 className="animate-spin" /> : null}
			</Button>
			<label className="flex items-center gap-2">
				<span>Metode:</span>
				<div className="flex items-center gap-3 text-3xl">
					<select value={meth.method} className=" w-fit outline" onChange={handleChangeMethod}>
						{METHODS.map((m) => (
							<option key={m} value={m}>
								{METHOD_NAMES[m]}
							</option>
						))}
					</select>
					{methodTypes.length > 0 ? (
						<select
							value={meth.type ?? "null"}
							className=" w-fit outline"
							onChange={handleChangeMethodType}
						>
							<option value="null">--Pilih--</option>
							{methodTypes.map((m) => (
								<option key={m.id} value={m.id}>
									{m.name}
								</option>
							))}
						</select>
					) : (
						<div className="w-[200px]" />
					)}
				</div>
			</label>
			<label className="flex flex-col gap-1">
				<span>Catatan:</span>
				<Textarea defaultValue={record.note} name="note" />
			</label>
			{error ? <TextError>{error}</TextError> : null}
		</form>
	);
}
