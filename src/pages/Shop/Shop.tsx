import { useEffect, useState } from "react";
import { RightPanel } from "./RightPanel";
import { LeftPanel } from "./LeftPanel";
import { numeric } from "~/lib/utils";
import { Additional, ItemWithoutDisc } from "./schema";
import { Provider } from "./context";

export default function Page() {
	const [mode, setMode] = useState<"sell" | "buy">("sell");
	const [item, setItem] = useState<ItemWithoutDisc | null>(null);
	const [additional, setAdditional] = useState<Additional | null>(null);
	const { fix, setFix } = useFix(mode);
	const changeMode = (mode: "sell" | "buy") => setMode(mode);
	return (
		<main className="gap-2 p-2 flex min-h-0 grow shrink basis-0">
			<Provider value={{ item, additional, setItem, setAdditional, fix, setFix }}>
				<LeftPanel mode={mode} changeMode={changeMode} />
				<RightPanel mode={mode} />
			</Provider>
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
	return { fix, setFix: changeFix };
}

function getRound(mode: "buy" | "sell") {
	const parsed = numeric.safeParse(localStorage.getItem(`round-${mode}`));
	if (parsed.success) {
		return parsed.data;
	}
	localStorage.setItem(`round-${mode}`, "0");
	return 0;
}
