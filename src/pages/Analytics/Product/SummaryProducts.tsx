import Decimal from "decimal.js";
import { useMemo } from "react";
import { ProductRecord } from "~/database/product";

type Props = {
	products: ProductRecord[];
	mode: "sell" | "buy";
	start: number;
	end: number;
};

export function SummaryProduct({ products: all, mode, start, end }: Props) {
	const products = useMemo(() => {
		const products: ProductRecord[] = [];
		for (const p of all) {
			if (p.timestamp < start || p.timestamp > end || p.mode !== mode) {
				continue;
			}
			const findIndex = products.findIndex((product) => product.id === p.id);
			if (findIndex === -1) {
				products.push({ ...p });
			} else {
				products[findIndex].qty += p.qty;
			}
		}
		return products;
	}, [start, end, mode, all]);
	return <p className="text-3xl">Produk: {calcSum(products)}</p>;
}

function calcSum(products: ProductRecord[]): number {
	let val = new Decimal(0);
	for (const v of products) {
		val = val.add(v.qty);
	}
	return val.toNumber();
}
