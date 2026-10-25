import { Effect, Either, Option, Stream } from "effect";
import { toast } from "sonner";
import { useMutation } from "~/components/Loader";
import { log } from "~/lib/log";
import { service } from "~/services";
import type { ProductFull } from "~/services/product";
import type { ProductImport } from "./ProductUpload/util-validate-product";
import { messageOf, saveJson } from "./util-file";

/** A product as the upload accepts it: the same shape `product.add` takes. */
function toProductImport(product: ProductFull): ProductImport {
  return {
    name: product.name,
    note: product.note,
    listings: product.listings.map(({ name, price, unit, kind, code }) => ({
      name,
      price,
      unit,
      kind,
      code,
    })),
    stocks: product.stocks.map(({ value, capital }) => ({ value, capital })),
    properties: product.properties.map(({ key, value }) => ({ key, value })),
  };
}

export function useProduct() {
  const { pending, error, mutate } = useMutation(program);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const result = await mutate(undefined);
    if (Either.isLeft(result)) {
      log.error(messageOf(result.left));
      return;
    }
    // `null` = the cashier cancelled the save dialog: silent, not "success".
    if (result.right !== null) toast.success(`Disimpan ke ${result.right}`);
  }

  return {
    handleSubmit,
    loading: pending,
    error: error === null ? null : messageOf(error),
  };
}

function program() {
  return Effect.gen(function* () {
    const snapshot = yield* Stream.runHead(service.product.get.changesFull);
    const products = Option.getOrElse(snapshot, (): ProductFull[] => []);
    return yield* saveJson(`${Date.now()}-products.json`, products.map(toProductImport));
  });
}
