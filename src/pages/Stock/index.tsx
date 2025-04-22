import { Await, Link } from "react-router";
import { Plus } from "lucide-react";
import { Button } from "../../components/ui/button";
import { ItemList } from "./ItemList";
import { useDb } from "../../Layout";
import { Suspense } from "react";

export default function Page() {
	const items = useItems();
	return (
		<main className="flex flex-col gap-2 p-2">
			<Button asChild size="icon" className="rounded-full self-end">
				<Link to="/stock/new">
					<Plus />
				</Link>
			</Button>
			<Suspense fallback={<p>Loading...</p>}>
				<Await resolve={items}>{(items) => <ItemList items={items} />}</Await>
			</Suspense>
		</main>
	);
}

const useItems = () => {
	const db = useDb();
	const items = db.select<
		{
			name: string;
			price: string;
			barcode: string | null;
			stock: number;
			id: number;
		}[]
	>("SELECT * FROM items");
	return items;
};
