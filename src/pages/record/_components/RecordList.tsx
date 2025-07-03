import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "~/components/ui/table";
import { capitalize, cn, formatTime } from "~/lib/utils";
import { RecordTransform } from "~/lib/record";
import { ForEach } from "~/components/ForEach";
import { getParam, setParam } from "../_utils/params";
import { useSearchParams } from "react-router";

type RecordListProps = {
	records: RecordTransform[];
};

export function RecordList({ records }: RecordListProps) {
	const [search, setSearch] = useSearchParams();
	const selected = getParam(search).selected;
	const setSelected = (clicked: number) => setParam(setSearch).selected(clicked, selected);
	return (
		<Table className="text-3xl">
			<TableHeader>
				<TableRow>
					<TableHead className="w-[30px]">No</TableHead>
					<TableHead className="w-[200px] text-center">Kasir</TableHead>
					<TableHead className="w-[70px] text-center">Waktu</TableHead>
					<TableHead className="text-right">Total</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				<ForEach items={records}>
					{(record, i) => (
						<TableRow
							onClick={() => setSelected(record.timestamp)}
							className={cn(
								{ "bg-sky-200 hover:bg-sky-100": selected === record.timestamp },
								{ "bg-red-300": record.credit === 1 }
							)}
						>
							<TableCell>{i + 1}</TableCell>
							<TableCell className="text-center">{capitalize(record.cashier)}</TableCell>
							<TableCell className="text-center">{formatTime(record.timestamp)}</TableCell>
							<TableCell className="text-right">
								{record.grandTotal.toLocaleString("id-ID")}
							</TableCell>
						</TableRow>
					)}
				</ForEach>
			</TableBody>
		</Table>
	);
}
