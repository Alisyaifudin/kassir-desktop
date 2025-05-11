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
import { Loader2, Pencil } from "lucide-react";
import { useDB } from "~/RootLayout";
import { numeric } from "~/lib/utils";
import { Link, useNavigate } from "react-router";
import { Calendar } from "./Calendar";
import { LinkProduct } from "./LinkProduct";
import { useAsync } from "~/hooks/useAsync";
import { Await } from "~/components/Await";
import { Textarea } from "~/components/ui/textarea";
import { z } from "zod";
import { useAction } from "~/hooks/useAction";

const meth = {
	cash: "Tunai",
	transfer: "Transfer",
	other: "Lainnya",
};

export function Detail({
	items,
	record,
	additionals,
	discs,
	revalidate,
	role,
}: {
	items: DB.RecordItem[];
	record: DB.Record;
	additionals: DB.Additional[];
	discs: DB.Discount[];
	revalidate: () => void;
	role: "admin" | "user";
}) {
	const db = useDB();
	const [isEdit, setIsEdit] = useState(false);
	const navigate = useNavigate();
	const state = useAsync(() => db.product.getAll());
	const { edit, credit, time } = useActions(record.timestamp);
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
		await new Promise((res) => setTimeout(res, 100));
		revalidate();
	};
	const handleChangeTime = async (newTime: number) => {
		const [errMsg, now] = await time.action(newTime);
		if (errMsg) {
			time.setError(errMsg);
			return;
		}
		time.setError("");
		await navigate(`/records/${now}?tab=detail`);
		await new Promise((res) => setTimeout(res, 100));
		revalidate();
	};
	const handleSubmitEdit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const formData = new FormData(e.currentTarget);
		const parsed = z
			.object({ note: z.string(), method: z.enum(["cash", "transfer", "other"]) })
			.safeParse({ note: formData.get("note"), method: formData.get("method") });
		if (!parsed.success) {
			const errs = parsed.error.flatten().fieldErrors;
			edit.setError({
				method: errs.method?.join("; ") ?? "",
				note: errs.note?.join("; ") ?? "",
			});
			return;
		}
		edit.setError({ method: "", note: "" });
		const errMsg = await edit.action(parsed.data);
		if (errMsg) {
			edit.setError({ method: "", note: errMsg });
		} else {
			revalidate();
			setIsEdit(false);
		}
	};
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
						<Calendar time={record.timestamp} setTime={handleChangeTime} />
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
										{role === "admin" ? (
											<Await state={state}>
												{(products) => (
													<LinkProduct item={item} products={products} update={revalidate} />
												)}
											</Await>
										) : null}
									</TableCell>
									<TableCell>{item.name}</TableCell>
									<TableCell className="text-end flex items-center gap-1 justify-end">
										{record.mode === "buy" && item.product_id !== null ? (
											<>
												<Link to={`/stock/${item.product_id}`}>
													<Pencil />
												</Link>
												<div className="flex-1" />
											</>
										) : null}
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
					<form onSubmit={handleSubmitEdit} className="flex flex-col gap-2">
						<Button className="w-fit" variant="secondary">
							Simpan
						</Button>
						<label className="flex items-center gap-2">
							<span>Metode:</span>
							<select className="w-fit outline" defaultValue={record.method} name="method">
								<option value="cash">Tunai</option>
								<option value="transfer">Transfer</option>
								<option value="other">Lainnya</option>
							</select>
						</label>
						{edit.error?.method ? <TextError>{edit.error.method}</TextError> : null}
						<label className="flex flex-col gap-1">
							<span>Catatan:</span>
							<Textarea defaultValue={record.note} name="note" />
						</label>
						{edit.error?.note ? <TextError>{edit.error.note}</TextError> : null}
					</form>
				) : (
					<div className="flex flex-col gap-2">
						<p>Metode: {meth[record.method]}</p>
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
	const edit = useAction(
		{ method: "", note: "" },
		(data: { note: string; method: "cash" | "transfer" | "other" }) =>
			db.record.updateNoteAndMethod(timestamp, data.note, data.method)
	);
	const credit = useAction("", (data: { pay: number; change: number }) =>
		db.record.updateCreditPay(data.pay, data.change, timestamp)
	);
	const time = useAction("", (newTime: number) => db.record.updateTimestamp(timestamp, newTime));
	return { edit, credit, time };
}
