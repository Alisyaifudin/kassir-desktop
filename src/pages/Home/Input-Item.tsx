import { Manual } from "./Manual";
import { Search } from "./Search";
import { Barcode } from "./Barcode";
import { TaxField } from "./Tax";
// import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";

export function InputItem() {
	// const [tabs, setTabs] = useState<"auto" | "man">("auto");
	return (
		<aside className="flex flex-col gap-2 h-full justify-between min-w-[600px] w-[30%]">
			<Tabs defaultValue="auto" className="w-full">
				<TabsList>
					<TabsTrigger value="auto">Otomatis</TabsTrigger>
					<TabsTrigger value="man">Manual</TabsTrigger>
				</TabsList>
				<TabsContent value="auto" className="flex flex-col gap-2">
					<Barcode />
					<hr />
					<Search />
				</TabsContent>
				<TabsContent value="man">
					<Manual />
				</TabsContent>
			</Tabs>
			<div>
				<hr />
				<TaxField />
			</div>
		</aside>
	);
}
