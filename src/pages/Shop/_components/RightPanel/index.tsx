import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { AdditionalComponent } from "./Tab/Additional";
import { Search } from "./Tab/SearchBar";
import { Manual } from "./Tab/Manual";
import { useProducts } from "~/hooks/useProducts";
import { Loading } from "~/components/Loading";
import { Summary } from "./Summary";
import React from "react";
import { Precision } from "./Precision";
import { Context } from "../../Shop";
import { Async } from "~/components/Async";
import { LocalContext } from "../../_hooks/use-local-state";
import { Summary as SummaryRecord } from "../../_utils/generate-record";

export function RightPanel({
	mode,
	context,
	localContext,
	summary,
}: {
	mode: DB.Mode;
	context: Context;
	localContext: LocalContext;
	summary: SummaryRecord;
}) {
	const state = useProducts(context);
	return (
		<aside className="flex flex-col overflow-hidden justify-between min-w-[666px] w-[35%] h-full">
			<Tabs
				defaultValue="auto"
				className="w-full grow shrink basis-0 items-start flex flex-col overflow-hidden"
			>
				<div className="flex items-center justify-between w-full">
					<TabsList>
						<TabsTrigger value="auto">Otomatis</TabsTrigger>
						<TabsTrigger value="man">Manual</TabsTrigger>
						<TabsTrigger value="add">Biaya Tambahan</TabsTrigger>
					</TabsList>
					<Precision context={localContext} />
				</div>
				<Async state={state} Loading={<Loading />}>
					{(products) => (
						<>
							<TabBtn value="auto">
								<Search mode={mode} products={products} context={localContext} />
							</TabBtn>
							<TabBtn value="man">
								<Manual mode={mode} products={products} context={localContext} />
							</TabBtn>
							<TabBtn value="add">
								<AdditionalComponent context={localContext} />
							</TabBtn>
						</>
					)}
				</Async>
			</Tabs>
			<div style={{ flex: "0 0 auto" }}>
				<hr />
				<Summary mode={mode} localContext={localContext} summary={summary} context={context} />
			</div>
		</aside>
	);
}

function TabBtn({ children, value }: { children: React.ReactNode; value: string }) {
	return (
		<TabsContent value={value} className="flex w-full flex-col px-1 gap-2 grow shrink basis-0">
			{children}
		</TabsContent>
	);
}
