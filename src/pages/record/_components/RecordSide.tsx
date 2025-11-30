import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { useScroll } from "../_hooks/use-scroll";
import { Show } from "~/components/Show";
import { RecordList } from "./RecordList";
import { useUser } from "~/hooks/use-user";
import type { RecordTransform } from "~/lib/record";
import { useSearchParams } from "react-router";
import { getParam, setParam } from "../_utils/params";
import { Label } from "~/components/ui/label";
import { useState } from "react";
import { useSize } from "~/hooks/use-size";
import { style } from "~/lib/style";

export function RecordSide({
	records,
	total,
	capital,
}: {
	records: RecordTransform[];
	total: number;
	capital: number;
}) {
	const { ref, handleScroll } = useScroll();
	const [search, setSearch] = useSearchParams();
	const [order, setOrder] = useState<"time" | "total">("time");
	const size = useSize();
	const mode = getParam(search).mode;
	const setMode = setParam(setSearch).mode;
	const user = useUser();
	if (order === "total") {
		records.sort((a, b) => b.grandTotal - a.grandTotal);
	} else {
		records.sort((a, b) => b.timestamp - a.timestamp);
	}
	return (
		<div className="flex flex-col gap-1 overflow-hidden">
			<div className="flex items-center gap-1">
				<Label>Urutkan</Label>
				<select
					value={order}
					onChange={(e) => {
						setOrder(e.currentTarget.value as any);
					}}
					className="text-2xl p-1 border border-border rounded-md"
				>
					<option value="time">Waktu</option>
					<option value="total">Total</option>
				</select>
			</div>
			<Tabs
				onValueChange={(v) => {
					if (v !== "sell" && v !== "buy") {
						return;
					}
					setMode(v);
				}}
				value={mode}
				className="overflow-auto flex-1"
				ref={ref}
				onScroll={handleScroll}
			>
				<TabsList>
					<TabsTrigger value="sell">Jual</TabsTrigger>
					<Show when={user.role === "admin"}>
						<TabsTrigger value="buy">Beli</TabsTrigger>
					</Show>
				</TabsList>
				<TabsContent value="sell">
					<RecordList records={records.filter((r) => r.mode === "sell")} />
				</TabsContent>
				<Show when={user.role === "admin"}>
					<TabsContent value="buy">
						<RecordList records={records.filter((r) => r.mode === "buy")} />
					</TabsContent>
				</Show>
			</Tabs>
			<div style={style[size].text} className="grid grid-cols-[90px_1fr]">
				<Show when={mode === "sell"}>
					<p>Modal</p>
					<p>: Rp{capital.toLocaleString("id-ID")}</p>
				</Show>
				<p>Total</p>
				<p>: Rp{total.toLocaleString("id-ID")}</p>
			</div>
		</div>
	);
}
