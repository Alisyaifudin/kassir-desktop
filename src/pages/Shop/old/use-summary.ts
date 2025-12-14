import { useEffect, useRef, useState } from "react";
import { useTabState } from "./use-tab-state";
import { generateSummary, Summary } from "./utils/record";
import { create } from "zustand";
import { DEBOUNCE_DELAY } from "~/lib/constants";

const useSummaryStore = create<{ summary: Summary | null; setSummary: (summary: Summary) => void }>(
	(set) => ({
		summary: null,
		setSummary(summary) {
			set({ summary });
		},
	})
);

export function useSummary() {
	const { get } = useTabState();
	const state = get();
	const { summary, setSummary } = useSummaryStore();
	const [loading, setLoading] = useState(true);
	const timeoutRef = useRef<NodeJS.Timeout | null>(null);
	useEffect(() => {
		setLoading(true);
		// Clear any existing timeout
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current);
		}
		// first time, calc right away
		if (summary === null) {
			const summary = generateSummary(state);
			setSummary(summary);
			setLoading(false);
		} else {
			timeoutRef.current = setTimeout(() => {
				const summary = generateSummary(state);
				setSummary(summary);
				setLoading(false);
			}, DEBOUNCE_DELAY);
		}

		// Cleanup function
		return () => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}
		};
	}, [state]);
	return [loading, summary] as const;
}

// const summary = useMemo(() => {
// 	const summary = generateSummary();
// }, [state]);
// const debouncePay = useDebouncedCallback((val: number) => setPay(val), DEBOUNCE_DELAY);
// const debounceRounding = useDebouncedCallback((val: number) => setRounding(val), DEBOUNCE_DELAY);
// const debounceDiscVal = useDebouncedCallback((val: number) => setDisc.value(val), DEBOUNCE_DELAY);
// const debounceDiscKind = useDebouncedCallback(
// 	(val: DB.ValueKind) => setDisc.kind(val),
// 	DEBOUNCE_DELAY
// );
// const handleChange = {
// 	pay: (e: React.ChangeEvent<HTMLInputElement>) => {
// 		let str = e.currentTarget.value;
// 		let val = Number(str);
// 		if (isNaN(val)) {
// 			return;
// 		}
// 		if (val < 0) {
// 			val = 0;
// 			str = "";
// 		}
// 		debouncePay(val);
// 		setData({ ...data, pay: str });
// 	},
// 	rounding: (e: React.ChangeEvent<HTMLInputElement>) => {
// 		let str = e.currentTarget.value;
// 		let val = Number(str);
// 		if (isNaN(val)) {
// 			return;
// 		}
// 		debounceRounding(val);
// 		setData({ ...data, rounding: str });
// 	},
// 	discVal: (e: React.ChangeEvent<HTMLInputElement>) => {
// 		let str = e.currentTarget.value;
// 		let val = Number(str);
// 		if (isNaN(val)) {
// 			return;
// 		}
// 		if (val < 0) {
// 			val = 0;
// 			str = "";
// 		}
// 		if (disc.kind === "percent" && val > 100) {
// 			val = 100;
// 		}
// 		debounceDiscVal(val);
// 		setData({ ...data, discVal: str });
// 	},
// 	discKind: (e: React.ChangeEvent<HTMLSelectElement>) => {
// 		const kind = z.enum(["percent", "number"]).catch("percent").parse(e.currentTarget.value);
// 		debounceDiscKind(kind);
// 		setData({ ...data, discKind: kind });
// 	},
// };
// const { record, items, additionals } = summary;
// const navigate = useNavigate();
// const { loading, action } = useAction("", async (credit: 0 | 1) =>
// 	submitPayment(db, mode, credit, fix, record, items, additionals, customer)
// );
// const handleSubmit = (credit: 0 | 1) => async (e: React.FormEvent<HTMLFormElement>) => {
// 	if (
// 		credit === 0 &&
// 		(record.pay === 0 ||
// 			record.grandTotal === 0 ||
// 			(items.length === 0 && additionals.length === 0))
// 	) {
// 		return;
// 	}
// 	e.preventDefault();
// 	if (loading) return;
// 	if (credit === 0 && record.pay < record.grandTotal) return;
// 	const [errMsg, timestamp] = await action(credit);
// 	if (errMsg !== null) {
// 		log.error("Failed to submit");
// 		toast(errMsg);
// 		return;
// 	}
// 	clear();
// 	navigate(`/records/${timestamp}`);
// 	db.product.revalidate("all");
// };
