import { useStoreValue } from "@simplestack/store/react";
import { useDebouncedCallback } from "use-debounce";
import { Input } from "~/components/ui/input";
import { DEBOUNCE_DELAY } from "~/lib/constants";
import { manualStore } from "~/pages/Shop/use-transaction";
import { queue } from "~/pages/Shop/utils/queue";
import { tx } from "~/transaction";
import { Field } from "../Field";
import { Product } from "~/database/product/caches";
import { useTab } from "~/pages/shop/use-tab";

const store = manualStore.select("product").select("barcode");

export function BarcodeInput({
  products,
  error,
  setError,
}: {
  products: Product[];
  error: string;
  setError: (v: string) => void;
}) {
  const value = useStoreValue(store);
  const [tab] = useTab();
  const save = useDebouncedCallback((v: string) => {
    queue.add(() => tx.transaction.update.product.barcode(tab, v));
  }, DEBOUNCE_DELAY);
  function handleBarcode(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.currentTarget.value.trim();
    store.set(value);
    if (value !== "" && products.find((product) => product.barcode === value) !== undefined) {
      setError("Barang sudah ada");
      return;
    }
    setError("");
    save(value);
  }
  return (
    <Field label="Barcode" error={error}>
      <Input type="text" value={value} onChange={handleBarcode} aria-autocomplete="list" />
    </Field>
  );
}
