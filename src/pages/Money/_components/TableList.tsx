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
import { useSize } from "~/hooks/use-size";
import { style } from "~/lib/style";

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
	const size = useSize();
	return (
		<Table className="text-3xl">
			<TableHeader>
				<TableRow>
					<TableHead style={style[size].text} className="w-[100px]">
						No
					</TableHead>
					<TableHead style={style[size].text} className="w-[120px] text-center">
						Hari
					</TableHead>
					<TableHead style={style[size].text} className="w-[300px] text-center">
						Tanggal
					</TableHead>
					<TableHead style={style[size].text} className="w-[130px] text-center">
						Waktu
					</TableHead>
					{kind === "debt" ? (
						<TableHead style={style[size].text} className="text-right">
							Selisih
						</TableHead>
					) : null}
					<TableHead style={style[size].text} className="text-right">
						Nilai
					</TableHead>
					<TableHead style={style[size].text} className="text-right w-[100px]"></TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{vals.map((m, i) => (
					<TableRow key={m.timestamp}>
						<TableCell style={style[size].text} className="font-medium">
							{i + 1}
						</TableCell>
						<TableCell style={style[size].text} className="text-center">
							{getDayName(m.timestamp)}
						</TableCell>
						<TableCell style={style[size].text} className="text-center">
							{formatDate(m.timestamp, "long")}
						</TableCell>
						<TableCell style={style[size].text} className="text-center">
							{formatTime(m.timestamp, "long")}
						</TableCell>
						{kind === "debt" ? (
							<TableCell style={style[size].text} className="text-right">
								{i + 1 < vals.length
									? `Rp${new Decimal(m.value)
											.sub(vals[i + 1].value)
											.toNumber()
											.toLocaleString("id-ID")}`
									: "-"}
							</TableCell>
						) : null}
						<TableCell style={style[size].text} className="text-right">
							Rp{m.value.toLocaleString("id-ID")}
						</TableCell>
						<TableCell>
							<DeleteBtn money={m} setSearch={setSearch} revalidate={revalidate} db={db} />
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
});
