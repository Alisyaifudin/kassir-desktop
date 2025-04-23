import { Eye } from "lucide-react";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "../../components/ui/table";
import { Button } from "../../components/ui/button";
import { Link } from "react-router";

type RecordListProps = {
	records: DB.Record[];
};

export function RecordList({ records }: RecordListProps) {
	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead className="w-[50px]">No</TableHead>
					<TableHead className="w-[200px]">Waktu</TableHead>
					<TableHead>Total</TableHead>
					<TableHead className="w-[50px]"></TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{records.map((record, i) => (
					<TableRow key={i}>
						<TableCell>{i + 1}</TableCell>
						<TableCell>{record.time ?? ""}</TableCell>
						<TableCell>{record.total}</TableCell>
						<TableCell>
							<Button variant="link" className="p-0" asChild>
								<Link to={`/records/${record.id}`}>
									<Eye />
								</Link>
							</Button>
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}
