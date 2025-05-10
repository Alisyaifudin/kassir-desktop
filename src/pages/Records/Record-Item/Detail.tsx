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
import { useDb } from "~/RootLayout";
import { numeric } from "~/lib/utils";
import { Link, useNavigate } from "react-router";
import { Calendar } from "./Calendar";
import { LinkProduct } from "./LinkProduct";
import { useAsync } from "~/hooks/useAsync";
import { Await } from "~/components/Await";
import { Textarea } from "~/components/ui/textarea";
import { z } from "zod";

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
	update,
	role,
}: {
	items: DB.RecordItem[];
	record: DB.Record;
	additionals: DB.Additional[];
	discs: DB.Discount[];
	update: () => void;
	role: "admin" | "user";
}) {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState({ pay: "", calendar: "", edit: "" });
	const db = useDb();
	const [edit, setEdit] = useState(false);
	const navigate = useNavigate();
	const state = useAsync(db.product.getAll(), []);
	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const formData = new FormData(e.currentTarget);
		const parsed = numeric.safeParse(formData.get("pay"));
		if (!parsed.success) {
			setError({ pay: parsed.error.flatten().formErrors.join("; "), calendar: "", edit: "" });
			return;
		}
		const pay = parsed.data;
		const change = new Decimal(pay).sub(record.grand_total).toNumber();
		if (change < 0) {
			setError({ pay: "Bayaran tidak cukup", calendar: "", edit: "" });
			return;
		}
		setLoading(true);
		const [errMsg, now] = await db.record.updateCreditPay(pay, change, record.timestamp);
		if (errMsg) {
			setError({ pay: errMsg, calendar: "", edit: "" });
			setLoading(false);
			return;
		}
		setError({ pay: "", calendar: "", edit: "" });
		await navigate(`/records/${now}`);
		await new Promise((res) => setTimeout(res, 1000));
		update();
		setLoading(false);
	};
	const handleChangeTime = async (time: number) => {
		setLoading(true);
		const [errMsg, now] = await db.record.updateTimestamp(record.timestamp, time);
		if (errMsg) {
			setError({ pay: "", calendar: errMsg, edit: "" });
			setLoading(false);
			return;
		}
		setError({ pay: "", calendar: "", edit: "" });
		await navigate(`/records/${now}`);
		await new Promise((res) => setTimeout(res, 1000));
		update();
		setLoading(false);
	};
	const handleSubmitEdit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const formData = new FormData(e.currentTarget);
		const parsed = z
			.object({ note: z.string(), method: z.enum(["cash", "transfer", "other"]) })
			.safeParse({ note: formData.get("note"), method: formData.get("method") });
		if (!parsed.success) {
			const errs = parsed.error.flatten().fieldErrors;
			setError({
				edit: (errs.method?.join("; ") ?? "") + "; " + (errs.note?.join("; ") ?? ""),
				calendar: "",
				pay: "",
			});
			return;
		}
		setError({ calendar: "", edit: "", pay: "" });
		const { method, note } = parsed.data;
		setLoading(true);
		const errMsg = await db.record.updateNoteAndMethod(record.timestamp, note, method);
		setLoading(false);
		if (errMsg) {
			setError({
				edit: errMsg,
				calendar: "",
				pay: "",
			});
			return;
		}
		update();
		setEdit(false);
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
						<TextError>{error.calendar}</TextError>
						<Calendar time={record.timestamp} setTime={handleChangeTime} />
						{loading ? <Loader2 className="animate-spin" /> : null}
					</div>
				) : null}
			</div>
			{record.credit && role === "admin" ? (
				<form onSubmit={handleSubmit}>
					<label className="flex items-center gap-5">
						<span className="text-red-500">Kredit</span>
						<Input placeholder="Bayaran..." type="number" name="pay" className="w-[200px]" />
						<Button>Bayar {loading ? <Loader2 className="animate-spin" /> : null}</Button>
						<TextError>{error.pay}</TextError>
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
												{(data) => {
													const [errMsg, products] = data;
													if (errMsg) {
														return <TextError>{errMsg}</TextError>;
													}
													return <LinkProduct item={item} products={products} update={update} />;
												}}
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
				{edit || role === "user" ? null : (
					<Button className="w-fit" onClick={() => setEdit(true)} variant="secondary">
						Edit
					</Button>
				)}
				{edit ? (
					<form onSubmit={handleSubmitEdit} className="flex flex-col gap-2">
						{error.edit ? <TextError>{error.edit}</TextError> : null}
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
						<label className="flex flex-col gap-1">
							<span>Catatan:</span>
							<Textarea defaultValue={record.note} name="note" />
						</label>
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
