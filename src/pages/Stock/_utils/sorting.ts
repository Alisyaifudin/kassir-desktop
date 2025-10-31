import { type ProductResult } from "~/hooks/useProductSearch.tsx";

export function sorting(
	products: ProductResult[],
	by: "barcode" | "name" | "price" | "capital" | "stock" | "stock_back" | "same",
	dir: "asc" | "desc"
) {
	const sign = dir === "asc" ? 1 : -1;
	switch (by) {
		case "barcode":
			products.sort((a, b) => {
				if (a.barcode === null && b.barcode === null) return 0 * sign;
				if (a.barcode === null) return -1 * sign;
				if (b.barcode === null) return 1 * sign;
				return a.barcode.localeCompare(b.barcode) * sign;
			});
			break;
		case "price":
			products.sort((a, b) => (a.price - b.price) * sign);
			break;
		case "capital":
			products.sort((a, b) => (a.capital - b.capital) * sign);
			break;
		case "stock":
			products.sort((a, b) => (a.stock - b.stock) * sign);
			break;
		case "stock_back":
			products.sort((a, b) => (a.stock_back - b.stock_back) * sign);
			break;
		case "name":
			products.sort((a, b) => a.name.localeCompare(b.name) * sign);
			break;
		case "same": {
			products = products.filter((p) => p.capital === p.price);
			products.sort((a, b) => a.name.localeCompare(b.name) * sign);
		}
	}
	return products;
}
