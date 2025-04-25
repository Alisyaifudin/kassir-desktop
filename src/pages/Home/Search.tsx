import { Field } from "./Field";
import { Input } from "../../components/ui/input";
import { useContext, useState } from "react";
import { useDb } from "../../Layout";
import { ItemContext } from "./reducer";

export function Search() {
	const [name, setName] = useState("");
	const [products, setProducts] = useState<DB.Product[]>([]);
	const [error, setError] = useState("");
	const { dispatch } = useContext(ItemContext);
	const db = useDb();
	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const n = e.currentTarget.value;
		setName(n);
		if (n === "") {
			setProducts([]);
			return;
		}
		db.product.search(n).then((res) => {
			const [errMsg, items] = res;
			if (errMsg !== null) {
				setError(errMsg);
				return;
			}
			setError("");
			setProducts(items);
		});
	};
	const handleClick = (product: DB.Product) => () => {
		setName("");
		setProducts([]);
		dispatch({
			action: "add-select",
			data: {
				id: product.id,
				name: product.name,
				price: product.price.toString(),
				stock: product.stock,
			},
		});
	};
	return (
		<>
			<Field label="Nama">
				<Input type="text" value={name} onChange={handleChange} />
			</Field>
			{error ? <p className="text-red-500">{error}</p> : null}
			<div className="flex-1 overflow-auto">
				<ol className="flex flex-col gap-1">
					{products.map((product, i) => (
						<li key={i} className={i % 2 === 0 ? "bg-muted" : ""}>
							<button onClick={handleClick(product)} className="cursor-pointer text-2xl">
								{product.name}
							</button>
						</li>
					))}
				</ol>
			</div>
		</>
	);
}
