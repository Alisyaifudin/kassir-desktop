import Decimal from "decimal.js";
import { SetURLSearchParams } from "react-router";
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
import { Database } from "~/database";
import { memo } from "react";

export const TableList = memo(function ({
	money,
	kind,
	setSearch,
	revalidate,
	db,
}: {
	money: DB.Money[];
	kind: "saving" | "debt" | "diff";
	setSearch: SetURLSearchParams;
	revalidate: () => void;
	db: Database;
}) {
	const vals = money.filter((m) => m.kind === kind);
	return (
		<Table className="text-3xl">
			<TableHeader>
				<TableRow>
					<TableHead className="w-[100px]">No</TableHead>
					<TableHead className="w-[120px] text-center">Hari</TableHead>
					<TableHead className="w-[200px] text-center">Tanggal</TableHead>
					<TableHead className="w-[130px] text-center">Waktu</TableHead>
					{kind !== "diff" ? <TableHead className="text-right">Selisih</TableHead> : null}
					<TableHead className="text-right">Nilai</TableHead>
					<TableHead className="text-right w-[100px]"></TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{vals.map((m, i) => (
					<TableRow key={m.timestamp}>
						<TableCell className="font-medium">{i + 1}</TableCell>
						<TableCell className="text-center">{getDayName(m.timestamp)}</TableCell>
						<TableCell className="text-center">{formatDate(m.timestamp, "long")}</TableCell>
						<TableCell className="text-center">{formatTime(m.timestamp, "long")}</TableCell>
						{kind !== "diff" ? (
							<TableCell className="text-right">
								{i + 1 < vals.length
									? `Rp${new Decimal(m.value)
											.sub(vals[i + 1].value)
											.toNumber()
											.toLocaleString("id-ID")}`
									: "-"}
							</TableCell>
						) : null}
						<TableCell className="text-right">Rp{m.value.toLocaleString("id-ID")}</TableCell>
						<TableCell>
							<DeleteBtn money={m} setSearch={setSearch} revalidate={revalidate} db={db} />
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
});
