import { Link, RouteObject } from "react-router";
import { Plus } from "lucide-react";
import { Button } from "../../components/ui/button";
import { ProductList } from "./ProductList.tsx";
import { useDb } from "../../Layout";
import { route as newItemRoute } from "./New-Item";
import { route as productRoute } from "./Product";
import { Await } from "../../components/Await.tsx";
import { useFetch } from "../../hooks/useFetch.tsx";
export const route: RouteObject = {
	path: "stock",
	children: [{ index: true, Component: Page }, newItemRoute, productRoute],
};

export default function Page() {
	const items = useItems();
	return (
		<main className="flex flex-col gap-2 p-2">
			<Button asChild size="icon" className="rounded-full self-end">
				<Link to="/stock/new">
					<Plus />
				</Link>
			</Button>
			<Await state={items}>{(items) => <ProductList products={items} />}</Await>
		</main>
	);
}

const useItems = () => {
	const db = useDb();
	const items = useFetch(db.product.getAll());
	return items;
};
