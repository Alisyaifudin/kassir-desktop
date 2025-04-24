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
type RecordListProps = {
	allItems: DB.RecordItem[];
	records: DB.Record[];
	timestamp: number | null;
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

export function ItemList({ allItems, timestamp, records }: RecordListProps) {
	const { items, record } = filterData(timestamp, allItems, records);
	return (
		<div className="flex flex-col gap-2 overflow-auto">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead className="w-[50px]">No</TableHead>
						<TableHead className="w-[200px]">Nama</TableHead>
						<TableHead className="flex justify-between items-center">
							Total
							{timestamp === null ? null : (
								<Link to={`/records/${timestamp}`}>
									<SquareArrowOutUpRight />
								</Link>
							)}
						</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody className="border-b">
					{items.map((record, i) => (
						<TableRow key={i}>
							<TableCell>{i + 1}</TableCell>
							<TableCell>{record.timestamp}</TableCell>
							<TableCell>{record.name}</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
			{record === null ? null : (
				<div className="flex gap-2 flex-col items-end">
					<div className="grid grid-cols-[100px_100px]">
						<p>Total:</p>{" "}
						<p className="text-end">Rp{Number(record.total).toLocaleString("de-DE")}</p>
					</div>
					<div className="grid grid-cols-[100px_100px]">
						<p>Pembayaran:</p>{" "}
						<p className="text-end">Rp{Number(record.pay).toLocaleString("de-DE")}</p>
					</div>
					<div className="grid grid-cols-[100px_100px]">
						<p>Kembalian:</p>{" "}
						<p className="text-end">Rp{Number(record.change).toLocaleString("de-DE")}</p>
					</div>
				</div>
			)}
		</div>
	);
}
