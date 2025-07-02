import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "~/components/ui/table";
import { memo } from "react";
import { GotoProductBtn } from "./GotoProductBtn";
import { Data } from "../../_hooks/use-record";
import { Header } from "./Header";
import { Debt } from "./Debt";
import { ForEach } from "~/components/ForEach";
import { Show } from "~/components/Show";
import { EditDialog } from "./EditDialog";
import { Database } from "~/database";
import { Summary } from "./Summary";
import { LinkProductList } from "./LinkProduct";
import { formatDate, formatTime, getDayName, METHOD_NAMES } from "~/lib/utils";

export const Detail = memo(function ({
	data: { additionals, items, method, record },
	methods,
	role,
	revalidate,
	showCashier,
	context,
}: {
	data: Data;
	methods: DB.Method[];
	role: DB.Role;
	showCashier: boolean;
	revalidate: () => void;
	context: { db: Database };
}) {
	return (
		<div className="flex flex-col gap-2 text-3xl">
			<Header
				showCashier={showCashier}
				cashier={record.cashier}
				mode={record.mode}
				timestamp={record.timestamp}
				role={role}
			/>
			<Debt
				revalidate={revalidate}
				credit={record.credit}
				grandTotal={record.grandTotal}
				timestamp={record.timestamp}
				role={role}
			/>
			<Table className="text-3xl">
				<TableHeader>
					<TableRow>
						<TableHead className="w-[70px]">No</TableHead>
						<TableHead>Nama</TableHead>
						<TableHead className="w-[170px] text-end">Satuan</TableHead>
						<TableHead className="w-[170px] text-end">Modal</TableHead>
						<TableHead className="w-[70px]">Qty</TableHead>
						<TableHead className="w-[170px]  text-end">Total*</TableHead>
						<TableHead className="w-[170px]  text-end">Total</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody className="border-b">
					<ForEach items={items}>
						{(item, i) => (
							<>
								<TableRow>
									<TableCell className="flex items-center">
										{i + 1}
										<Show when={role === "admin"}>
											<LinkProductList item={item} context={context} revalidate={revalidate} />
										</Show>
									</TableCell>
									<TableCell>{item.name}</TableCell>
									<TableCell className="text-end flex items-center gap-1 justify-end">
										<GotoProductBtn mode={record.mode} productId={item.product_id} />
										{item.price.toLocaleString("id-ID")}{" "}
									</TableCell>
									<TableCell className="text-end">{item.capital.toLocaleString("id-ID")}</TableCell>
									<TableCell className="text-center">{item.qty}</TableCell>
									<TableCell className="text-end">{item.total.toLocaleString("id-ID")}</TableCell>
									<TableCell className="text-end">
										{item.grandTotal.toLocaleString("id-ID")}
									</TableCell>
								</TableRow>
								<ForEach items={item.discs}>
									{(disc) => (
										<TableRow>
											<TableCell colSpan={5} className="text-end">
												Diskon {disc.kind === "percent" ? `${disc.value}%` : null}
											</TableCell>
											<TableCell className="text-end">
												{disc.effVal.toLocaleString("id-ID")}
											</TableCell>
										</TableRow>
									)}
								</ForEach>
							</>
						)}
					</ForEach>
				</TableBody>
			</Table>
			<Summary
				additionals={additionals}
				change={record.change}
				discVal={record.disc_val}
				grandTotal={record.grandTotal}
				pay={record.pay}
				rounding={record.rounding}
				totalAfterAdditional={record.totalAfterAdditional}
				totalAfterDiscount={record.totalDiscount}
				totalDiscount={record.totalDiscount}
				totalFromItems={record.totalFromItems}
			/>
			<EditDialog
				credit={record.credit}
				mode={record.mode}
				note={record.note}
				revalidate={revalidate}
				method={method}
				methods={methods}
				timestamp={record.timestamp}
				context={context}
			/>
			<div className="flex flex-col gap-2">
				<p>
					Dibayar: {formatTime(record.paid_at, "long")} | {getDayName(record.paid_at)},{" "}
					{formatDate(record.paid_at, "long")}
				</p>
				<p>
					Metode: {METHOD_NAMES[method.method]} {method.name}
				</p>
				<p>{record.note}</p>
			</div>
		</div>
	);
});
