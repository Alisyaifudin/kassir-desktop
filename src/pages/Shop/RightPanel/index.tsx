import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { AdditionalComponent } from "./Additional";
import { Search } from "./Search";
import { Manual } from "./Manual";
import { useFix } from "../context";
import { useProducts } from "~/Layout";

export function RightPanel({ mode }: { mode: "buy" | "sell" }) {
	const { products } = useProducts();
	const { fix, setFix } = useFix();
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
					</TabsList>
					<div>
						<label className="text-2xl flex items-center gap-3 pr-5">
							Bulatkan?
							<select value={fix} onChange={(e) => setFix(mode, Number(e.currentTarget.value))}>
								<option value={0}>0</option>
								<option value={1}>1</option>
								<option value={2}>2</option>
								<option value={3}>3</option>
								<option value={4}>4</option>
								<option value={5}>5</option>
							</select>
						</label>
					</div>
				</div>

				<TabsContent value="auto" className="flex w-full flex-col px-1 gap-2 grow shrink basis-0">
					<Search mode={mode} products={products} />
				</TabsContent>
				<TabsContent value="man" className="flex w-full flex-col px-1 gap-2 grow shrink basis-0">
					<Manual mode={mode} fix={fix} products={products} />
				</TabsContent>
			</Tabs>
			<div style={{ flex: "0 0 auto" }}>
				<hr />
				<AdditionalComponent />
			</div>
		</aside>
	);
}