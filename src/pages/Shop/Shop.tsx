import { useEffect, useMemo, useState } from "react";
import { RightPanel } from "./RightPanel";
import { LeftPanel } from "./LeftPanel";
import { numeric } from "~/lib/utils";
import { Provider } from "./context";
import { useLocalStorage } from "./useLocalStorage";
import { calcTotalAfterDisc, calcTotalBeforeDisc, calcTotalTax } from "./submit";
import { Loader2 } from "lucide-react";

export default function Page() {
	const [mode, setMode] = useState<"sell" | "buy">("sell");
	const { fix, setFix } = useFix(mode);
	const changeMode = (mode: "sell" | "buy") => setMode(mode);
	const { ready, data, set } = useLocalStorage(mode);
	const summary = useMemo(() => {
		const totalBeforeDisc = calcTotalBeforeDisc(data.items, fix);
		const totalAfterDisc = calcTotalAfterDisc(totalBeforeDisc, data.disc, fix);
		const totalTax = calcTotalTax(totalAfterDisc, data.additionals, fix);
		const totalAfterTax = totalAfterDisc.add(totalTax);
		const grandTotal = totalAfterTax.add(data.rounding);
		return {
			totalAfterDisc: Number(totalAfterDisc.toFixed(fix)),
			totalAfterTax: Number(totalAfterTax.toFixed(fix)),
			totalBeforeDisc: Number(totalBeforeDisc.toFixed(fix)),
			totalTax: Number(totalTax.toFixed(fix)),
			grandTotal: Number(grandTotal.toFixed(fix)),
		};
	}, [data, fix]);
	if (!ready) {
		return <Loader2 className="animate-splin" />;
	}
	return (
		<main className="gap-2 p-2 flex min-h-0 grow shrink basis-0">
			<Provider value={{ fix, setFix, data, set, ...summary }}>
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
