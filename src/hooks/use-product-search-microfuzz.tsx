// import createFuzzySearch from "@nozbe/microfuzz";
// import { useMemo } from "react";

// export type ProductResult = Pick<
// 	DB.Product,
// 	"barcode" | "name" | "price" | "capital" | "stock" | "id" | "stock_back"
// >;

// // Fuse returns the original item nested within the result object
// // export type FuseProductSearchResult = FuseResult<DB.Product>;

// export const useProductSearch = (products: DB.Product[]) => {
// 	const [name, barcode] = useMemo(() => {
// 		const nameSearch = createFuzzySearch(products, {
// 			// search by `name` property
// 			key: "name",
// 			strategy: "aggressive",
// 		});
// 		const barcodeSearch = createFuzzySearch(products, {
// 			// search by `name` property
// 			key: "barcode",
// 			strategy: "off",
// 		});
// 		return [nameSearch, barcodeSearch] as const;
// 	}, [products]);

// 	// Typed search function
// 	const search = (query: string) => {
// 		const productFromName = name(query).map((q) => q.item);
// 		const productFromBarcode = barcode(query).map((q) => q.item);
// 		const filtered = new Set([...productFromBarcode, ...productFromName]);
// 		return Array.from(filtered);
// 	};

// 	return { search };
// };
