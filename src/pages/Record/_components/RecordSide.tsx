import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { useScroll } from "../_hooks/use-scroll";
import { Show } from "~/components/Show";
import { RecordList } from "./RecordList";
import { useUser } from "~/hooks/use-user";
import type { RecordTransform } from "~/lib/record";
import { useSearchParams } from "react-router";
import { getParam, setParam } from "../_utils/params";

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
	const mode = getParam(search).mode;
	const setMode = setParam(setSearch).mode;
	const user = useUser();
	return (
		<div className="flex flex-col gap-1 overflow-hidden">
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
			<div className="grid grid-cols-[90px_1fr]">
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
