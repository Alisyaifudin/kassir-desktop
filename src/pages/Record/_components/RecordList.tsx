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
import { useSize } from "~/hooks/use-size";
import { style } from "~/lib/style";

const localStyle = {
	big: {
		no: {
			width: "30px",
		},
		cashier: {
			width: "200px",
		},
		total: {
			width: "70px",
		},
	},
	small: {
		no: {
			width: "10px",
		},
		cashier: {
			width: "100px",
		},
		total: {
			width: "30px",
		},
	},
};

type RecordListProps = {
	records: RecordTransform[];
};

export function RecordList({ records }: RecordListProps) {
	const [search, setSearch] = useSearchParams();
	const selected = getParam(search).selected;
	const setSelected = (clicked: number) => setParam(setSearch).selected(clicked, selected);
	const size = useSize();
	return (
		<Table style={style[size].text}>
			<TableHeader>
				<TableRow>
					<TableHead style={localStyle[size].no}>No</TableHead>
					<TableHead style={localStyle[size].cashier} className="text-center">Kasir</TableHead>
					<TableHead style={localStyle[size].cashier} className="text-center">Waktu</TableHead>
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
