import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "../../components/ui/table";
import { cn, formatDate, formatTime } from "../../utils";

type RecordListProps = {
	records: DB.Record[];
	selectRecord: (id: number) => () => void;
	selected: number | null;
};

export function RecordList({ records, selected, selectRecord }: RecordListProps) {
	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead className="w-[30px]">No</TableHead>
					<TableHead className="w-[90px] text-center">Tanggal</TableHead>
					<TableHead className="w-[70px] text-center">Waktu</TableHead>
					<TableHead className="text-right">Total</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{records.map((record, i) => (
					<TableRow
						key={i}
						onClick={selectRecord(record.timestamp)}
						className={cn({ "bg-sky-200 hover:bg-sky-100": selected === record.timestamp })}
					>
						<TableCell>{i + 1}</TableCell>
						<TableCell className="text-center">{formatDate(record.timestamp)}</TableCell>
						<TableCell className="text-center">{formatTime(record.timestamp)}</TableCell>
						<TableCell className="text-right">
							{Number(record.total).toLocaleString("id-ID")}
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}
