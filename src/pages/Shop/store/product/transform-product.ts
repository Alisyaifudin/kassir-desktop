import { Product } from "~/transaction/product/get-by-tab";
import { Discount } from ".";
import Decimal from "decimal.js";

export function transformProduct(products: Product[]) {
  const arr = products.map(({ discounts: d, ...product }) => {
    const discounts =
      d.length === 0 ? [] : calcEffDiscounts({ price: product.price, qty: product.qty }, d);
    const effDisc = d.length === 0 ? 0 : Decimal.sum(...discounts.map((d) => d.eff));
    const total = new Decimal(product.price).times(product.qty).minus(effDisc);
    return {
      total: total.toNumber(),
      discounts,
      ...product,
    };
  });
  return arr;
}

export function calcEffDiscount(
  base: Decimal,
  price: number,
  discount: { value: number; kind: "number" | "percent" | "pcs" },
): { subtotal: Decimal; eff: number } {
  let subtotal = new Decimal(base);
  switch (discount.kind) {
    case "number": {
      const eff = new Decimal(discount.value);
      subtotal = subtotal.minus(eff);
      break;
    }
    case "pcs": {
      const eff = new Decimal(discount.value).times(price);
      subtotal = subtotal.minus(eff);
      break;
    }
    case "percent": {
      const eff = new Decimal(discount.value).div(100).times(subtotal);
      subtotal = subtotal.minus(eff);
      break;
    }
  }
  const eff = base.minus(subtotal);
  return { subtotal, eff: eff.toNumber() };
}

export function calcEffDiscounts(
  item: { price: number; qty: number },
  discounts: { id: string; value: number; kind: "number" | "percent" | "pcs" }[],
): Discount[] {
  const subtotal = new Decimal(item.price).times(item.qty);
  let total = new Decimal(subtotal);
  const discs: Discount[] = [];
  for (const discount of discounts) {
    const { subtotal, eff } = calcEffDiscount(total, item.price, discount);
    total = subtotal;
    discs.push({ ...discount, eff, subtotal: subtotal.toNumber() });
  }
  return discs;
}
