import { z } from "zod";
import { numeric } from "../../../lib/utils";
import { Item, itemSchema, Other, otherSchema } from "../schema";
import { useEffect, useState } from "react";
import { produce } from "immer";

export function useLocalStorage(mode: "sell"|"buy") {
	const [ready, setReady] = useState(false);
	const [note, setNote] = useState("");
	const [method, setMethod] = useState<"cash" | "transfer" | "emoney">("cash");
	
	const [items, setItems] = useState<Item[]>([]);
	const [others, setOthers] = useState<Other[]>([]);
	const [cashier, setCashier] = useState<string | null>(null);
	const [pay, setPay] = useState(0);
	const [rounding, setRounding] = useState(0);
	const [disc, setDisc] = useState<{ value: number; type: "number" | "percent" }>({
		value: 0,
		type: "percent",
	});
	useEffect(() => {
		const pay = getPay(mode);
		setPay(pay);
		const note = getNote(mode);
		setNote(note);
		const method = getMethod(mode);
		setMethod(method);
		const rounding = getRounding(mode);
		setRounding(rounding);
		const cashier = getCashier();
		setCashier(cashier);
		const disc = getDisc(mode);
		setDisc(disc);
		const items = getItems(mode);
		setItems(items);
		const others = getOthers(mode);
		setOthers(others);
		setReady(true);
	}, [mode]);
	const changeCashier = (cashier: string) => setCashier(cashier);
	const changePay = (mode: "buy" | "sell", pay: number) => {
		setPay(pay);
		localStorage.setItem(`pay-${mode}`, pay.toString());
	};
	const changeRounding = (mode: "buy" | "sell", rounding: number) => {
		setRounding(rounding);
		localStorage.setItem(`rounding-${mode}`, rounding.toString());
	};
	const changeDiscVal = (mode: "buy" | "sell", value: number) => {
		setDisc((prev) => ({ ...prev, value }));
		localStorage.setItem(`disc-val-${mode}`, value.toString());
	};
	const changeDiscType = (mode: "buy" | "sell", type: "number" | "percent") => {
		setDisc((prev) => ({ ...prev, type }));
		localStorage.setItem(`disc-type-${mode}`, type.toString());
	};
	const changeNote = (mode: "buy" | "sell", note: string) => {
		setNote(note);
		localStorage.setItem(`note-${mode}`, note.toString());
	};
	const changeMethod = (mode: "buy" | "sell", method: "cash" | "transfer" | "emoney") => {
		setMethod(method);
		localStorage.setItem(`method-${mode}`, note.toString());
	};
	const changeItems = {
		reset: (mode: "buy" | "sell") => {
			setItems([]);
			localStorage.setItem(`items-${mode}`, "[]");
		},
		add: (mode: "buy" | "sell", item: Item) => {
			setItems((state) =>
				produce(state, (draft) => {
					draft.push(item);
					localStorage.setItem(`items-${mode}`, JSON.stringify(draft));
				})
			);
		},
		delete: (mode: "buy" | "sell", index: number) => {
			setItems((state) => {
				const newItems = state.filter((_, i) => i !== index);
				localStorage.setItem(`items-${mode}`, JSON.stringify(newItems));
				return newItems;
			});
		},
		name: (mode: "buy" | "sell", index: number, name: string) => {
			setItems((state) =>
				produce(state, (draft) => {
					draft[index].name = name;
					localStorage.setItem(`items-${mode}`, JSON.stringify(draft));
				})
			);
		},
		barcode: (mode: "buy" | "sell", index: number, barcode: string | null) => {
			setItems((state) =>
				produce(state, (draft) => {
					draft[index].barcode = barcode;
					localStorage.setItem(`items-${mode}`, JSON.stringify(draft));
				})
			);
		},
		price: (mode: "buy" | "sell", index: number, price: number) => {
			setItems((state) =>
				produce(state, (draft) => {
					draft[index].price = price;
					localStorage.setItem(`items-${mode}`, JSON.stringify(draft));
				})
			);
		},
		qty: (mode: "buy" | "sell", index: number, qty: number) => {
			setItems((state) =>
				produce(state, (draft) => {
					draft[index].qty = qty;
					localStorage.setItem(`items-${mode}`, JSON.stringify(draft));
				})
			);
		},
		discVal: (mode: "buy" | "sell", index: number, val: number) => {
			setItems((state) =>
				produce(state, (draft) => {
					draft[index].disc.value = val;
					localStorage.setItem(`items-${mode}`, JSON.stringify(draft));
				})
			);
		},
		discType: (mode: "buy" | "sell", index: number, type: "number" | "percent") => {
			setItems((state) =>
				produce(state, (draft) => {
					draft[index].disc.type = type;
					localStorage.setItem(`items-${mode}`, JSON.stringify(draft));
				})
			);
		},
		// stock: (mode: "buy" | "sell", index: number, stock: number) => {
		// 	setItems((state) =>
		// 		produce(state, (draft) => {
		// 			draft[index].stock = stock;
		// 			localStorage.setItem(`items-${mode}`, JSON.stringify(draft));
		// 		})
		// 	);
		// },
	};
	const changeOthers = {
		reset: (mode: "sell" | "buy") => {
			setOthers([]);
			localStorage.setItem(`others-${mode}`, "[]");
		},
		add: (mode: "sell" | "buy", other: Other) => {
			setOthers((state) =>
				produce(state, (draft) => {
					draft.push(other);
					localStorage.setItem(`others-${mode}`, JSON.stringify(draft));
				})
			);
		},
		delete: (mode: "sell" | "buy", index: number) => {
			setOthers((state) => {
				const newStuff = state.filter((_, i) => i !== index);
				localStorage.setItem(`others-${mode}`, JSON.stringify(newStuff));
				return newStuff;
			});
		},
		name: (mode: "sell" | "buy", index: number, name: string) => {
			setOthers((state) =>
				produce(state, (draft) => {
					draft[index].name = name;
					localStorage.setItem(`others-${mode}`, JSON.stringify(draft));
				})
			);
		},
		value: (mode: "sell" | "buy", index: number, value: number) => {
			setOthers((state) =>
				produce(state, (draft) => {
					draft[index].value = value;
					localStorage.setItem(`others-${mode}`, JSON.stringify(draft));
				})
			);
		},
		kind: (mode: "sell" | "buy", index: number, kind: "percent" | "number") => {
			setOthers((state) =>
				produce(state, (draft) => {
					draft[index].kind = kind;
					localStorage.setItem(`others-${mode}`, JSON.stringify(draft));
				})
			);
		},
	};
	return {
		ready,
		data: {
			note,
			pay,
			rounding,
			cashier,
			disc,
			method,
			items,
			others,
		},
		set: {
			items: changeItems,
			others: changeOthers,
			note: changeNote,
			pay: changePay,
			rounding: changeRounding,
			cashier: changeCashier,
			discVal: changeDiscVal,
			discType: changeDiscType,
			method: changeMethod,
		},
	};
}

export type SetItem = ReturnType<typeof useLocalStorage>["set"]["items"];
export type SetOther = ReturnType<typeof useLocalStorage>["set"]["others"];
export type Data = ReturnType<typeof useLocalStorage>["data"]

function getCashier() {
	const parsed = z.string().safeParse(localStorage.getItem("cashier"));
	if (parsed.success) {
		return parsed.data;
	}
	return null;
}

function getMethod(mode: "buy" | "sell") {
	const parsed = z
		.enum(["cash", "emoney", "transfer"])
		.safeParse(localStorage.getItem(`method-${mode}`));
	if (parsed.success) {
		return parsed.data;
	}
	localStorage.setItem(`method-${mode}`, "cash");
	return "cash";
}

function getNote(mode: "buy" | "sell") {
	const parsed = z.string().safeParse(localStorage.getItem(`note-${mode}`));
	if (parsed.success) {
		return parsed.data;
	}
	localStorage.setItem(`note-${mode}`, "");
	return "";
}

function getPay(mode: "buy" | "sell") {
	const parsed = numeric.safeParse(localStorage.getItem(`pay-${mode}`));
	if (parsed.success) {
		return parsed.data;
	}
	localStorage.setItem(`pay-${mode}`, "0");
	return 0;
}

function getRounding(mode: "buy" | "sell") {
	const parsed = numeric.safeParse(localStorage.getItem(`rounding-${mode}`));
	if (parsed.success) {
		return parsed.data;
	}
	localStorage.setItem(`rounding-${mode}`, "0");
	return 0;
}

function getDisc(mode: "buy" | "sell") {
	const disc: { value: number; type: "number" | "percent" } = {
		value: 0,
		type: "percent",
	};
	const parsedVal = numeric.safeParse(localStorage.getItem(`disc-val-${mode}`));
	if (parsedVal.success) {
		disc.value = parsedVal.data;
	} else {
		localStorage.setItem(`disc-val-${mode}`, "0");
	}
	const parsedType = z
		.enum(["number", "percent"])
		.safeParse(localStorage.getItem(`disc-type-${mode}`));
	if (parsedType.success) {
		disc.type = parsedType.data;
	} else {
		localStorage.setItem(`disc-type-${mode}`, "percent");
	}
	return disc;
}

function getItems(mode: "sell" | "buy") {
	const val = localStorage.getItem(`items-${mode}`);
	if (val === null) {
		localStorage.setItem(`items-${mode}`, `[]`);
		return [];
	}
	try {
		var jsonObj = JSON.parse(val);
	} catch (error) {
		localStorage.setItem(`items-${mode}`, `[]`);
		return [];
	}
	const parsed = itemSchema.array().safeParse(jsonObj);
	if (parsed.success) {
		return parsed.data;
	}
	localStorage.setItem(`items-${mode}`, `[]`);
	return [];
}
function getOthers(mode: "sell" | "buy") {
	const val = localStorage.getItem(`others-${mode}`);
	if (val === null) {
		localStorage.setItem(`others-${mode}`, `[]`);
		return [];
	}
	try {
		var jsonObj = JSON.parse(val);
	} catch (error) {
		localStorage.setItem(`others-${mode}`, `[]`);
		return [];
	}
	const parsed = otherSchema.array().safeParse(jsonObj);
	if (parsed.success) {
		return parsed.data;
	}
	localStorage.setItem(`others-${mode}`, `[]`);
	return [];
}
