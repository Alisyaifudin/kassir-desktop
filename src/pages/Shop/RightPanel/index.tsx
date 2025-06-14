import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { AdditionalComponent } from "./Additional";
import { Search } from "./Search";
import { Manual } from "./Manual";
import { useFix, useSetData } from "../context";
import { useProducts } from "~/hooks/useProducts";
import { Await } from "~/components/Await";
import { Loading } from "~/components/Loading";
import { Summary } from "./Summary";

export function RightPanel({ mode }: { mode: "buy" | "sell" }) {
	const state = useProducts();
	const { fix, setFix } = useFix();
	const set = useSetData();
	const totalReset = () => {
		set.items.reset(mode);
		set.additionals.reset(mode);
		set.discVal(mode, 0);
		set.discType(mode, "percent");
		set.method(mode, "cash");
		set.note(mode, "");
		set.pay(mode, 0);
		set.rounding(mode, 0);
	};
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
				<Await state={state} Loading={<Loading />}>
					{(products) => (
						<>
							<TabsContent
								value="auto"
								className="flex w-full flex-col px-1 gap-2 grow shrink basis-0"
							>
								<Search mode={mode} products={products} />
							</TabsContent>
							<TabsContent
								value="man"
								className="flex w-full flex-col px-1 gap-2 grow shrink basis-0"
							>
								<Manual mode={mode} fix={fix} products={products} />
							</TabsContent>
							<TabsContent
								value="add"
								className="flex w-full flex-col px-1 gap-2 grow shrink basis-0"
							>
								<AdditionalComponent mode={mode} />
							</TabsContent>
						</>
					)}
				</Await>
			</Tabs>
			<div style={{ flex: "0 0 auto" }}>
				<hr />
				<Summary mode={mode} reset={totalReset} />
			</div>
		</aside>
	);
}
