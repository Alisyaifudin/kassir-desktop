import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "../../../components/ui/table";
export function ItemList({ items, record }: { record: DB.Record; items: DB.RecordItem[] }) {
	return (
		<div>
			<p>Total {record.total}</p>
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead className="w-[50px]">No</TableHead>
						<TableHead>Nama</TableHead>
						<TableHead className="w-[200px]">Total</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{items.map((item, i) => (
						<TableRow key={i}>
							<TableCell>{i + 1}</TableCell>
							<TableCell>{item.name ?? ""}</TableCell>
							<TableCell>{item.subtotal}</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
}
