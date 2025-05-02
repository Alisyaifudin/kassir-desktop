import { useState } from "react";
import { RightPanel } from "./RightPanel";
import { Item, Other } from "./schema";
import { LeftPanel } from "./LeftPanel";

export default function Page() {
	const [item, setItem] = useState<Item | null>(null);
	const [mode, setMode] = useState<"sell" | "buy">("sell");
	const [other, setOther] = useState<Other | null>(null);
	const sendItem = (item: Item) => setItem(item);
	const sendOther = (other: Other) => setOther(other);
	const reset = () => {
		setOther(null);
		setItem(null);
	};
	const changeMode = (mode: "sell" | "buy") => setMode(mode);
	return (
		<main className="gap-2 p-2 flex min-h-0 grow shrink basis-0">
			<LeftPanel
				newItem={item}
				newOther={other}
				reset={reset}
				mode={mode}
				changeMode={changeMode}
			/>
			<RightPanel sendItem={sendItem} sendOther={sendOther} mode={mode} />
		</main>
	);
}
