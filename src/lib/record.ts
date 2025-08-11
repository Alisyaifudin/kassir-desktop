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
	const fix = record.fix;
	const itemTransforms = transformItems(
		items.filter((item) => item.timestamp === record.timestamp),
		discounts,
		fix
	);
	const { totalDiscount, totalFromItems, totalAfterDiscount } = calcTotalDiscounts(
		itemTransforms,
		record.disc_val,
		record.disc_kind,
		fix
	);
	const addTransfroms = transformAdditionals(
		additionals.filter((add) => add.timestamp === record.timestamp),
		totalAfterDiscount,
		fix
	);
	const { totalAdditional, totalAfterAdditional } = calcTotalAdditional(
		addTransfroms,
		totalAfterDiscount,
		fix
	);
	const grandTotal = Number(totalAfterAdditional.plus(record.rounding).toFixed(fix));
	const change = Number(new Decimal(record.pay).minus(grandTotal).toFixed(fix));
	return {
		items: itemTransforms,
		additionals: addTransfroms,
		record: {
			...record,
			change,
			grandTotal,
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
			effVal = new Decimal(v.value.toFixed(fix));
			break;
		case "percent":
			effVal = new Decimal(base.times(v.value).div(100).toFixed(fix));
	}
	const subtotal = base.minus(effVal);
	return { effVal: effVal.toNumber(), subtotal };
}

function transformItem(item: DB.RecordItem, discs: DB.Discount[], fix: number): ItemTransform {
	const discounts = discs.filter((disc) => disc.record_item_id === item.id);
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

function transformItems(
	items: DB.RecordItem[],
	discounts: DB.Discount[],
	fix: number
): ItemTransform[] {
	return items.map((item) => transformItem(item, discounts, fix));
}

function calcTotalDiscounts(
	items: ItemTransform[],
	discVal: number,
	discKind: DB.ValueKind,
	fix: number
): {
	totalFromItems: number;
	totalDiscount: number;
	totalAfterDiscount: Decimal;
} {
	const totalFromItems =
		items.length === 0
			? new Decimal(0)
			: new Decimal(Decimal.sum(...items.map((item) => item.grandTotal)).toFixed(fix));
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
	additional: DB.Additional,
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
	additionals: DB.Additional[],
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
		addTransforms.length === 0
			? new Decimal(0)
			: new Decimal(Decimal.sum(...addTransforms.map((a) => a.effVal)).toFixed(fix));
	const totalAfterAdditional = totalAfterDiscount.plus(totalAdditional);
	return {
		totalAdditional: totalAdditional.toNumber(),
		totalAfterAdditional,
	};
}

// T = n1*c1 + n2*c2 + ...
// c ~ p*k
// T = k(p1*n1 + p2*n2 + ...)
// k = T/totalFromItems
export function calcCapital(
	item: ItemTransform,
	totalFromItems: number,
	grandTotal: number,
	fix: number
): number {
	const k = new Decimal(grandTotal).div(totalFromItems);
	let capital = k.times(item.price);
	return Number(capital.toFixed(fix));
}
