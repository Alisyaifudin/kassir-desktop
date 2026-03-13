import { Effect, Either, pipe } from "effect";
import { useEffect, useState } from "react";
import { tx } from "~/transaction-effect";
import { transformProduct } from "./transform-product";
import { productsStore } from ".";
import { log } from "~/lib/log";

export function useInitProducts(tab: number) {
  const [error, setError] = useState<null | string>(null);
  useEffect(() => {
    async function init(tab: number) {
      const either = await pipe(tx.product.getByTab(tab), Effect.either, Effect.runPromise);
      Either.match(either, {
        onLeft({ e }) {
          log.error(e);
          setError(null);
        },
        onRight(res) {
          setError(null);
          const products = transformProduct(res);
          productsStore.trigger.init({ products });
        },
      });
    }
    init(tab);
  }, [tab]);
  return error;
}
