import { useState } from "react";
import { Data, revalidate } from "../../use-data";
import { db } from "~/database";
import { Effect } from "effect";
import { log } from "~/lib/log";

export function useLinkProduct(product: Data["products"][number]) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<null | string>(null);
  const handleClick = (productId: number) => async () => {
    const selected = product.productId === productId ? null : productId;
    setLoading(true);
    const errMsg = await Effect.runPromise(program(product.id, selected));
    setLoading(false);
    setError(errMsg);
    if (errMsg === null) {
      revalidate();
    }
  };
  return { handleClick, loading, error };
}

function program(id: number, selected: number | null) {
  return db.recordProduct.update.productId(id, selected).pipe(
    Effect.as(null),
    Effect.catchTag("DbError", ({ e }) => {
      log.error(e);
      return Effect.succeed(e.message);
    }),
  );
}
