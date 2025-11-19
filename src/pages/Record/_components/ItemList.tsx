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
import { capitalize, formatDate, formatTime } from "~/lib/utils";
import { Summary } from "~/lib/record";
import { useUser } from "~/hooks/use-user";
import { Show } from "~/components/Show";
import { DEFAULT_METHOD } from "~/lib/constants";
import { ForEach } from "~/components/ForEach";
import { Footer } from "./Footer";
import type { Context } from "../Records";
import { useSize } from "~/hooks/use-size";
import { style } from "~/lib/style";

const localStyle = {
	big: {
		// no: {
		// 	width: "160px",
		// },
		small: {
			width: "70px",
		},
		big: {
			width: "160px",
		},
	},
	small: {
		small: {
			width: "40px",
		},
		big: {
			width: "100px",
		},
	},
};

type RecordListProps = {
	allItems: Summary["items"];
	records: Summary["record"][];
	allAdditionals: Summary["additionals"];
	timestamp: number | null;
	methods: DB.Method[];
	revalidate: () => void;
	context: Context;
};

function filterData(
	timestamp: number | null,
	allItems: Summary["items"],
	allAdditionals: Summary["additionals"],
	records: Summary["record"][]
): {
	items: Summary["items"];
	additionals: Summary["additionals"];
	record: Summary["record"] | null;
} {
	if (timestamp === null) {
		return { items: [], record: null, additionals: [] };
	}
	const record = records.find((r) => r.timestamp === timestamp);
	if (record === undefined) {
		return { items: [], record: null, additionals: [] };
	}
	return {
		items: allItems.filter((item) => item.timestamp === timestamp),
		record,
		additionals: allAdditionals.filter((item) => item.timestamp === timestamp),
	};
}

export function ItemList({
	allItems,
	timestamp,
	records,
	allAdditionals: allTaxes,
	revalidate,
	methods,
	context,
}: RecordListProps) {
	const { items, record, additionals } = filterData(timestamp, allItems, allTaxes, records);
	if (record === null) {
		return null;
	}
	return (
		<List
			items={items}
			record={record}
			additionals={additionals}
			revalidate={revalidate}
			methods={methods}
			context={context}
		/>
	);
}

function List({
	items,
	record,
	additionals,
	revalidate,
	methods,
	context,
}: {
	items: Summary["items"];
	record: Summary["record"];
	additionals: Summary["additionals"];
	methods: DB.Method[];
	revalidate: () => void;
	context: Context;
}) {
	const size = useSize();
	const { pathname, search } = useLocation();
	const path = encodeURIComponent(`${pathname}${search}`);
	const user = useUser();
	const method = methods.find((m) => m.id === record.method_id) ?? DEFAULT_METHOD;
	return (
		<Show
			when={items.length !== 0 || additionals.length !== 0}
			fallback={
				<DeleteBtn revalidate={revalidate} timestamp={record.timestamp} context={context} />
			}
		>
			<div className="flex flex-col gap-2 overflow-auto">
				<div style={style[size].text} className="flex items-center gap-2 justify-between">
					<p>No: {record.timestamp}</p>
					<div className="flex items-center gap-5">
						<p>
							{formatTime(record.timestamp, "long")}, {formatDate(record.timestamp, "long")}
						</p>
						{record.cashier ? <p>Kasir: {capitalize(record.cashier)}</p> : null}
					</div>
				</div>
				<Table style={style[size].text}>
					<TableHeader>
						<TableRow>
							<TableHead style={localStyle[size].small}>No</TableHead>
							<TableHead>Nama</TableHead>
							<TableHead style={localStyle[size].big} className="text-end">
								Satuan
							</TableHead>
							<TableHead style={localStyle[size].big} className="text-end">
								Modal
							</TableHead>
							<TableHead style={localStyle[size].small}>Qty</TableHead>
							<TableHead style={localStyle[size].big} className="text-end">
								Total*
							</TableHead>
							<TableHead style={localStyle[size].big} className="text-end">
								Total
							</TableHead>
							<TableHead className="w-[50px]">
								<Link to={`/records/${record.timestamp}`}>
									<SquareArrowOutUpRight size={35} />
								</Link>
							</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody className="border-b">
						<ForEach items={items}>
							{(item, i) => (
								<TableRow>
									<TableCell className="flex items-center">
										{i + 1}
										{item.product_id === null ? "" : <Lock />}
									</TableCell>
									<TableCell>{item.name}</TableCell>
									<TableCell className="text-end">{item.price.toLocaleString("id-ID")}</TableCell>
									<TableCell className="text-end">{item.capital.toLocaleString("id-ID")}</TableCell>
									<TableCell className="text-center">{item.qty}</TableCell>
									<TableCell className="text-end">{item.total.toLocaleString("id-ID")}</TableCell>
									<TableCell className="text-end">
										{item.grandTotal.toLocaleString("id-ID")}
									</TableCell>
								</TableRow>
							)}
						</ForEach>
					</TableBody>
				</Table>
				<Footer additionals={additionals} method={method} record={record} />
				<Show when={record.customer_phone !== "" && record.customer_name !== ""}>
					<p style={style[size].text}>
						Pelanggan: {record.customer_name} ({record.customer_phone})
					</p>
				</Show>
				<Show when={record.note !== ""}>
					<div style={style[size].text}>
						<p>Catatan:</p>
						<p>{record.note}</p>
					</div>
				</Show>
				<NavBtn
					path={path}
					revalidate={revalidate}
					role={user.role}
					timestamp={record.timestamp}
					context={context}
				/>
			</div>
		</Show>
	);
}

function NavBtn({
	timestamp,
	path,
	role,
	revalidate,
	context,
}: {
	path: string;
	timestamp: number;
	role: DB.Role;
	revalidate: () => void;
	context: Context;
}) {
	return (
		<div className="pt-20 flex justify-between w-full">
			<Button asChild>
				<Link
					to={{
						pathname: `/records/${timestamp}`,
						search: `?url_back=${path}`,
					}}
				>
					Lihat
				</Link>
			</Button>
			<Show when={role === "admin"}>
				<DeleteBtn revalidate={revalidate} timestamp={timestamp} context={context} />
			</Show>
		</div>
	);
}
