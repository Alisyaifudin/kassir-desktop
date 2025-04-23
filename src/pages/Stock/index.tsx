import { Link, RouteObject } from "react-router";
import { Plus } from "lucide-react";
import { Button } from "../../components/ui/button";
import { ItemList } from "./ItemList";
import { useDb } from "../../Layout";
import { route as newItemRoute } from "./New-Item/index.tsx";
import { Await } from "../../components/Await.tsx";
import { useFetch } from "../../hooks/useFetch.tsx";
export const route: RouteObject = {
	path: "stock",
	children: [{ index: true, Component: Page }, newItemRoute],
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
			<Await state={items}>{(items) => <ItemList items={items} />}</Await>
		</main>
	);
}

const useItems = () => {
	const db = useDb();
	const items = useFetch(
		db.select<
			{
				name: string;
				price: string;
				barcode: string | null;
				stock: number;
				id: number;
			}[]
		>("SELECT * FROM items")
	);
	return items;
};
