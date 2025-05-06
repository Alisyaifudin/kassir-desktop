import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs";
import { AdditionalComponent } from "./Additional";
import { Search } from "./Search";
import { Manual } from "./Manual";
import { Additional, ItemWithoutDisc } from "../schema";

export function RightPanel({
	sendAdditional,
	sendItem,
	mode,
}: {
	sendAdditional: (additional: Additional) => void;
	sendItem: (item: ItemWithoutDisc) => void;
	mode: "buy" | "sell";
}) {
	return (
		<aside className="flex flex-col overflow-hidden justify-between min-w-[666px] w-[35%] h-full">
			<Tabs
				defaultValue="auto"
				className="w-full grow shrink basis-0 items-start flex flex-col overflow-hidden"
			>
				<TabsList>
					<TabsTrigger value="auto">Otomatis</TabsTrigger>
					<TabsTrigger value="man">Manual</TabsTrigger>
				</TabsList>
				<TabsContent value="auto" className="flex w-full flex-col px-1 gap-2 grow shrink basis-0">
					<Search sendItem={sendItem} mode={mode} />
				</TabsContent>
				<TabsContent value="man" className="flex w-full flex-col px-1 gap-2 grow shrink basis-0">
					<Manual sendItem={sendItem} mode={mode} />
				</TabsContent>
			</Tabs>
			<div style={{ flex: "0 0 auto" }}>
				<hr />
				<AdditionalComponent sendAdditional={sendAdditional} />
			</div>
		</aside>
	);
}
