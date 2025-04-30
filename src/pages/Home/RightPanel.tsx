import { z } from "zod";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Search } from "./Search";
import { Manual } from "./Manual";
import { TaxField } from "./Tax";

export function RightPanel() {
	// const [search, setSearch] = useSearchParams();
	// const mode = getMode(search);
	// const [state, dispatch] = useReducer(itemReducer, { items: [], taxes: [] });
	// const reset = () => dispatch({ action: "reset" });
	return (
		<LeftPanel mode="sell">
			<aside className="flex flex-col overflow-hidden  justify-between min-w-[666px] w-[35%] h-full">
				<Tabs
					defaultValue="auto"
					className="w-full grow shrink basis-0 items-start flex flex-col overflow-hidden"
				>
					<TabsList>
						<TabsTrigger value="auto">Otomatis</TabsTrigger>
						<TabsTrigger value="man">Manual</TabsTrigger>
					</TabsList>
					<TabsContent value="auto" className="flex w-full flex-col px-1 gap-2 grow shrink basis-0">
						<Search />
					</TabsContent>
					<TabsContent value="man" className="flex w-full flex-col px-1 gap-2 grow shrink basis-0">
						<Manual />
					</TabsContent>
				</Tabs>
				<div style={{ flex: "0 0 auto" }}>
					<hr />
					<TaxField />
				</div>
			</aside>
		</LeftPanel>
	);
}

export function getMode(search: URLSearchParams): "sell" | "buy" {
	const parsed = z.enum(["sell", "buy"]).safeParse(search.get("mode"));
	const mode = parsed.success ? parsed.data : "sell";
	return mode;
}
