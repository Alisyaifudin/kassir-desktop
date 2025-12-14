import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "~/components/ui/table";
import { formatDate, formatTime, getDayName } from "~/lib/utils";
import { DeleteBtn } from "./DeleteBtn";
import { memo } from "react";
import type { Money } from "./loader";

export const TableList = memo(function ({ money }: { money: Money[] }) {
	return (
		<Table className="text-normal">
			<TableHeader>
				<TableRow>
					<TableHead className="w-[100px]">No</TableHead>
					<TableHead className="w-[120px] text-center">Hari</TableHead>
					<TableHead className="w-[300px] text-center">Tanggal</TableHead>
					<TableHead className="w-[130px] text-center">Waktu</TableHead>
					<TableHead className="text-right">Nilai</TableHead>
					<TableHead className="text-right w-[100px]"></TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{money.map((m, i) => (
					<TableRow key={m.timestamp}>
						<TableCell className="font-medium">{i + 1}</TableCell>
						<TableCell className="text-center">{getDayName(m.timestamp)}</TableCell>
						<TableCell className="text-center">{formatDate(m.timestamp, "long")}</TableCell>
						<TableCell className="text-center">{formatTime(m.timestamp, "long")}</TableCell>
						<TableCell className="text-right">Rp{m.value.toLocaleString("id-ID")}</TableCell>
						<TableCell>
							<DeleteBtn money={m} />
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
});
