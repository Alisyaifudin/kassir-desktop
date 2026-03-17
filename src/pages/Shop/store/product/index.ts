import Decimal from "decimal.js";
import { Product as ProductTx } from "~/transaction/product/get-by-tab";
import { produce, WritableDraft } from "immer";
import { createAtom, createStore } from "@xstate/store";
import { useAtom, useSelector } from "@xstate/store/react";
import { calcEffDiscount, calcEffDiscounts } from "./transform-product";
import { calcSubtotal } from "./calc-subtotal";
import { extrasStore } from "../extra";

const subtotalAtom = createAtom(new Decimal(0));

export function useSubtotal() {
  return useAtom(subtotalAtom);
}

function setSubtotal(v: Decimal) {
  extrasStore.trigger.changeSubtotal({ subtotal: v });
  subtotalAtom.set(v);
}

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
      setSubtotal(calcSubtotal(event.products));
      return event.products;
    },
    clear() {
      setSubtotal(new Decimal(0));
      return [];
    },
    addProduct(context, event: { product: Product }) {
      const products = [...context, event.product];
      setSubtotal(calcSubtotal(products));
      return products;
    },
    moveUp(context, event: { id: string }) {
      const index = context.findIndex((product) => product.id === event.id);
      if (index === 0) return;
      return produce(context, (draft) => {
        [draft[index], draft[index - 1]] = [draft[index - 1], draft[index]];
      });
    },
    moveDown(context, event: { id: string }) {
      const index = context.findIndex((product) => product.id === event.id);
      if (index === context.length - 1) return;
      return produce(context, (draft) => {
        [draft[index], draft[index + 1]] = [draft[index + 1], draft[index]];
      });
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
      const products = produce(context, (draft) => {
        const index = draft.findIndex((p) => p.id === event.id);
        if (index === -1) return undefined;
        const product = produce(draft[index], event.recipe);
        const discounts = calcEffDiscounts(
          { price: product.price, qty: product.qty },
          product.discounts,
        );
        product.discounts = discounts;
        product.error = undefined;
        const effDisc = discounts.length === 0 ? 0 : Decimal.sum(...discounts.map((d) => d.eff));
        const total = new Decimal(product.price).times(product.qty).minus(effDisc);
        product.total = total.toNumber();
        draft[index] = product;
      });
      setSubtotal(calcSubtotal(products));
      return products;
    },
    deleteProduct(context, event: { id: string }) {
      const products = context.filter((c) => c.id !== event.id);
      setSubtotal(calcSubtotal(products));
      return products;
    },
    addDiscount(context, event: { id: string; idDisc: string }) {
      const products = produce(context, (draft) => {
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
      setSubtotal(calcSubtotal(products));
      return products;
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
      },
    ) {
      const products = produce(context, (draft) => {
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
      setSubtotal(calcSubtotal(products));
      return products;
    },
    deleteDiscount(context, event: { id: string; idDisc: string }) {
      const products = produce(context, (draft) => {
        const index = draft.findIndex((d) => d.id === event.id);
        if (index === -1) return;
        draft[index].discounts = draft[index].discounts.filter((d) => d.id !== event.idDisc);
      });
      setSubtotal(calcSubtotal(products));
      return products;
    },
  },
});

export function useProduct(id: string) {
  return useSelector(productsStore, (state) => state.context.find((c) => c.id === id)!);
}

export function useProductLength() {
  return useSelector(productsStore, (state) => state.context.length);
}

function updateDiscount(product: Product, indexDisc: number, discount: Discount) {
  if (indexDisc === 0) {
    const base = new Decimal(product.price).times(product.qty);
    const { eff, subtotal } = calcEffDiscount(base, product.price, discount);
    discount.eff = eff;
    discount.subtotal = subtotal.toNumber();
  } else {
    const base = product.discounts[indexDisc - 1].subtotal;
    const { eff, subtotal } = calcEffDiscount(new Decimal(base), product.price, discount);
    discount.eff = eff;
    discount.subtotal = subtotal.toNumber();
  }
  return discount;
}
