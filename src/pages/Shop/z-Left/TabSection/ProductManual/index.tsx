import { Button } from "~/components/ui/button";
import { useRef, useState } from "react";
import { PriceInput } from "./PriceInput";
import { NameInput } from "./NameInput";
import { BarcodeInput } from "./BarcodeInput";
import { generateId } from "~/lib/random";
import { tx } from "~/transaction";
import { QtyInput } from "./QtyInput";
import Decimal from "decimal.js";
import { useDBProducts } from "~/pages/Shop/store/db";
import { manualStore } from "~/pages/Shop/use-transaction";
import { productsStore } from "~/pages/shop/store/product";
import { useTab } from "~/pages/shop/use-tab";
import { queue } from "~/pages/shop/util-queue";

function extractFormData(formdata: FormData) {
  const barcode = (formdata.get("barcode") as string) ?? "";
  const name = (formdata.get("name") as string) ?? "";
  const price = Number(formdata.get("price")) || 0;
  const qty = Number(formdata.get("qty")) || 0;
  return { barcode, name, price, qty };
}

export function ProductManual() {
  const [error, setError] = useState("");
  const [tab] = useTab();
  const products = useDBProducts();
  const ref = useRef<HTMLInputElement>(null);
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formdata = new FormData(form);
    if (error !== "") return;
    const { barcode, name, price, qty } = extractFormData(formdata);
    if (barcode !== "" && products.find((product) => product.barcode === barcode) !== undefined) {
      setError("Barang sudah ada");
      return;
    }
    if (!Number.isInteger(qty)) {
      setError("Kuantitas harus bulat");
      return;
    }
    if (qty <= 0 || price <= 0) return;
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
        discounts,
      }),
    );
    manualStore.set((prev) => ({
      ...prev,
      product: {
        name: "",
        barcode: "",
        price: 0,
        priceStr: "",
        qty: 0,
        qtyStr: "",
      },
    }));
    form.reset();
    ref.current?.focus();
    queue.add(tx.transaction.update.product.clear(tab));
  }
  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-2 grow shrink p-1 basis-0 overflow-y-auto"
    >
      <BarcodeInput ref={ref} products={products} error={error} setError={setError} />
      <NameInput />
      <PriceInput />
      <QtyInput />
      <Button disabled={error !== ""}>Tambahkan</Button>
    </form>
  );
}
