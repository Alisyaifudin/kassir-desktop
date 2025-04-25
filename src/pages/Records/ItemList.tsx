import { SquareArrowOutUpRight } from "lucide-react";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "../../components/ui/table";
import { Link } from "react-router";
import Decimal from "decimal.js";
import { DeleteBtn } from "./DeleteBtn";
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
	return (
		<div className="flex flex-col gap-2 overflow-auto">
			<Table className="text-3xl">
				<TableHeader>
					<TableRow>
						<TableHead className="w-[50px]">No</TableHead>
						<TableHead>Nama</TableHead>
						<TableHead className="w-[70px]">Qty</TableHead>
						<TableHead className="w-[150px] text-end">Diskon</TableHead>
						<TableHead className="w-[150px] text-end">Total</TableHead>
						{mode === "buy" ? <TableHead className="w-[150px] text-end">Modal</TableHead> : null}
						<TableHead className="w-[50px]">
							{timestamp === null ? null : (
								<Link to={`/records/${timestamp}`}>
									<SquareArrowOutUpRight size={35} />
								</Link>
							)}
						</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody className="border-b">
					{items.map((item, i) => (
						<TableRow key={i}>
							<TableCell>{i + 1}</TableCell>
							<TableCell>{item.name}</TableCell>
							<TableCell className="text-center">{item.qty}</TableCell>
							<TableCell className="text-end">
								{calcDisc(item.disc_type, item.disc_val, item.subtotal)}
							</TableCell>
							<TableCell className="text-end">{item.subtotal.toLocaleString("id-ID")}</TableCell>
							{mode === "buy" ? (
								<TableCell className="w-[150px] text-end">{item.capital}</TableCell>
							) : null}
						</TableRow>
					))}
				</TableBody>
			</Table>
			{record === null ? null : (
				<div className="flex flex-col items-end">
					<div className="grid grid-cols-[170px_200px]">
						<p className="text-end">Total:</p>
						<p className="text-end">Rp{Number(record.total).toLocaleString("de-DE")}</p>
					</div>
					<div className="grid grid-cols-[170px_200px]">
						<p className="text-end">Pembayaran:</p>
						<p className="text-end">Rp{Number(record.pay).toLocaleString("de-DE")}</p>
					</div>
					<div className="grid grid-cols-[170px_200px]">
						<p className="text-end">Kembalian:</p>{" "}
						<p className="text-end">Rp{Number(record.change).toLocaleString("de-DE")}</p>
					</div>
					<div className="pt-20">
						<DeleteBtn timestamp={record.timestamp} />
					</div>
				</div>
			)}
		</div>
	);
}

function calcDisc(type: "number" | "percent", value: number, subtotal: number) {
	switch (type) {
		case "number":
			return value;
		case "percent":
			return new Decimal(subtotal).times(value).div(100).toNumber();
	}
}
