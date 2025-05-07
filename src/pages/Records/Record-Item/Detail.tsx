import { Fragment } from "react/jsx-runtime";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "../../../components/ui/table";
import { TaxItem } from "../TaxItem";
import Decimal from "decimal.js";
import { Input } from "../../../components/ui/input";
import { Button } from "../../../components/ui/button";
import { useState } from "react";
import { TextError } from "../../../components/TextError";
import { Loader2 } from "lucide-react";
import { useDb } from "../../../RootLayout";
import { numeric } from "../../../lib/utils";

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
}: {
	items: DB.RecordItem[];
	record: DB.Record;
	additionals: DB.Additional[];
	discs: DB.Discount[];
	update: () => void;
}) {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const db = useDb();
	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();

		const formData = new FormData(e.currentTarget);
		const parsed = numeric.safeParse(formData.get("pay"));
		if (!parsed.success) {
			setError(parsed.error.flatten().formErrors.join("; "));
			return;
		}
		const pay = parsed.data;
		const change = new Decimal(pay).sub(record.grand_total).toNumber();
		if (change < 0) {
			setError("Bayaran tidak cukup");
			return;
		}
		setLoading(true);
		const errMsg = await db.record.updateCreditPay(pay, change, record.timestamp);
		setLoading(false);
		if (errMsg) {
			setError(errMsg);
			return;
		}
		setError("");
		update();
	};
	return (
		<div className="flex flex-col gap-2 text-3xl">
			<div className="flex items-center gap-2">
				<p>No: {record.timestamp}</p>
				{record.cashier ? (
					<>
						<div className="border-left h-full border" />
						<p>Kasir: {record.cashier}</p>
					</>
				) : null}
			</div>
			{record.credit ? (
				<form onSubmit={handleSubmit}>
					<label className="flex items-center gap-5">
						<span className="text-red-500">Kredit</span>
						<Input placeholder="Bayaran..." type="number" name="pay" className="w-[200px]" />
						<Button>Bayar {loading ? <Loader2 className="animate-spin" /> : null}</Button>
						<TextError>{error}</TextError>
					</label>
				</form>
			) : null}
			<Table className="text-3xl">
				<TableHeader>
					<TableRow>
						<TableHead className="w-[50px]">No</TableHead>
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
									<TableCell>{i + 1}</TableCell>
									<TableCell>{item.name}</TableCell>
									<TableCell className="text-end">{item.price.toLocaleString("id-ID")}</TableCell>
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
				<div className="grid grid-cols-[150px_170px_200px]">
					<p>({meth[record.method]})</p>
					<p className="text-end">Pembayaran:</p>
					<p className="text-end">Rp{Number(record.pay).toLocaleString("id-ID")}</p>
				</div>
				<div className="grid grid-cols-[170px_200px]">
					<p className="text-end">Kembalian:</p>{" "}
					<p className="text-end">Rp{Number(record.change).toLocaleString("id-ID")}</p>
				</div>
			</div>
			{record.note !== "" ? (
				<div>
					<p>Catatan:</p>
					<p>{record.note}</p>
				</div>
			) : null}
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
