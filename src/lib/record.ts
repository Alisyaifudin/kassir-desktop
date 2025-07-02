import Decimal from "decimal.js";

export type ItemTransform = {
	discs: {
		value: number;
		effVal: number;
		kind: DB.ValueKind;
		subtotal: number;
	}[];
	grandTotal: number;
	total: number;
} & DB.RecordItem;

export type RecordTransform = {
	totalFromItems: number;
	totalDiscount: number; // eff
	totalAfterDiscount: number;
	totalAdditional: number;
	totalAfterAdditional: number;
	grandTotal: number;
	change: number;
} & DB.Record;

export type AdditionalTransfrom = {
	effVal: number;
	subtotal: number;
} & DB.Additional;

export type Summary = {
	record: RecordTransform;
	items: ItemTransform[];
	additionals: AdditionalTransfrom[];
};

export function generateRecordSummary({
	record,
	items,
	additionals,
	discounts,
}: {
	record: DB.Record;
	items: DB.RecordItem[];
	additionals: DB.Additional[];
	discounts: DB.Discount[];
}): Summary {
	const itemTransforms = transformItems(
		items.filter((item) => item.timestamp === record.timestamp),
		discounts
	);
	const { totalDiscount, totalFromItems, totalAfterDiscount } = calcTotalDiscounts(
		itemTransforms,
		record.disc_val,
		record.disc_kind
	);
	const addTransfroms = transformAdditionals(
		additionals.filter((add) => add.timestamp === record.timestamp),
		totalAfterDiscount
	);
	const { totalAdditional, totalAfterAdditional } = calcTotalAdditional(
		addTransfroms,
		totalAfterDiscount
	);
	const grandTotal = totalAfterAdditional.plus(record.rounding);
	const change = new Decimal(record.pay).minus(grandTotal);
	return {
		items: itemTransforms,
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
	base: Decimal
): { subtotal: Decimal; effVal: number } {
	let effVal = 0;
	switch (v.kind) {
		case "number":
			effVal = v.value;
			break;
		case "percent":
			effVal = base.times(v.value).div(100).toNumber();
	}
	const subtotal = base.minus(effVal);
	return { effVal, subtotal };
}

function transformItem(item: DB.RecordItem, discs: DB.Discount[]): ItemTransform {
	const discounts = discs.filter((disc) => disc.record_item_id === item.id);
	let grandTotal = new Decimal(item.price).times(item.qty);
	const total = new Decimal(grandTotal);
	const transformDiscs: ItemTransform["discs"] = [];
	for (const disc of discounts) {
		const { subtotal, effVal } = calcEffVal(disc, grandTotal);
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

function transformItems(items: DB.RecordItem[], discounts: DB.Discount[]): ItemTransform[] {
	return items.map((item) => transformItem(item, discounts));
}

function calcTotalDiscounts(
	items: ItemTransform[],
	discVal: number,
	discKind: DB.ValueKind
): {
	totalFromItems: number;
	totalDiscount: number;
	totalAfterDiscount: Decimal;
} {
	const totalFromItems =
		items.length === 0 ? new Decimal(0) : Decimal.sum(...items.map((item) => item.grandTotal));
	const { effVal, subtotal } = calcEffVal({ value: discVal, kind: discKind }, totalFromItems);
	const totalDiscount = effVal;
	const totalAfterDiscount = subtotal;
	return {
		totalDiscount: totalDiscount,
		totalFromItems: totalFromItems.toNumber(),
		totalAfterDiscount,
	};
}

function transformAdditional(additional: DB.Additional, base: Decimal): AdditionalTransfrom {
	const { effVal, subtotal } = calcEffVal(additional, base);
	return {
		...additional,
		effVal,
		subtotal: subtotal.toNumber(),
	};
}

function transformAdditionals(
	additionals: DB.Additional[],
	totalAfterDiscount: Decimal
): AdditionalTransfrom[] {
	let base = totalAfterDiscount;
	const addTransfroms: AdditionalTransfrom[] = [];
	for (const additional of additionals) {
		const t = transformAdditional(additional, base);
		base = base.plus(t.effVal);
		addTransfroms.push(t);
	}
	return addTransfroms;
}

function calcTotalAdditional(
	addTransforms: AdditionalTransfrom[],
	totalAfterDiscount: Decimal
): {
	totalAdditional: number;
	totalAfterAdditional: Decimal;
} {
	const totalAdditional =
		addTransforms.length === 0
			? new Decimal(0)
			: Decimal.sum(...addTransforms.map((a) => a.effVal));
	const totalAfterAdditional = totalAfterDiscount.plus(totalAdditional);
	return {
		totalAdditional: totalAdditional.toNumber(),
		totalAfterAdditional,
	};
}

export function calcCapital(
	item: ItemTransform,
	totalFromItems: number,
	grandTotal: number,
	totalQty: number
): number {
	let delta = new Decimal(grandTotal).minus(totalFromItems);
	delta = delta.div(totalQty);
	let capital = new Decimal(item.grandTotal).div(item.qty);
	capital = capital.plus(delta);
	return capital.toNumber();
}
