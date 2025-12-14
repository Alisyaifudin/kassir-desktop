import Decimal from "decimal.js";
import { Additional, Item, State } from "./schema";

export type ItemTransform = {
	discs: {
		value: number;
		effVal: number;
		kind: DB.ValueKind | "pcs";
		effTotal: number;
	}[];
	grandTotal: number;
	subtotal: number; // raw total without discount
} & Item;

// type Record = {
// 	mode: DB.Mode;
// 	rounding: number;
// 	fix: number;
// 	pay: number;
// 	methodId: .Method;
// };

export type Record = {
	subtotal: number; // total from items
	total: number; // totalItems + totalAdditionals
	grandTotal: number; // minus rounding
	change: number;
};

export type AdditionalTransform = {
	effVal: number;
	subtotal: number; // subtotal of the entire things up to this additional
} & Additional;

export type Summary = {
	record: Record;
	items: ItemTransform[];
	additionals: AdditionalTransform[];
};

export function generateSummary({ items, additionals, ...record }: State): Summary {
	const fix = record.fix;
	const { itemsTransform, subtotal } = transformItems(items, fix);
	const { addsTransform, total } = transformAdditionals(additionals, subtotal, fix);
	const grandTotal = new Decimal(total.add(record.rounding).toFixed(fix));
	const change = Number(new Decimal(record.pay).minus(grandTotal).toFixed(fix));
	itemsTransform.reverse();
	return {
		items: itemsTransform,
		additionals: addsTransform,
		record: {
			change,
			grandTotal: grandTotal.toNumber(),
			subtotal: subtotal.toNumber(),
			total: total.toNumber(),
		},
	};
}

// for stuff with kind
function calcEffVal(
	v: { value: number; kind: DB.ValueKind | "pcs" },
	base: Decimal,
	fix: number
): { effTotal: Decimal; effVal: number } {
	let effVal = new Decimal(0);
	switch (v.kind) {
		case "number":
			effVal = new Decimal(v.value.toFixed(fix));
			break;
		case "percent":
			effVal = new Decimal(base.times(v.value).div(100).toFixed(fix));
			break;
		case "pcs":
			effVal = new Decimal(base.toFixed(fix)).times(v.value);
			break;
	}
	const effTotal = base.minus(effVal);
	return { effVal: effVal.toNumber(), effTotal };
}

function transformItem(item: Item, fix: number): ItemTransform {
	// let so we can substract it later
	let grandTotal = new Decimal(item.price).times(item.qty);
	const total = new Decimal(grandTotal);
	const transformDiscs: ItemTransform["discs"] = [];
	for (const disc of item.discounts) {
		const { effTotal, effVal } = calcEffVal(disc, grandTotal, fix);
		transformDiscs.push({
			value: disc.value,
			kind: disc.kind,
			effTotal: effTotal.toNumber(),
			effVal,
		});
		grandTotal = effTotal;
	}
	return {
		...item,
		discs: transformDiscs,
		grandTotal: grandTotal.toNumber(),
		subtotal: total.toNumber(),
	};
}

function transformItems(
	items: Item[],
	fix: number
): { itemsTransform: ItemTransform[]; subtotal: Decimal } {
	const itemsTransform = items.map((item) => transformItem(item, fix));
	if (itemsTransform.length === 0) return { itemsTransform: [], subtotal: new Decimal(0) };
	const subtotal = new Decimal(
		Decimal.sum(...itemsTransform.map((item) => item.grandTotal)).toFixed(fix)
	);
	return { itemsTransform, subtotal };
}

function transformAdditional(
	additional: Additional,
	base: Decimal,
	fix: number
): AdditionalTransform {
	const { effVal, effTotal } = calcEffVal(additional, base, fix);
	return {
		...additional,
		effVal,
		subtotal: effTotal.toNumber(),
	};
}

function transformAdditionals(
	additionals: Additional[],
	subtotal: Decimal, // total from items
	fix: number
): { addsTransform: AdditionalTransform[]; total: Decimal } {
	let base = new Decimal(subtotal);
	const addsTransform: AdditionalTransform[] = [];
	for (const additional of additionals) {
		const t = transformAdditional(additional, base, fix);
		base = base.plus(t.effVal);
		addsTransform.push(t);
	}
	const total =
		addsTransform.length === 0
			? new Decimal(0)
			: new Decimal(addsTransform[addsTransform.length - 1].subtotal);
	return { addsTransform, total };
}
