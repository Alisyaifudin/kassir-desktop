import { useState } from "react";
import { RightPanel } from "./RightPanel";
import { Item, Other } from "./schema";

export default function Page() {
	const [item, setItem] = useState<Item | null>(null);
	const [other, setOther] = useState<Other | null>(null);
	const sendItem = (item: Item) => setItem(item);
	const sendOther = (other: Other) => setOther(other);
	const reset = () => {
		setOther(null);
		setItem(null);
	};

	return (
		<main className="gap-2 p-2 flex min-h-0 grow shrink basis-0">
			<RightPanel />
		</main>
	);
}

// export function getMode(search: URLSearchParams): "sell" | "buy" {
// 	const parsed = z.enum(["sell", "buy"]).safeParse(search.get("mode"));
// 	const mode = parsed.success ? parsed.data : "sell";
// 	return mode;
// }

// type LoadData =
// 	| { loading: true; error: null }
// 	| { loading: false; error: null }
// 	| { loading: false; error: any };

// function useLoadData(): LoadData {
// 	const [loading, setLoading] = useState(true);
// 	const [error, setError] = useState<any>(null);
// 	const setInitial = useData((state) => state.setInitial);
// 	useEffect(() => {
// 		if (!window) {
// 			setError("Tidak ada window?");
// 			setLoading(false);
// 			return;
// 		}
// 		const localData = window.localStorage.getItem("home-data");
// 		if (localData === null) {
// 			setLoading(false);
// 			return;
// 		}
// 		try {
// 			var jsonData = JSON.parse(localData);
// 		} catch (error) {
// 			setLoading(false);
// 			return;
// 		}
// 		const parsed = dataSchema.safeParse(jsonData);
// 		if (!parsed.success) {
// 			setLoading(false);
// 			return;
// 		}
// 		setInitial(parsed.data);
// 		setLoading(false);
// 	}, []);
// 	return { loading, error };
// }
