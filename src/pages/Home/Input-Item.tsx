import { Manual } from "./Manual";
import { Search } from "./Search";
import { Barcode } from "./Barcode";
import { TaxField } from "./Tax";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { BuyInput } from "./BuyInput";

export function InputItem({ mode }: { mode: "buy" | "sell" }) {
	return (
		<aside className="flex flex-col overflow-hidden  justify-between min-w-[600px] w-[30%] h-full">
			{mode === "sell" ? (
				<Tabs
					defaultValue="auto"
					className="w-full grow shrink basis-0 items-start flex flex-col overflow-hidden"
				>
					<TabsList>
						<TabsTrigger value="auto">Otomatis</TabsTrigger>
						<TabsTrigger value="man">Manual</TabsTrigger>
					</TabsList>
					<TabsContent value="auto" className="flex w-full flex-col px-1 gap-2 grow shrink basis-0">
						<Barcode />
						<hr />
						<Search />
					</TabsContent>
					<TabsContent value="man" className="w-full">
						<Manual />
					</TabsContent>
				</Tabs>
			) : (
				<BuyInput />
			)}
			<div style={{ flex: "0 0 auto" }}>
				<hr />
				<TaxField />
			</div>
		</aside>
	);
}
