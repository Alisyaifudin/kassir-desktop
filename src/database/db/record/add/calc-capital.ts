import Decimal from "decimal.js";
import { Effect } from "effect";
import { RecordType } from "./type";
import { ProductInStock } from "./get-products";

function calcCapitalRaw({
  product,
  subtotal,
  grandTotal,
  fix,
}: {
  product: RecordType.Product;
  subtotal: number;
  grandTotal: number;
  fix: number;
}): number {
  const eff =
    subtotal > 0 ? new Decimal(product.total).div(subtotal).times(grandTotal) : new Decimal(0);
  const capital = product.qty > 0 ? eff.div(product.qty) : 0;
  return Number(capital.toFixed(fix));
}

export function calcEffCapital({
  products,
  subtotal,
  grandTotal,
  fix,
  productsInStock,
}: {
  products: RecordType.Product[];
  subtotal: number;
  grandTotal: number;
  fix: number;
  productsInStock: Map<string, ProductInStock>;
}) {
  return Effect.succeed(
    products.map((p) => {
      const capitalRaw = calcCapitalRaw({ product: p, subtotal, grandTotal, fix });
      const inStock =
        p.product?.id !== undefined ? productsInStock.get(p.product.id) : undefined;
      const prevCapital = inStock?.capital ?? 0;
      const stock = inStock?.stock ?? 0;
      const capital = Number(
        calcCombinedCapital(prevCapital, stock, capitalRaw, p.qty).toFixed(fix),
      );
      return { ...p, capitalRaw, capital } as RecordType.ProductFull;
    }),
  );
}

function calcCombinedCapital(prevCapital: number, stock: number, rawCapital: number, qty: number) {
  if (stock <= 0) return rawCapital;
  const weight = stock + qty;
  return (rawCapital * qty + prevCapital * stock) / weight;
}
