import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { AdditionalComponent } from "./Tab/Additional";
import { Search } from "./Tab/SearchBar";
import { Manual } from "./Tab/Manual";
import { Loading } from "~/components/Loading";
import { Summary } from "./Summary";
import React, { useCallback } from "react";
import { Precision } from "./Precision";
import { Context } from "../../Shop";
import { Async } from "~/components/Async";
import { LocalContext } from "../../_hooks/use-local-state";
import { Summary as SummaryRecord } from "../../_utils/generate-record";
import { Database } from "~/database";
import { err, ok, Result } from "~/lib/utils";
import { useFetch } from "~/hooks/useFetch";

export function RightPanel({
	context,
	localContext,
	summary,
}: {
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
						<TabsTrigger type="button" value="auto">
							Otomatis
						</TabsTrigger>
						<TabsTrigger type="button" value="man">
							Manual
						</TabsTrigger>
						<TabsTrigger type="button" value="add">
							Tambahan
						</TabsTrigger>
					</TabsList>
					<Precision context={localContext} />
				</div>
				<Async state={state} Loading={<Loading />}>
					{({ products, additionals }) => (
						<>
							<TabBtn value="auto">
								<Search products={products} additionals={additionals} context={localContext} />
							</TabBtn>
							<TabBtn value="man">
								<Manual products={products} context={localContext} />
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
				<Summary localContext={localContext} summary={summary} context={context} />
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

export function useProducts(context: { db: Database }) {
	const db = context.db;
	const fetch = useCallback(async (): Promise<
		Result<
			"Aplikasi bermasalah",
			{
				products: DB.Product[];
				additionals: DB.AdditionalItem[];
			}
		>
	> => {
		const [[errProduct, products], [errAdd, additionals]] = await Promise.all([
			db.product.get.all(),
			db.additionalItem.get.all(),
		]);
		if (errProduct) return err(errProduct);
		if (errAdd) return err(errAdd);
		return ok({ products, additionals });
	}, []);
	const [state] = useFetch(fetch);
	return state;
}
