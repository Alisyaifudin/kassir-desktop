import { usePay } from "~/pages/Shop/use-pay";
import { useRounding } from "~/pages/Shop/use-rounding";
import { useDisc } from "~/pages/Shop/use-disc";
import { useDebouncedCallback } from "use-debounce";
import { z } from "zod";
import { useAction } from "~/hooks/useAction";
import { submitPayment } from "~/pages/Shop/util-submit";
import { useNavigate } from "react-router";
import { useState } from "react";
import { useFix } from "~/pages/Shop/use-fix";
import { log } from "~/lib/utils";
import { DEBOUNCE_DELAY } from "~/lib/constants";
import { useCustomer } from "~/pages/Shop/use-customer";
import { useCtx } from "~/pages/Shop/use-context";
import { useDB } from "~/hooks/use-db";
import { useMode } from "~/pages/Shop/use-mode";

export function useSummaryForm() {
	const db = useDB();
	const { toast, summary, clear } = useCtx();
	const [pay, setPay] = usePay();
	const [mode] = useMode();
	const [rounding, setRounding] = useRounding();
	const [fix] = useFix();
	const [disc, setDisc] = useDisc();
	const [customer] = useCustomer();
	const [data, setData] = useState({
		pay: pay === 0 ? "" : pay.toString(),
		rounding: rounding === 0 ? "" : rounding.toString(),
		discKind: disc.kind,
		discVal: disc.value === 0 ? "" : disc.value.toString(),
	});
	const debouncePay = useDebouncedCallback((val: number) => setPay(val), DEBOUNCE_DELAY);
	const debounceRounding = useDebouncedCallback((val: number) => setRounding(val), DEBOUNCE_DELAY);
	const debounceDiscVal = useDebouncedCallback((val: number) => setDisc.value(val), DEBOUNCE_DELAY);
	const debounceDiscKind = useDebouncedCallback(
		(val: DB.ValueKind) => setDisc.kind(val),
		DEBOUNCE_DELAY
	);
	const handleChange = {
		pay: (e: React.ChangeEvent<HTMLInputElement>) => {
			let str = e.currentTarget.value;
			let val = Number(str);
			if (isNaN(val)) {
				return;
			}
			if (val < 0) {
				val = 0;
				str = "";
			}
			debouncePay(val);
			setData({ ...data, pay: str });
		},
		rounding: (e: React.ChangeEvent<HTMLInputElement>) => {
			let str = e.currentTarget.value;
			let val = Number(str);
			if (isNaN(val)) {
				return;
			}
			debounceRounding(val);
			setData({ ...data, rounding: str });
		},
		discVal: (e: React.ChangeEvent<HTMLInputElement>) => {
			let str = e.currentTarget.value;
			let val = Number(str);
			if (isNaN(val)) {
				return;
			}
			if (val < 0) {
				val = 0;
				str = "";
			}
			if (disc.kind === "percent" && val > 100) {
				val = 100;
			}
			debounceDiscVal(val);
			setData({ ...data, discVal: str });
		},
		discKind: (e: React.ChangeEvent<HTMLSelectElement>) => {
			const kind = z.enum(["percent", "number"]).catch("percent").parse(e.currentTarget.value);
			debounceDiscKind(kind);
			setData({ ...data, discKind: kind });
		},
	};
	const { record, items, additionals } = summary;
	const navigate = useNavigate();
	const { loading, action } = useAction("", async (credit: 0 | 1) =>
		submitPayment(db, mode, credit, fix, record, items, additionals, customer)
	);
	const handleSubmit = (credit: 0 | 1) => async (e: React.FormEvent<HTMLFormElement>) => {
		if (
			credit === 0 &&
			(record.pay === 0 ||
				record.grandTotal === 0 ||
				(items.length === 0 && additionals.length === 0))
		) {
			return;
		}
		e.preventDefault();
		if (loading) return;
		if (credit === 0 && record.pay < record.grandTotal) return;
		const [errMsg, timestamp] = await action(credit);
		if (errMsg !== null) {
			log.error("Failed to submit");
			toast(errMsg);
			return;
		}
		clear();
		navigate(`/records/${timestamp}`);
		db.product.revalidate("all");
	};
	return { handleChange, handleSubmit, loading, data };
}
