import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs";
import { OtherComponent } from "./Other";
import { Search } from "./Search";
import { Manual } from "./Manual";
import { Other, Item } from "../schema";

export function RightPanel({
	sendOther,
	sendItem,
}: {
	sendOther: (other: Other) => void;
	sendItem: (item: Item) => void;
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
					<Search sendItem={sendItem} />
				</TabsContent>
				<TabsContent value="man" className="flex w-full flex-col px-1 gap-2 grow shrink basis-0">
					<Manual sendItem={sendItem} />
				</TabsContent>
			</Tabs>
			<div style={{ flex: "0 0 auto" }}>
				<hr />
				<OtherComponent sendOther={sendOther} />
			</div>
		</aside>
	);
}
