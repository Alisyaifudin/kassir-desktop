import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "../../components/ui/table";
type RecordListProps = {
	allItems: DB.RecordItem[];
	recordId: number | null;
};

export function ItemList({ allItems, recordId }: RecordListProps) {
	const items = recordId === null ? [] : allItems.filter((item) => item.record_id === recordId);
	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead className="w-[50px]">No</TableHead>
					<TableHead className="w-[200px]">Waktu</TableHead>
					<TableHead>Total</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{items.map((record, i) => (
					<TableRow key={i}>
						<TableCell>{i + 1}</TableCell>
						<TableCell>{record.time ?? ""}</TableCell>
						<TableCell>{record.name}</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}
