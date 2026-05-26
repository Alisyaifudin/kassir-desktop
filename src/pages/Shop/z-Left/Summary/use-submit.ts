import { Effect, Either } from "effect";
import { submit } from "./util-submit";
import { log } from "~/lib/log";
import { toast } from "sonner";
import { setComplete } from "../../z-Complete";
import { useState } from "react";
import { productsStore } from "../../store/product";
import { useDBProducts } from "../../store/db";

export function useSubmit() {
  const [loading, setLoading] = useState(false);
  const productsDB = useDBProducts();
  async function handleSubmit(isCredit: boolean) {
    const products = productsStore.get().context;
    let errorFlag = false;
    for (const product of products) {
      const duplicateStock =
        product.barcode === ""
          ? undefined
          : productsDB.find((p) => p.barcode === product.barcode && product.product === undefined);
      const duplicateSelf =
        product.barcode === ""
          ? undefined
          : products.find((p) => p.barcode === product.barcode && p.id !== product.id);
      if (duplicateStock !== undefined) {
        productsStore.trigger.updateError({
          id: product.id,
          message: "Kode yang sama sudah ada di stok: " + duplicateStock.name,
        });
        errorFlag = true;
      } else if (duplicateSelf !== undefined) {
        productsStore.trigger.updateError({
          id: product.id,
          message: "Duplikat dengan barang " + duplicateSelf.name,
        });
        errorFlag = true;
      } else if (product.error !== undefined) {
        errorFlag = true;
      }
    }
    if (errorFlag) {
      toast.error("Masih ada error, cek lagi.");
      return;
    }
    setLoading(true);
    const either = await Effect.runPromise(
      submit(isCredit).pipe(
        Effect.either,
      ),
    );
    setLoading(false);
    Either.match(either, {
      onLeft(left) {
        switch (left._tag) {
          case "DbError":
            log.error(left.e);
            toast.error(left.e.message);
            break;
          case "NotEnoughError":
            log.error(left.message);
            toast.error(left.message);
            break;
          case "ManyDuplicateError":
            toast.error(formatDuplicates(left.products));
            break;
        }
      },
      onRight({ change, grandTotal, recordId }) {
        setComplete({
          open: true,
          grandTotal,
          change,
          recordId,
        });
      },
    });
  }
  return { loading, handleSubmit };
}

function formatDuplicates(
  errors: {
    new: string;
    current: string;
  }[],
) {
  return errors
    .map((error) => `Barang ${error.new} duplikat dengan ${error.current} di stok`)
    .join("\n");
}
