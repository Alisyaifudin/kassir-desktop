import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { AdditionalForm } from "./Tab/Additional";
import { Search } from "./Tab/SearchBar";
import { Manual } from "./Tab/Manual";
import { Loading } from "~/components/Loading";
import { Summary } from "./Summary";
import React, { useCallback } from "react";
import { Precision } from "./Precision";
import { Async } from "~/components/Async";
import { err, ok, Result } from "~/lib/utils";
import { useFetch } from "~/hooks/useFetch";
import { useDB } from "~/hooks/use-db";
import { useSize } from "~/hooks/use-size";

const localStyle = {
	big: {
		minWidth: {
			minWidth: "666px",
		},
	},
	small: {
		minWidth: {
			minWidth: "400px",
		},
	},
};

export function RightPanel() {
	const state = useProducts();
	const size = useSize();
	return (
		<aside
			style={localStyle[size].minWidth}
			className="flex flex-col overflow-hidden justify-between w-[35%] h-full"
		>
			<Tabs
				defaultValue="auto"
				className="w-full grow shrink basis-0 items-start flex flex-col overflow-hidden"
			>
				<div className="flex items-center flex-wrap justify-between w-full">
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
					<Precision />
				</div>
				<Async state={state} Loading={<Loading />}>
					{({ products, additionals }) => (
						<>
							<TabBtn value="auto">
								<Search products={products} additionals={additionals} />
							</TabBtn>
							<TabBtn value="man">
								<Manual products={products} />
							</TabBtn>
							<TabBtn value="add">
								<AdditionalForm />
							</TabBtn>
						</>
					)}
				</Async>
			</Tabs>
			<div style={{ flex: "0 0 auto" }}>
				<hr />
				<Summary />
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

export function useProducts() {
	const db = useDB();
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
