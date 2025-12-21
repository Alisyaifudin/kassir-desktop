import { use, useEffect, useState } from "react";
import Decimal from "decimal.js";
// import { loadStore } from "../use-total";
import { DefaultError, Result } from "~/lib/utils";
import { Product as ProductTx } from "~/transaction/product/get-by-tab";
import { produce, WritableDraft } from "immer";
import { createStore } from "@xstate/store";
import { loadStore } from "../use-total";
import { useSelector } from "@xstate/store/react";

export type Product = Omit<ProductTx, "discounts"> & {
  discounts: Discount[];
  total: number;
  error?: string;
};

export type Discount = {
  value: number;
  eff: number;
  subtotal: number;
  kind: TX.DiscKind;
  id: string;
};

export const productsStore = createStore({
  context: [] as Product[],
  on: {
    init(_context, event: { products: Product[] }) {
      return event.products;
    },
    clear() {
      return [];
    },
    addProduct(context, event: { product: Product }) {
      return [...context, event.product];
    },
    updateErrors(context, event: { errors: { id: string; message: string }[] }) {
      return produce(context, (draft) => {
        const errors = event.errors;
        for (const error of errors) {
          const index = draft.findIndex((d) => d.id === error.id);
          if (index === -1) continue;
          draft[index].error = error.message;
        }
      });
    },
    updateProduct(context, event: { id: string; recipe: (draft: WritableDraft<Product>) => void }) {
      return produce(context, (draft) => {
        const index = draft.findIndex((p) => p.id === event.id);
        if (index === -1) return undefined;
        const product = produce(draft[index], event.recipe);
        const discounts = calcEffDiscounts(
          { price: product.price, qty: product.qty },
          product.discounts
        );
        product.discounts = discounts;
        product.error = undefined;
        const effDisc = discounts.length === 0 ? 0 : Decimal.sum(...discounts.map((d) => d.eff));
        const total = new Decimal(product.price).times(product.qty).minus(effDisc);
        product.total = total.toNumber();
        draft[index] = product;
      });
    },
    deleteProduct(context, event: { id: string }) {
      return context.filter((c) => c.id !== event.id);
    },
    addDiscount(context, event: { id: string; idDisc: string }) {
      return produce(context, (draft) => {
        const index = draft.findIndex((d) => d.id === event.id);
        if (index === -1) return;
        const product = draft[index];
        const subtotal =
          product.discounts.length === 0
            ? new Decimal(product.price).times(product.qty).toNumber()
            : product.discounts[product.discounts.length - 1].subtotal;
        draft[index].discounts.push({
          eff: 0,
          subtotal,
          id: event.idDisc,
          value: 0,
          kind: "percent",
        });
      });
    },
    updateDiscount(
      context,
      event: {
        id: string;
        idDisc: string;
        updates: {
          value?: number;
          kind?: TX.DiscKind;
        };
      }
    ) {
      return produce(context, (draft) => {
        const index = draft.findIndex((d) => d.id === event.id);
        if (index === -1) return;
        const indexDisc = draft[index].discounts.findIndex((d) => d.id === event.idDisc);
        if (indexDisc === -1) return;
        const product = draft[index];
        let discount = product.discounts[indexDisc];
        if (event.updates.value !== undefined) {
          discount.value = event.updates.value;
        }
        if (event.updates.kind !== undefined) {
          discount.kind = event.updates.kind;
        }
        if (event.updates.value !== undefined || event.updates.kind !== undefined) {
          discount = updateDiscount(product, indexDisc, discount);
          draft[index].discounts[indexDisc] = discount;
          const d = draft[index].discounts;
          const effDisc = d.length === 0 ? 0 : Decimal.sum(...d.map((d) => d.eff));
          const total = new Decimal(product.price).times(product.qty).minus(effDisc);
          draft[index].total = total.toNumber();
        }
      });
    },
    deleteDiscount(context, event: { id: string; idDisc: string }) {
      return produce(context, (draft) => {
        const index = draft.findIndex((d) => d.id === event.id);
        if (index === -1) return;
        draft[index].discounts = draft[index].discounts.filter((d) => d.id !== event.idDisc);
      });
    },
  },
});

export function useInitProducts(promise: Promise<Result<DefaultError, ProductTx[]>>) {
  const [errMsg, products] = use(promise);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (products === null) return;
    loadStore.set((prev) => ({ ...prev, product: true }));
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
    productsStore.trigger.init({ products: arr });
    setLoading(false);
  }, [products]);
  return [loading, errMsg] as const;
}

export function useProduct(id: string) {
  return useSelector(productsStore, (state) => state.context.find((c) => c.id === id)!);
}

function calcEffDisc(
  base: Decimal,
  price: number,
  discount: { value: number; kind: "number" | "percent" | "pcs" }
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

function calcEffDiscounts(
  item: { price: number; qty: number },
  discounts: { id: string; value: number; kind: "number" | "percent" | "pcs" }[]
): Discount[] {
  const subtotal = new Decimal(item.price).times(item.qty);
  let total = new Decimal(subtotal);
  const discs: Discount[] = [];
  for (const discount of discounts) {
    const { subtotal, eff } = calcEffDisc(total, item.price, discount);
    total = subtotal;
    discs.push({ ...discount, eff, subtotal: subtotal.toNumber() });
  }
  return discs;
}

function updateDiscount(product: Product, indexDisc: number, discount: Discount) {
  if (indexDisc === 0) {
    const subtotal = new Decimal(product.price).times(product.qty);
    const { eff } = calcEffDisc(subtotal, product.price, discount);
    discount.eff = eff;
    discount.subtotal = subtotal.toNumber();
  } else {
    const subtotal = product.discounts[indexDisc - 1].subtotal;
    const { eff } = calcEffDisc(new Decimal(subtotal), product.price, discount);
    discount.eff = eff;
    discount.subtotal = subtotal;
  }
  return discount;
}
