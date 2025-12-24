import { Button } from "~/components/ui/button";
import { Show } from "~/components/Show";
import { useRef, useState } from "react";
import { PriceInput } from "./PriceInput";
import { NameInput } from "./NameInput";
import { BarcodeInput } from "./BarcodeInput";
import { productsStore } from "~/pages/Shop/Right/Product/use-products";
import { basicStore, manualStore } from "~/pages/Shop/use-transaction";
import { generateId } from "~/lib/random";
import { queue, retry } from "~/pages/Shop/utils/queue";
import { tx } from "~/transaction";
import { toast } from "sonner";
import { QtyInput } from "./QtyInput";
import { StockInput } from "./StockInput";
import { useAtom } from "@xstate/store/react";
import { useTab } from "~/pages/shop/use-tab";
import { productsDB } from "../../use-load-db";
import Decimal from "decimal.js";

export function ProductManual() {
  const [error, setError] = useState("");
  const [tab] = useTab();
  const products = useAtom(productsDB);
  const ref = useRef<HTMLInputElement>(null);
  const mode = useAtom(basicStore, (state) => state.mode);
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (tab === undefined) return;
    const form = e.currentTarget;
    if (error !== "") return;
    const { barcode, name, price, qty, stock } = manualStore.get().product;
    if (barcode !== "" && products.find((product) => product.barcode === barcode) !== undefined) {
      setError("Barang sudah ada");
      return;
    }
    const id = generateId();
    productsStore.trigger.addProduct({
      product: {
        total: new Decimal(price).times(qty).toNumber(),
        barcode,
        discounts: [],
        id,
        name,
        price,
        qty,
        stock,
        tab,
      },
    });
    const errMsg = await retry(10, () =>
      tx.product.add({
        id,
        tab,
        price,
        name,
        barcode,
        qty,
        stock,
      })
    );
    if (errMsg !== null) {
      productsStore.trigger.deleteProduct({ id });
      toast.error("Gagal meyimpan catatan baru. Coba lagi.");
      return;
    }
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
    queue.add(() => tx.transaction.update.product.clear(tab));
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
