import { useProducts } from "~/hooks/useProducts";
import { Loading } from "~/components/Loading";
import { useFilterProducts } from "./_hooks/use-products";
import { ProductList } from "./_components/ProductList";
import { Panel } from "./_components/Panel";
import type { Database } from "~/database";
import { Async } from "~/components/Async";

export default function Page({ db }: { db: Database }) {
	const state = useProducts({ db });
	return (
		<Async state={state} Loading={<Loading />}>
			{(products) => (
				<main className="flex flex-col gap-5 p-2 flex-1 overflow-auto">
					<Stock products={products} />
				</main>
			)}
		</Async>
	);
}

function Stock({ products: all }: { products: DB.Product[] }) {
	const products = useFilterProducts(all);
	return (
		<>
			<Panel productsLength={products.length} />
			<ProductList products={products} />
		</>
	);
}
