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
import { calcDisc } from "./Discount";
import { Input } from "../../components/ui/input";
import { useState } from "react";
import { log } from "../../lib/utils";
import { useDb } from "../../Layout";
type RecordListProps = {
	allItems: DB.RecordItem[];
	records: DB.Record[];
	timestamp: number | null;
	mode: "buy" | "sell";
};

function filterData(
	timestamp: number | null,
	allItems: DB.RecordItem[],
	records: DB.Record[]
): { items: DB.RecordItem[] } & ({ record: null } | { record: DB.Record }) {
	if (timestamp === null) {
		return { items: [], record: null };
	}
	const record = records.find((r) => r.timestamp === timestamp);
	if (record === undefined) {
		return { items: [], record: null };
	}
	return {
		items: allItems.filter((item) => item.timestamp === timestamp),
		record,
	};
}

export function ItemList({ allItems, timestamp, records, mode }: RecordListProps) {
	const { items, record } = filterData(timestamp, allItems, records);
	if (record === null) {
		return null;
	}
	if (mode === "buy") {
		return <ItemListBuy items={items} record={record} />;
	}
	return <ItemListSell items={items} record={record} />;
}

function ItemListSell({ items, record }: { items: DB.RecordItem[]; record: DB.Record }) {
	const totalDisc = record === null ? 0 : calcDisc(record.disc_type, record.disc_val, record.total);
	return (
		<div className="flex flex-col gap-2 overflow-auto">
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
								{calcDisc(item.disc_type, item.disc_val, item.subtotal).toLocaleString("id-ID")}
							</TableCell>
							<TableCell className="text-end">{item.subtotal.toLocaleString("id-ID")}</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
			<div className="flex flex-col items-end">
				<div>
					{record.disc_val > 0 ? (
						<>
							<div className="grid grid-cols-[170px_200px]">
								<p className="text-end">Subtotal:</p>
								<p className="text-end">Rp{Number(record.total).toLocaleString("id-ID")}</p>
							</div>
							<div className="grid grid-cols-[170px_200px]">
								<p className="text-end">Diskon:</p>
								<p className="text-end">Rp{totalDisc.toLocaleString("id-ID")}</p>
							</div>
							<hr />
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

function ItemListBuy({ items, record }: { items: DB.RecordItem[]; record: DB.Record }) {
	const totalDisc = record === null ? 0 : calcDisc(record.disc_type, record.disc_val, record.total);
	const [pay, setPay] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<null | string>(null);
	const db = useDb();
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
								{item.capital?.toLocaleString("id-ID")}
							</TableCell>
							<TableCell className="text-center">{item.qty}</TableCell>
							<TableCell className="text-end">
								{calcDisc(item.disc_type, item.disc_val, item.subtotal).toLocaleString("id-ID")}
							</TableCell>
							<TableCell className="text-end">{item.subtotal.toLocaleString("id-ID")}</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
			<div className="flex flex-col items-end">
				<div>
					{record.disc_val > 0 ? (
						<>
							<div className="grid grid-cols-[170px_200px]">
								<p className="text-end">Subtotal:</p>
								<p className="text-end">Rp{Number(record.total).toLocaleString("id-ID")}</p>
							</div>
							<div className="grid grid-cols-[170px_200px]">
								<p className="text-end">Diskon:</p>
								<p className="text-end">Rp{totalDisc.toLocaleString("id-ID")}</p>
							</div>
							<hr />
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
