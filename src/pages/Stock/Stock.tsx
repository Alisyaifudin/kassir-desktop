import { useProducts } from "~/hooks/useProducts";
import { Loading } from "~/components/Loading";
import { useFilterProducts } from "./_hooks/use-products";
import { ProductList } from "./_components/ProductList";
import { PanelProduct } from "./_components/PanelProduct";
import type { Database } from "~/database";
import { Async } from "~/components/Async";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { useFilterAdditionals } from "./_hooks/use-additionals";
import { AdditionalList } from "./_components/AdditionalList";
import { useAdditionals } from "~/hooks/useAdditional";
import { useParams } from "./_hooks/use-params";
import { PanelAdditional } from "./_components/PanelAdditional";

export default function Page({ db }: { db: Database }) {
	const product = useProducts({ db });
	const additional = useAdditionals({ db });
	const { get, set } = useParams();
	const tab = get.tab;
	return (
		<main className="flex flex-col gap-5 p-2 flex-1 overflow-auto">
			<Tabs value={tab} onValueChange={(v) => set.tab(v)}>
				<TabsList>
					<TabsTrigger value="product">Produk</TabsTrigger>
					<TabsTrigger value="additional">Biaya Lainnya</TabsTrigger>
				</TabsList>
				<TabsContent value="product">
					<Async state={product} Loading={<Loading />}>
						{(products) => <Product products={products} />}
					</Async>
				</TabsContent>
				<TabsContent value="additional">
					<Async state={additional} Loading={<Loading />}>
						{(additionals) => <Additional additionals={additionals} />}
					</Async>
				</TabsContent>
			</Tabs>
		</main>
	);
}

function Product({ products: all }: { products: DB.Product[] }) {
	const products = useFilterProducts(all);
	return (
		<>
			<PanelProduct productsLength={products.length} />
			<ProductList products={products} />
		</>
	);
}

function Additional({ additionals: all }: { additionals: DB.AdditionalItem[] }) {
	const products = useFilterAdditionals(all);
	return (
		<>
			<PanelAdditional length={products.length} />
			<AdditionalList products={products} />
		</>
	);
}
