import { Lock, SquareArrowOutUpRight } from "lucide-react";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "~/components/ui/table";
import { Link, useLocation } from "react-router";
import { DeleteBtn } from "./DeleteBtn";
import { Button } from "~/components/ui/button";
import { TaxItem } from "./TaxItem";
import { useUser } from "~/Layout";
import { formatDate, formatTime, METHOD_NAMES } from "~/lib/utils";
type RecordListProps = {
	allItems: DB.RecordItem[];
	records: DB.Record[];
	allTaxes: DB.Additional[];
	timestamp: number | null;
	methods: DB.MethodType[];
	revalidate: () => void;
};

function filterData(
	timestamp: number | null,
	allItems: DB.RecordItem[],
	allTaxes: DB.Additional[],
	records: DB.Record[]
): { items: DB.RecordItem[]; taxes: DB.Additional[] } & ({ record: null } | { record: DB.Record }) {
	if (timestamp === null) {
		return { items: [], record: null, taxes: [] };
	}
	const record = records.find((r) => r.timestamp === timestamp);
	if (record === undefined) {
		return { items: [], record: null, taxes: [] };
	}
	return {
		items: allItems.filter((item) => item.timestamp === timestamp),
		record,
		taxes: allTaxes.filter((item) => item.timestamp === timestamp),
	};
}

export function ItemList({
	allItems,
	timestamp,
	records,
	allTaxes,
	revalidate,
	methods,
}: RecordListProps) {
	const { items, record, taxes } = filterData(timestamp, allItems, allTaxes, records);
	if (record === null) {
		return null;
	}
	return (
		<List items={items} record={record} taxes={taxes} revalidate={revalidate} methods={methods} />
	);
}

function List({
	items,
	record,
	taxes,
	revalidate,
	methods,
}: {
	items: DB.RecordItem[];
	record: DB.Record;
	taxes: DB.Additional[];
	methods: DB.MethodType[];
	revalidate: () => void;
}) {
	const { pathname, search } = useLocation();
	const path = encodeURIComponent(`${pathname}${search}`);
	const user = useUser();
	if (items.length === 0) {
		return <DeleteBtn revalidate={revalidate} timestamp={record.timestamp} />;
	}
	const methodType = methods.find((m) => m.id === record.method_type);
	const methodTypeName = methodType === undefined ? "" : " " + methodType.name;
	return (
		<div className="flex flex-col gap-2 overflow-auto">
			<div className="flex items-center gap-2 justify-between">
				<p>No: {record.timestamp}</p>
				<div className="flex items-center gap-5">
					<p>
						{formatTime(record.timestamp, "long")}, {formatDate(record.timestamp, "long")}
					</p>
					{record.cashier ? <p>Kasir: {record.cashier}</p> : null}
				</div>
			</div>
			<Table className="text-3xl">
				<TableHeader>
					<TableRow>
						<TableHead className="w-[70px]">No</TableHead>
						<TableHead>Nama</TableHead>
						<TableHead className="w-[160px] text-end">Satuan</TableHead>
						<TableHead className="w-[160px] text-end">Modal</TableHead>
						<TableHead className="w-[70px]">Qty</TableHead>
						<TableHead className="w-[160px]  text-end">Total*</TableHead>
						<TableHead className="w-[160px]  text-end">Total</TableHead>
						<TableHead className="w-[50px]">
							<Link to={`/records/${record.timestamp}`}>
								<SquareArrowOutUpRight size={35} />
							</Link>
						</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody className="border-b">
					{items.map((item, i) => (
						<TableRow key={i}>
							<TableCell className="flex items-center">
								{i + 1}
								{item.product_id === null ? "" : <Lock />}
							</TableCell>
							<TableCell>{item.name}</TableCell>
							<TableCell className="text-end">{item.price.toLocaleString("id-ID")}</TableCell>
							<TableCell className="text-end">{item.capital.toLocaleString("id-ID")}</TableCell>
							<TableCell className="text-center">{item.qty}</TableCell>
							<TableCell className="text-end">
								{item.total_before_disc.toLocaleString("id-ID")}
							</TableCell>
							<TableCell className="text-end">{item.total.toLocaleString("id-ID")}</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
			<div className="flex flex-col items-end">
				{record.disc_val > 0 ? (
					<>
						<div className="grid grid-cols-[170px_200px]">
							<p className="text-end">Subtotal:</p>
							<p className="text-end">Rp{record.total_before_disc.toLocaleString("id-ID")}</p>
						</div>
						<div className="grid grid-cols-[170px_200px]">
							<p className="text-end">Diskon:</p>
							<p className="text-end">
								Rp{(record.total_before_disc - record.total_after_disc).toLocaleString("id-ID")}
							</p>
						</div>
						<hr />
						<div className="grid grid-cols-[170px_200px]">
							<div></div>{" "}
							<p className="text-end">Rp{record.total_after_disc.toLocaleString("de-DE")}</p>
						</div>
					</>
				) : null}
				{taxes.length > 0 ? (
					<>
						{taxes.map((tax) => (
							<TaxItem key={tax.id} tax={tax} total={record.total_after_disc} />
						))}
						<hr className="w-full" />
						<div className="grid grid-cols-[170px_200px]">
							<div></div>{" "}
							<p className="text-end">Rp{record.total_after_tax.toLocaleString("de-DE")}</p>
						</div>
					</>
				) : null}
				{record.rounding ? (
					<div className="grid grid-cols-[170px_200px]">
						<p className="text-end">Pembulatan:</p>
						<p className="text-end">Rp{record.rounding.toLocaleString("id-ID")}</p>
					</div>
				) : null}
				<div className="grid grid-cols-[170px_200px]">
					<p className="text-end">Total:</p>
					<p className="text-end">Rp{Number(record.grand_total).toLocaleString("id-ID")}</p>
				</div>
				<div className="grid grid-cols-[1fr_170px_200px]">
					<p className="pr-5">
						({METHOD_NAMES[record.method]}
						{methodTypeName})
					</p>
					<p className="text-end">Pembayaran:</p>
					<p className="text-end">Rp{Number(record.pay).toLocaleString("id-ID")}</p>
				</div>
				<div className="grid grid-cols-[170px_200px]">
					<p className="text-end">Kembalian:</p>{" "}
					<p className="text-end">Rp{Number(record.change).toLocaleString("id-ID")}</p>
				</div>
			</div>
			{record.note !== "" ? (
				<div>
					<p>Catatan:</p>
					<p>{record.note}</p>
				</div>
			) : null}
			<div className="pt-20 flex justify-between w-full">
				<Button asChild>
					<Link
						to={{
							pathname: `/records/${record.timestamp}`,
							search: `?url_back=${path}`,
						}}
					>
						Lihat
					</Link>
				</Button>
				{user.role === "admin" ? (
					<DeleteBtn revalidate={revalidate} timestamp={record.timestamp} />
				) : null}
			</div>
		</div>
	);
}
