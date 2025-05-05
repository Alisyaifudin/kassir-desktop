import { useState } from "react";
import { RightPanel } from "./RightPanel";
import { Additional, ItemWithoutDisc } from "./schema";
import { LeftPanel } from "./LeftPanel";

export default function Page() {
	const [item, setItem] = useState<ItemWithoutDisc | null>(null);
	const [mode, setMode] = useState<"sell" | "buy">("sell");
	const [additional, setAdditional] = useState<Additional | null>(null);
	const sendItem = (item: ItemWithoutDisc) => setItem(item);
	const sendAdditional = (add: Additional) => setAdditional(add);
	const reset = () => {
		setAdditional(null);
		setItem(null);
	};
	const changeMode = (mode: "sell" | "buy") => setMode(mode);
	return (
		<main className="gap-2 p-2 flex min-h-0 grow shrink basis-0">
			<LeftPanel
				newItem={item}
				newAdditional={additional}
				reset={reset}
				mode={mode}
				changeMode={changeMode}
			/>
			<RightPanel sendItem={sendItem} sendAdditional={sendAdditional} mode={mode} />
		</main>
	);
}
