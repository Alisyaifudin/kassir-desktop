import { Field } from "./Field";
import { Input } from "../../components/ui/input";
import { useContext, useState } from "react";
import { Result, tryResult } from "../../utils";
import Database from "@tauri-apps/plugin-sql";
import { useDb } from "../../Layout";
import { ItemContext, itemMethod } from "./item-method";

export function Search() {
	const [name, setName] = useState("");
	const [items, setItems] = useState<DB.Item[]>([]);
	const [error, setError] = useState("");
	const { setItems: setItemsG } = useContext(ItemContext);
	const db = useDb();
	const { addItemSelect } = itemMethod(db, setItemsG);
	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const n = e.currentTarget.value;
		setName(n);
		if (n === "") {
			setItems([]);
			return;
		}
		searchItem(db, n).then((res) => {
			const [errMsg, items] = res;
			if (errMsg !== null) {
				setError(errMsg);
				return;
			}
			setError("");
			setItems(items);
		});
	};
	return (
		<>
			<h2 className="font-bold">Cari</h2>
			<Field label="Nama">
				<Input type="text" value={name} onChange={handleChange} />
			</Field>
			{error ? <p className="text-red-500">{error}</p> : null}
			<div className="flex-1 overflow-auto">
				<ol className="flex flex-col gap-1">
					{items.map((item, i) => (
						<li key={i} className={i % 2 === 0 ? "bg-muted" : ""}>
							<button
								onClick={() => {
									setName("");
									setItems([]);
									addItemSelect(item);
								}}
								className="cursor-pointer"
							>
								{item.name}
							</button>
						</li>
					))}
				</ol>
			</div>
		</>
	);
}

async function searchItem(db: Database, name: string): Promise<Result<string, DB.Item[]>> {
	return tryResult({
		run: async () =>
			db.select<DB.Item[]>(
				"SELECT * FROM items WHERE LOWER(name) LIKE '%' || LOWER(?1) || '%' LIMIT 20",
				[name.trim()]
			),
	});
}
