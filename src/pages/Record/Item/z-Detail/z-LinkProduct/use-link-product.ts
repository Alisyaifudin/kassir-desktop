import { useState } from "react";
import { RecordData, recordMap, revalidate } from "../../use-data";
import { db } from "~/database";
import { Effect } from "effect";
import { log } from "~/lib/log";

export function useLinkProduct(recordId: string, product: RecordData["products"][number]) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<null | string>(null);
  const handleClick = (productId: string) => async () => {
    const selected = product.productId === productId ? null : productId;
    setLoading(true);
    const errMsg = await Effect.runPromise(program(product.id, selected));
    setLoading(false);
    setError(errMsg);
    if (errMsg === null) {
      recordMap.delete(recordId);
      revalidate();
    }
  };
  return { handleClick, loading, error };
}

function program(id: string, selected: string | null) {
  return db.recordProduct.update.productId(id, selected).pipe(
    Effect.as(null),
    Effect.catchTag("DbError", ({ e }) => {
      log.error(e);
      return Effect.succeed(e.message);
    }),
  );
}
