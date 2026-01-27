import { useDebouncedCallback } from "use-debounce";
import { Input } from "~/components/ui/input";
import { DEBOUNCE_DELAY } from "~/lib/constants";
import { manualStore } from "~/pages/Shop/use-transaction";
import { queue } from "~/pages/Shop/utils/queue";
import { tx } from "~/transaction";
import { Field } from "../Field";
import { Product } from "~/database/product/caches";
import { useTab } from "~/pages/shop/use-tab";
import { useAtom } from "@xstate/store/react";
import { produce } from "immer";
import { forwardRef } from "react";

type Props = {
  products: Product[];
  error: string;
  setError: (v: string) => void;
};

export const BarcodeInput = forwardRef<HTMLInputElement, Props>(
  ({ products, error, setError }, ref) => {
    const value = useAtom(manualStore, (state) => state.product.barcode);
    const [tab] = useTab();
    const save = useDebouncedCallback((v: string) => {
      if (tab === undefined) return;
      queue.add(() => tx.transaction.update.product.barcode(tab, v));
    }, DEBOUNCE_DELAY);
    function handleBarcode(e: React.ChangeEvent<HTMLInputElement>) {
      const value = e.currentTarget.value.trim();
      manualStore.set(
        produce((draft) => {
          draft.product.barcode = value;
        }),
      );
      if (value !== "" && products.find((product) => product.barcode === value) !== undefined) {
        setError("Barang sudah ada");
        return;
      }
      setError("");
      save(value);
    }
    return (
      <Field label="Barcode" error={error}>
        <Input
          type="text"
          ref={ref}
          value={value}
          onChange={handleBarcode}
          aria-autocomplete="list"
        />
      </Field>
    );
  },
);
