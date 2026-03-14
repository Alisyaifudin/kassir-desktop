import { Button } from "~/components/ui/button";
import { Show } from "~/components/Show";
import { useRef, useState } from "react";
import { PriceInput } from "./PriceInput";
import { NameInput } from "./NameInput";
import { BarcodeInput } from "./BarcodeInput";
import { generateId } from "~/lib/random";
import { tx } from "~/transaction";
import { QtyInput } from "./QtyInput";
import { StockInput } from "./StockInput";
import Decimal from "decimal.js";
import { useDBProducts } from "~/pages/Shop/store/db";
import { manualStore, useMode } from "~/pages/Shop/use-transaction";
import { productsStore } from "~/pages/shop/store/product";
import { useTab } from "~/pages/shop/use-tab";
import { queue } from "~/pages/shop/util-queue";

export function ProductManual() {
  const [error, setError] = useState("");
  const [tab] = useTab();
  const products = useDBProducts();
  const ref = useRef<HTMLInputElement>(null);
  const mode = useMode();
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    if (error !== "") return;
    const { barcode, name, price, qty, stock } = manualStore.get().product;
    if (barcode !== "" && products.find((product) => product.barcode === barcode) !== undefined) {
      setError("Barang sudah ada");
      return;
    }
    const id = generateId();
    const discounts = [
      {
        id: generateId(),
        value: 0,
        kind: "percent" as const,
        eff: 0,
        subtotal: new Decimal(price).times(qty).toNumber(),
      },
    ];
    productsStore.trigger.addProduct({
      product: {
        total: new Decimal(price).times(qty).toNumber(),
        barcode,
        discounts,
        id,
        name,
        price,
        qty,
        stock,
        tab,
      },
    });
    queue.add(
      tx.product.add.one({
        id,
        tab,
        price,
        name,
        barcode,
        qty,
        stock,
        discounts,
      }),
    );
    manualStore.set((prev) => ({
      ...prev,
      product: {
        name: "",
        barcode: "",
        price: 0,
        stock: 0,
        qty: 0,
      },
    }));
    form.reset();
    ref.current?.focus();
    queue.add(tx.transaction.update.product.clear(tab));
  }
  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-2 grow shrink px-1 basis-0 overflow-y-auto"
    >
      <BarcodeInput ref={ref} products={products} error={error} setError={setError} />
      <NameInput />
      <PriceInput />
      <div className="flex gap-1 items-center">
        <QtyInput />
        <Show when={mode === "sell"}>
          <StockInput />
        </Show>
      </div>
      <Button disabled={error !== ""}>Tambahkan</Button>
    </form>
  );
}
