import { Loader2, SquareArrowOutUpRight } from "lucide-react";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "../../components/ui/table";
import { Link } from "react-router";
import { DeleteBtn } from "./DeleteBtn";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { useState } from "react";
import { log } from "../../lib/utils";
import { useDb } from "../../Layout";
import { TaxItem } from "./TaxItem";
type RecordListProps = {
	allItems: DB.RecordItem[];
	records: DB.Record[];
	allTaxes: DB.Other[];
	timestamp: number | null;
	mode: "buy" | "sell";
};

function filterData(
	timestamp: number | null,
	allItems: DB.RecordItem[],
	allTaxes: DB.Other[],
	records: DB.Record[]
): { items: DB.RecordItem[]; taxes: DB.Other[] } & ({ record: null } | { record: DB.Record }) {
	if (timestamp === null) {
		return { items: [], record: null, taxes: [] };
	}
	const record = records.find((r) => r.timestamp === timestamp);
	if (record === undefined) {
		return { items: [], record: null, taxes: [] };
	}
	return {
		items: allItems.filter((item) => item.timestamp === timestamp),
		record,
		taxes: allTaxes.filter((item) => item.timestamp === timestamp),
	};
}

export function ItemList({ allItems, timestamp, records, mode, allTaxes }: RecordListProps) {
	const { items, record, taxes } = filterData(timestamp, allItems, allTaxes, records);
	if (record === null) {
		return null;
	}
	if (mode === "buy") {
		return <ItemListBuy items={items} record={record} taxes={taxes} />;
	}
	return <ItemListSell items={items} record={record} taxes={taxes} />;
}

const meth = {
	cash: "Tunai",
	transfer: "Transfer",
	emoney: "Lainnya",
};

function ItemListSell({
	items,
	record,
	taxes,
}: {
	items: DB.RecordItem[];
	record: DB.Record;
	taxes: DB.Other[];
}) {
	if (items.length === 0) {
		return <DeleteBtn timestamp={record.timestamp} />;
	}
	return (
		<div className="flex flex-col gap-2 overflow-auto">
			<div className="flex items-center gap-2">
				<p>No: {record.timestamp}</p>
				{record.cashier ? (
					<>
						<div className="border-left h-full border" />
						<p>Kasir: {record.cashier}</p>
					</>
				) : null}
			</div>
			<Table className="text-3xl">
				<TableHeader>
					<TableRow>
						<TableHead className="w-[50px]">No</TableHead>
						<TableHead>Nama</TableHead>
						<TableHead className="w-[140px] text-end">Satuan</TableHead>
						<TableHead className="w-[70px]">Qty</TableHead>
						<TableHead className="w-[140px]  text-end">Diskon</TableHead>
						<TableHead className="w-[140px]  text-end">Total</TableHead>
						<TableHead className="w-[50px]">
							<Link to={`/records/${record.timestamp}`}>
								<SquareArrowOutUpRight size={35} />
							</Link>
						</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody className="border-b">
					{items.map((item, i) => (
						<TableRow key={i}>
							<TableCell>{i + 1}</TableCell>
							<TableCell>{item.name}</TableCell>
							<TableCell className="text-end">{item.price.toLocaleString("id-ID")}</TableCell>
							<TableCell className="text-center">{item.qty}</TableCell>
							<TableCell className="text-end">
								{item.total_before_disc.toLocaleString("id-ID")}
							</TableCell>
							<TableCell className="text-end">{item.total.toLocaleString("id-ID")}</TableCell>
						</TableRow>
					))}
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
								Rp{(record.total_after_disc - record.total_before_disc).toLocaleString("id-ID")}
							</p>
						</div>
						<hr />
						<div className="grid grid-cols-[170px_200px]">
							<div></div>{" "}
							<p className="text-end">Rp{record.total_after_disc.toLocaleString("de-DE")}</p>
						</div>
					</>
				) : null}
				{taxes.length > 0 ? (
					<>
						{taxes.map((tax) => (
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
			<div className="pt-20 flex justify-between w-full">
				<Button asChild>
					<Link to={`/records/${record.timestamp}`}>Lihat</Link>
				</Button>
				<DeleteBtn timestamp={record.timestamp} />
			</div>
		</div>
	);
}

function ItemListBuy({
	items,
	record,
	taxes,
}: {
	items: DB.RecordItem[];
	record: DB.Record;
	taxes: DB.Other[];
}) {
	const [pay, setPay] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<null | string>(null);
	const db = useDb();
	if (items.length === 0) {
		return <DeleteBtn timestamp={record.timestamp} />;
	}
	const handlePay = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		if (Number.isNaN(pay) || Number(pay) < record.grand_total) {
			return;
		}
		setError(null);
		setLoading(true);
		try {
			const result = await db.record.updateCreditPay(Number(pay), record.timestamp);
			setLoading(false);
			if (result !== null) {
				setError(result);
			} else {
				setError(null);
			}
		} catch (err) {
			setError("Aplikasi bermasalah");
			log.error(String(err));
		}
		setLoading(false);
	};
	return (
		<div className="flex flex-col gap-2 overflow-auto">
			<div className="flex gap-2 items-center">
				<p>No: {record.timestamp}</p>
				{record.cashier ? (
					<>
						<div className="border-left h-full border" />
						<p>Kasir: {record.cashier}</p>
					</>
				) : null}
			</div>
			{record.credit === 1 ? (
				<form onSubmit={handlePay} className="flex items-center gap-2 w-full max-w-[400px] py-1">
					<p className="bg-red-500 w-fit px-2 text-white">Kredit</p>
					<Input value={pay} onChange={(e) => setPay(e.currentTarget.value)} type="number" />
					<Button disabled={Number(pay) < record.grand_total}>
						Bayar {loading ? <Loader2 className="animate-spin" /> : null}
					</Button>
				</form>
			) : null}
			{error ? <p>{error}</p> : null}
			<Table className="text-3xl">
				<TableHeader>
					<TableRow>
						<TableHead className="w-[50px]">No</TableHead>
						<TableHead>Nama</TableHead>
						<TableHead className="w-[140px] text-end">Satuan</TableHead>
						<TableHead className="w-[140px] text-end">Modal</TableHead>
						<TableHead className="w-[70px]">Qty</TableHead>
						<TableHead className="w-[140px]  text-end">Diskon</TableHead>
						<TableHead className="w-[140px]  text-end">Total</TableHead>
						<TableHead className="w-[50px]">
							<Link to={`/records/${record.timestamp}`}>
								<SquareArrowOutUpRight size={35} />
							</Link>
						</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody className="border-b">
					{items.map((item, i) => (
						<TableRow key={i}>
							<TableCell>{i + 1}</TableCell>
							<TableCell>{item.name}</TableCell>
							<TableCell className="text-end">{item.price.toLocaleString("id-ID")}</TableCell>
							<TableCell className="w-[150px] text-end">
								{item.capital.toLocaleString("id-ID")}
							</TableCell>
							<TableCell className="text-center">{item.qty}</TableCell>
							<TableCell className="text-end">
								{item.total_before_disc.toLocaleString("id-ID")}
							</TableCell>
							<TableCell className="text-end">{item.total.toLocaleString("id-ID")}</TableCell>
						</TableRow>
					))}
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
								Rp{(record.total_after_disc - record.total_before_disc).toLocaleString("id-ID")}
							</p>
						</div>
						<hr />
					</>
				) : null}
				{taxes.length > 0 ? (
					<>
						<div className="grid grid-cols-[100px_100px]">
							<p></p>{" "}
							<p className="text-end">Rp{record.total_after_disc.toLocaleString("de-DE")}</p>
						</div>
						{taxes.map((tax) => (
							<TaxItem key={tax.id} tax={tax} total={record.total_after_disc} />
						))}
						<hr className="w-full" />
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
					<p className="text-end">
						Rp{(record.credit === 0 ? record.pay : Number(pay)).toLocaleString("id-ID")}
					</p>
				</div>
				<div className="grid grid-cols-[170px_200px]">
					<p className="text-end">Kembalian:</p>{" "}
					<p className="text-end">
						Rp
						{(
							(record.credit === 0 ? record.pay : Number(pay)) - Number(record.grand_total)
						).toLocaleString("id-ID")}
					</p>
				</div>
				<div className="pt-20 flex justify-between w-full">
					<Button asChild>
						<Link to={`/records/${record.timestamp}`}>Lihat</Link>
					</Button>
					<DeleteBtn timestamp={record.timestamp} />
				</div>
			</div>
		</div>
	);
}
