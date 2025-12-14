// import { store } from "@simplestack/store";
// import { use, useEffect, useState } from "react";
// import Decimal from "decimal.js";
// // import { useStoreValue } from "@simplestack/store/react";
// import { loadStore } from "../use-total";
// import { DefaultError, Result } from "~/lib/utils";
// import { Product as ProductTx } from "~/transaction/product/get-by-tab";
// import { produce, WritableDraft } from "immer";

// export type Product = Omit<ProductTx, "discounts"> & {
//   discounts: Discount[];
// };

// export type Discount = {
//   value: number;
//   eff: number;
//   kind: TX.DiscKind;
//   id: string;
// };

// export const productsStore = store<Product[]>([]);

// export function updateProduct(id: string, recipe: (draft: WritableDraft<Product>) => void) {
//   productsStore.set(
//     produce((draft) => {
//       const index = draft.findIndex((p) => p.id === id);
//       if (index === -1) return undefined;
//       recipe(draft[index]);
//     }),
//   );
// }

// export function updateDiscount(id: string, recipe: (draft: WritableDraft<Discount>) => void) {
//   productsStore.set(
//     produce((draft) => {
//       let index = -1;
//       let indexDisc = -1;
//       top: for (let i = 0; i < draft.length; i++) {
//         const product = draft[i];
//         const discounts = product.discounts;
//         for (let j = 0; j < discounts.length; j++) {
//           const discount = discounts[j];
//           if (discount.id === id) {
//             index = i;
//             indexDisc = j;
//             break top;
//           }
//         }
//       }
//       if (index === -1 || indexDisc === -1) return undefined;
//       recipe(draft[index].discounts[indexDisc]);
//     }),
//   );
// }

// export function useInitProducts(promise: Promise<Result<DefaultError, ProductTx[]>>) {
//   const [errMsg, products] = use(promise);
//   const [loading, setLoading] = useState(true);
//   useEffect(() => {
//     if (products === null) return;
//     loadStore.select("item").set(true);
//     const arr = products.map(({ discounts: d, ...product }) => {
//       const discounts = calcEffDiscounts({ price: product.price, qty: product.qty }, d);
//       return {
//         discounts,
//         ...product,
//       };
//     });
//     productsStore.set(arr);
//     setLoading(false);
//   }, [products]);
//   return [loading, errMsg] as const;
// }

// // export function useIds() {
// //   const items = useStoreValue(productsStore);
// //   return items.map((i) => i.id);
// // }
// function calcEffDisc(
//   base: Decimal,
//   item: { price: number; qty: number },
//   discount: { value: number; kind: "number" | "percent" | "pcs" },
// ): { subtotal: Decimal; eff: number } {
//   let subtotal = new Decimal(base);
//   switch (discount.kind) {
//     case "number": {
//       const eff = new Decimal(discount.value);
//       subtotal = subtotal.minus(eff);
//       break;
//     }
//     case "pcs": {
//       const eff = new Decimal(discount.value).times(item.price);
//       subtotal = subtotal.minus(eff);
//       break;
//     }
//     case "percent": {
//       const eff = new Decimal(discount.value).div(100).times(subtotal);
//       subtotal = subtotal.minus(eff);
//       break;
//     }
//   }
//   const eff = base.minus(subtotal);
//   return { subtotal, eff: eff.toNumber() };
// }

// function calcEffDiscounts(
//   item: { price: number; qty: number },
//   discounts: { id: string; value: number; kind: "number" | "percent" | "pcs" }[],
// ): Discount[] {
//   const subtotal = new Decimal(item.price).times(item.qty);
//   let total = new Decimal(subtotal);
//   const discs: Discount[] = [];
//   for (const discount of discounts) {
//     const { subtotal, eff } = calcEffDisc(total, item, discount);
//     total = subtotal;
//     discs.push({ ...discount, eff });
//   }
//   return discs;
// }
