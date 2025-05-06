import { useEffect, useState } from "react";
import { RightPanel } from "./RightPanel";
import { Additional, ItemWithoutDisc } from "./schema";
import { LeftPanel } from "./LeftPanel";
import { numeric } from "../../lib/utils";

export default function Page() {
	const [item, setItem] = useState<ItemWithoutDisc | null>(null);
	const [mode, setMode] = useState<"sell" | "buy">("sell");
	const [additional, setAdditional] = useState<Additional | null>(null);
	const { fix, changeFix } = useFix(mode);
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
				fix={fix}
			/>
			<RightPanel
				sendItem={sendItem}
				sendAdditional={sendAdditional}
				mode={mode}
				fix={fix}
				changeFix={(fix: number) => changeFix(mode, fix)}
			/>
		</main>
	);
}

function useFix(mode: "buy" | "sell") {
	const [fix, setFix] = useState(0);
	const changeFix = (mode: "buy" | "sell", fix: number) => {
		setFix(fix);
		localStorage.setItem(`round-${mode}`, String(fix));
	};
	useEffect(() => {
		const round = getRound(mode);
		setFix(round);
	}, [mode]);
	return { fix, changeFix };
}

function getRound(mode: "buy" | "sell") {
	const parsed = numeric.safeParse(localStorage.getItem(`round-${mode}`));
	if (parsed.success) {
		return parsed.data;
	}
	localStorage.setItem(`round-${mode}`, "0");
	return 0;
}
