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
        Effect.catchTag("NotEnoughError", (e) => Effect.fail(e.message)),
        Effect.catchTag("DbError", ({ e }) => {
          log.error(e);
          return Effect.fail("Aplikasi bermasalah");
        }),
        Effect.either,
      ),
    );
    setLoading(false);
    Either.match(either, {
      onLeft(left) {
        toast.error(left);
      },
      onRight({ change, grandTotal, timestamp }) {
        setComplete({
          open: true,
          grandTotal,
          change,
          timestamp,
        });
      },
    });
  }
  return { loading, handleSubmit };
}
