import { Link, RouteObject } from "react-router";
import { Plus } from "lucide-react";
import { Button } from "../../components/ui/button";
import { ProductList } from "./ProductList.tsx";
import { useDb } from "../../Layout";
import { route as newItemRoute } from "./New-Item";
import { route as productRoute } from "./Product";
import { Await } from "../../components/Await.tsx";
import { useFetch } from "../../hooks/useFetch.tsx";
import { TextError } from "../../components/TextError.tsx";
export const route: RouteObject = {
	path: "stock",
	children: [{ index: true, Component: Page }, newItemRoute, productRoute],
};

export default function Page() {
	const items = useItems();
	return (
		<main className="flex flex-col gap-5 p-2">
			<Link to="/stock/new" className="self-end flex gap-5 items-center text-3xl">
				Tambah Produk
				<Button className="rounded-full h-13 w-13">
					<Plus size={35} />
				</Button>
			</Link>
			<Await state={items}>
				{(data) => {
					const [errMsg, products] = data;
					if (errMsg !== null) {
						return <TextError>{errMsg}</TextError>;
					}
					return <ProductList products={products} />;
				}}
			</Await>
		</main>
	);
}

const useItems = () => {
	const db = useDb();
	const items = useFetch(db.product.getAll(), []);
	return items;
};
