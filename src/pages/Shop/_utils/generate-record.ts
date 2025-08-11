import Decimal from "decimal.js";
import { Additional, Item, Record } from "./schema";

export type ItemTransformRaw = {
	discs: {
		value: number;
		effVal: number;
		kind: DB.ValueKind;
		subtotal: number;
	}[];
	grandTotal: number;
	total: number;
} & Item;

export type ItemTransform = {
	discs: {
		value: number;
		effVal: number;
		kind: DB.ValueKind;
		subtotal: number;
	}[];
	grandTotal: number;
	total: number;
	capital: number;
} & Omit<Item, "capital">;

export type RecordTransform = {
	totalFromItems: number;
	totalDiscount: number; // eff
	totalAfterDiscount: number;
	totalAdditional: number;
	totalAfterAdditional: number;
	grandTotal: number;
	change: number;
} & Record;

export type AdditionalTransfrom = {
	effVal: number;
	subtotal: number;
} & Additional;

export type Summary = {
	record: RecordTransform;
	items: ItemTransform[];
	additionals: AdditionalTransfrom[];
};

export function generateRecordSummary({
	record,
	items,
	additionals,
	mode,
	fix,
}: {
	record: Record;
	items: Item[];
	additionals: Additional[];
	mode: DB.Mode;
	fix: number;
}): Summary {
	const itemTransforms = transformItems(items, fix);
	const { totalDiscount, totalFromItems, totalAfterDiscount } = calcTotalDiscounts(
		itemTransforms,
		record.discVal,
		record.discKind,
		fix
	);
	const addTransfroms = transformAdditionals(additionals, totalAfterDiscount, fix);
	const { totalAdditional, totalAfterAdditional } = calcTotalAdditional(
		addTransfroms,
		totalAfterDiscount,
		fix
	);
	const grandTotal = new Decimal(totalAfterAdditional.plus(record.rounding).toFixed(fix));
	// const totalQty =
	// 	itemTransforms.length === 0
	// 		? 0
	// 		: itemTransforms.map((i) => i.qty).reduce((prev, curr) => prev + curr);
	for (const item of itemTransforms) {
		if (mode === "buy") {
			item.capital = calcCapital(item, totalFromItems, grandTotal.toNumber(), fix); // now capital must exist
		} else {
			item.capital ??= 0;
		}
	}
	const change = new Decimal(record.pay).minus(grandTotal);
	return {
		items: itemTransforms as ItemTransform[],
		additionals: addTransfroms,
		record: {
			...record,
			change: change.toNumber(),
			grandTotal: grandTotal.toNumber(),
			totalAdditional,
			totalAfterAdditional: totalAfterAdditional.toNumber(),
			totalAfterDiscount: totalAfterDiscount.toNumber(),
			totalDiscount,
			totalFromItems,
		},
	};
}

function calcEffVal(
	v: { value: number; kind: DB.ValueKind },
	base: Decimal,
	fix: number
): { subtotal: Decimal; effVal: number } {
	let effVal = new Decimal(0);
	switch (v.kind) {
		case "number":
			effVal = new Decimal(new Decimal(v.value).toFixed(fix));
			break;
		case "percent":
			effVal = new Decimal(base.times(v.value).div(100).toFixed(fix));
	}
	const subtotal = base.minus(effVal);
	return { effVal: effVal.toNumber(), subtotal };
}

function transformItem(item: Item, fix: number): ItemTransformRaw {
	const discounts = item.discs;
	let grandTotal = new Decimal(new Decimal(item.price).times(item.qty).toFixed(fix));
	const total = new Decimal(grandTotal);
	const transformDiscs: ItemTransform["discs"] = [];
	for (const disc of discounts) {
		const { subtotal, effVal } = calcEffVal(disc, grandTotal, fix);
		transformDiscs.push({
			value: disc.value,
			kind: disc.kind,
			subtotal: subtotal.toNumber(),
			effVal,
		});
		grandTotal = subtotal;
	}
	return {
		...item,
		discs: transformDiscs,
		grandTotal: grandTotal.toNumber(),
		total: total.toNumber(),
	};
}

function transformItems(items: Item[], fix: number): ItemTransformRaw[] {
	return items.map((item) => transformItem(item, fix));
}

function calcTotalDiscounts(
	items: ItemTransformRaw[],
	discVal: number,
	discKind: DB.ValueKind,
	fix: number
): {
	totalFromItems: number;
	totalDiscount: number;
	totalAfterDiscount: Decimal;
} {
	const totalFromItems =
		items.length > 0
			? new Decimal(Decimal.sum(...items.map((item) => item.grandTotal)).toFixed(fix))
			: new Decimal(0);
	const { effVal, subtotal } = calcEffVal({ value: discVal, kind: discKind }, totalFromItems, fix);
	const totalDiscount = effVal;
	const totalAfterDiscount = subtotal;
	return {
		totalDiscount: totalDiscount,
		totalFromItems: totalFromItems.toNumber(),
		totalAfterDiscount,
	};
}

function transformAdditional(
	additional: Additional,
	base: Decimal,
	fix: number
): AdditionalTransfrom {
	const { effVal, subtotal } = calcEffVal(additional, base, fix);
	return {
		...additional,
		effVal,
		subtotal: subtotal.toNumber(),
	};
}

function transformAdditionals(
	additionals: Additional[],
	totalAfterDiscount: Decimal,
	fix: number
): AdditionalTransfrom[] {
	let base = totalAfterDiscount;
	const addTransfroms: AdditionalTransfrom[] = [];
	for (const additional of additionals) {
		const t = transformAdditional(additional, base, fix);
		base = base.plus(t.effVal);
		addTransfroms.push(t);
	}
	return addTransfroms;
}

function calcTotalAdditional(
	addTransforms: AdditionalTransfrom[],
	totalAfterDiscount: Decimal,
	fix: number
): {
	totalAdditional: number;
	totalAfterAdditional: Decimal;
} {
	const totalAdditional =
		addTransforms.length > 0
			? new Decimal(Decimal.sum(...addTransforms.map((a) => a.effVal)).toFixed(fix))
			: new Decimal(0);
	const totalAfterAdditional = totalAfterDiscount.plus(totalAdditional);
	return {
		totalAdditional: totalAdditional.toNumber(),
		totalAfterAdditional,
	};
}

export function calcCapital(
	item: ItemTransformRaw,
	totalFromItems: number,
	grandTotal: number,
	fix: number
): number {
	const k = new Decimal(grandTotal).div(totalFromItems);
	let capital = k.times(item.price);
	return Number(capital.toFixed(fix));
}
