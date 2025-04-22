import { useState } from "react";
import { InputItem } from "./InputItem";
import { ListItem } from "./ListItem";
import { Item } from "./Item";

export default function Page() {
	const [items, setItems] = useState<Item[]>([]);
	return (
		<main className="flex gap-2 p-2 h-[calc(100vh-60px)]">
			<ListItem items={items} />
			<InputItem />
		</main>
	);
}
