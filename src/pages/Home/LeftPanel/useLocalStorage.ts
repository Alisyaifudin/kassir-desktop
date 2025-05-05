import { z } from "zod";
import { numeric } from "../../../lib/utils";
import { Item, itemSchema, Additional, additionalSchema, ItemWithoutDisc } from "../schema";
import { useEffect, useState } from "react";
import { produce } from "immer";

export function useLocalStorage(mode: "sell" | "buy") {
	const [ready, setReady] = useState(false);
	const [note, setNote] = useState("");
	const [method, setMethod] = useState<"cash" | "transfer" | "emoney">("cash");
	const [items, setItems] = useState<Item[]>([]);
	const [additionals, setAdditionals] = useState<Additional[]>([]);
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
		const additionals = getAdditionals(mode);
		setAdditionals(additionals);
		setReady(true);
	}, [mode]);
	const changeCashier = (cashier: string) => {
		setCashier(cashier);
		localStorage.setItem(`cashier`, cashier);
	};
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
		add: (mode: "buy" | "sell", item: ItemWithoutDisc) => {
			setItems((state) =>
				produce(state, (draft) => {
					const index = item.id !== undefined ? draft.findIndex((s) => s.id === item.id) : -1;
					if (index === -1) {
						draft.push({
							...item,
							discs: [],
						});
					} else {
						draft[index].qty += 1;
					}
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
		disc: {
			delete: (mode: "buy" | "sell", itemIndex: number, index: number) => {
				setItems((state) =>
					produce(state, (draft) => {
						draft[itemIndex].discs = draft[itemIndex].discs.filter((_, i) => index !== i);
						localStorage.setItem(`items-${mode}`, JSON.stringify(draft));
					})
				);
			},
			add: (mode: "buy" | "sell", itemIndex: number) => {
				setItems((state) =>
					produce(state, (draft) => {
						draft[itemIndex].discs.push({ value: 0, type: "percent" });
						localStorage.setItem(`items-${mode}`, JSON.stringify(draft));
					})
				);
			},
			kind: (
				mode: "buy" | "sell",
				itemIndex: number,
				index: number,
				kind: "percent" | "number"
			) => {
				setItems((state) =>
					produce(state, (draft) => {
						draft[itemIndex].discs[index].type = kind;
						localStorage.setItem(`items-${mode}`, JSON.stringify(draft));
					})
				);
			},
			value: (mode: "buy" | "sell", itemIndex: number, index: number, value: number) => {
				setItems((state) =>
					produce(state, (draft) => {
						draft[itemIndex].discs[index].value = value;
						localStorage.setItem(`items-${mode}`, JSON.stringify(draft));
					})
				);
			},
		},
	};
	const changeAdditional = {
		reset: (mode: "sell" | "buy") => {
			setAdditionals([]);
			localStorage.setItem(`additionals-${mode}`, "[]");
		},
		add: (mode: "sell" | "buy", add: Additional) => {
			setAdditionals((state) =>
				produce(state, (draft) => {
					draft.push(add);
					localStorage.setItem(`additionals-${mode}`, JSON.stringify(draft));
				})
			);
		},
		delete: (mode: "sell" | "buy", index: number) => {
			setAdditionals((state) => {
				const newStuff = state.filter((_, i) => i !== index);
				localStorage.setItem(`additionals-${mode}`, JSON.stringify(newStuff));
				return newStuff;
			});
		},
		name: (mode: "sell" | "buy", index: number, name: string) => {
			setAdditionals((state) =>
				produce(state, (draft) => {
					draft[index].name = name;
					localStorage.setItem(`additionals-${mode}`, JSON.stringify(draft));
				})
			);
		},
		value: (mode: "sell" | "buy", index: number, value: number) => {
			setAdditionals((state) =>
				produce(state, (draft) => {
					draft[index].value = value;
					localStorage.setItem(`additionals-${mode}`, JSON.stringify(draft));
				})
			);
		},
		kind: (mode: "sell" | "buy", index: number, kind: "percent" | "number") => {
			setAdditionals((state) =>
				produce(state, (draft) => {
					draft[index].kind = kind;
					localStorage.setItem(`additionals-${mode}`, JSON.stringify(draft));
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
			additionals,
		},
		set: {
			items: changeItems,
			additionals: changeAdditional,
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
export type SetAdditional = ReturnType<typeof useLocalStorage>["set"]["additionals"];
export type SetDisc = ReturnType<typeof useLocalStorage>["set"]["items"]["disc"];
export type Data = ReturnType<typeof useLocalStorage>["data"];

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
function getAdditionals(mode: "sell" | "buy") {
	const val = localStorage.getItem(`additionals-${mode}`);
	if (val === null) {
		localStorage.setItem(`additionals-${mode}`, `[]`);
		return [];
	}
	try {
		var jsonObj = JSON.parse(val);
	} catch (error) {
		localStorage.setItem(`additionals-${mode}`, `[]`);
		return [];
	}
	const parsed = additionalSchema.array().safeParse(jsonObj);
	if (parsed.success) {
		return parsed.data;
	}
	localStorage.setItem(`additionals-${mode}`, `[]`);
	return [];
}
