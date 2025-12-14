import { Button } from "~/components/ui/button";
import { Show } from "~/components/Show";
import { useState } from "react";
import { PriceInput } from "./PriceInput";
import { NameInput } from "./NameInput";
import { BarcodeInput } from "./BarcodeInput";
import { Product } from "~/database/product/caches";
import { productsStore } from "~/pages/Shop/Right/Product/use-products";
import { produce } from "immer";
import { basicStore, manualStore } from "~/pages/Shop/use-transaction";
import { generateId } from "~/lib/random";
import Decimal from "decimal.js";
import { queue, retry } from "~/pages/Shop/utils/queue";
import { tx } from "~/transaction";
import { toast } from "sonner";
import { QtyInput } from "./QtyInput";
import { useStoreValue } from "@simplestack/store/react";
import { StockInput } from "./StockInput";

const store = manualStore.select("product");

export function ProductManual({ products }: { products: Product[] }) {
  const [error, setError] = useState("");
  const mode = useStoreValue(basicStore.select("mode"));
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (error !== "") return;
    const { barcode, name, price, qty, stock } = store.get();
    if (barcode !== "" && products.find((product) => product.barcode === barcode) !== undefined) {
      setError("Barang sudah ada");
      return;
    }
    const tab = basicStore.select("tab").get();
    const id = generateId();
    productsStore.set(
      produce((draft) => {
        draft.push({
          barcode,
          discounts: [],
          id,
          name,
          price,
          qty,
          stock,
          subtotal: new Decimal(price),
          tab,
          discEff: new Decimal(0),
        });
      }),
    );
    const errMsg = await retry(10, () =>
      tx.product.add({
        id,
        tab,
        price,
        name,
        barcode,
        qty,
        stock,
      }),
    );
    if (errMsg !== null) {
      productsStore.set((prev) => prev.filter((p) => p.id !== id));
      toast.error("Gagal meyimpan catatan baru. Coba lagi.");
      return;
    }
    store.set({
      barcode: "",
      name: "",
      price: 0,
      qty: 0,
      stock: 0,
    });
    queue.add(() => tx.transaction.update.product.clear(tab));
  }
  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-2 grow shrink px-1 basis-0 overflow-y-auto"
    >
      <BarcodeInput products={products} error={error} setError={setError} />
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
