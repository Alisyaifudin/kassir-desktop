import Decimal from "decimal.js";
import type { Product } from ".";

export function calcSubtotal(products: Product[]) {
  if (products.length === 0) return new Decimal(0);
  return Decimal.sum(...products.map((p) => p.total));
}
