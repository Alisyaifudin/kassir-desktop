import { Product } from "~/database/product/caches";

export function sorting(
  products: Product[],
  by: "barcode" | "name" | "price" | "capital" | "stock",
  dir: "asc" | "desc"
): Product[] {
  const sign = dir === "asc" ? 1 : -1;
  switch (by) {
    case "barcode":
      products.sort((a, b) => {
        if (a.barcode === undefined && b.barcode === undefined) return 0 * sign;
        if (a.barcode === undefined) return -1 * sign;
        if (b.barcode === undefined) return 1 * sign;
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
    case "name":
      products.sort((a, b) => a.name.localeCompare(b.name) * sign);
      break;
    // case "same": {
    // 	products = products.filter((p) => p.capital >= p.price);
    // 	products.sort((a, b) => (a.price - b.price) * sign);
    // 	products.sort((a, b) => a.name.localeCompare(b.name) * sign);
    // }
  }
  return products;
}
