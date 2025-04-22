import { Link, LoaderFunctionArgs, useLoaderData } from "react-router";
import Database from "@tauri-apps/plugin-sql";
import { Plus } from "lucide-react";
import { Button } from "../../components/ui/button";
import { ItemList } from "./ItemList";

export async function loader({}: LoaderFunctionArgs) {
	const db = await Database.load("sqlite:mydatabase.db");
	const items = await db.select<
		{
			name: string;
			price: string;
			barcode: string | null;
			stock: number;
			id: number,
		}[]
	>("SELECT * FROM items");
	return { items };
}

export default function Page() {
	const { items } = useLoaderData<typeof loader>();
	return (
		<main className="flex flex-col gap-2 p-2">
			<Button asChild size="icon" className="rounded-full self-end">
				<Link to="/stock/new">
					<Plus />
				</Link>
			</Button>
			{/* <div>{JSON.stringify(result)}</div> */}
			<ItemList items={items} />
		</main>
	);
}
