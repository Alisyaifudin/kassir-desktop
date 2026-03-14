import { Effect } from "effect";
import { useState } from "react";
import { Data, revalidate } from "../use-records";
import { db } from "~/database";
import { log } from "~/lib/log";
import { useUnselect } from "../use-selected";

export function useDelete({
  timestamp,
  mode,
  products,
  onClose,
}: {
  timestamp: number;
  mode: DB.Mode;
  products: Data["products"];
  onClose: () => void;
}) {
  const [error, setError] = useState<null | string>(null);
  const [loading, setLoading] = useState(false);
  const unselect = useUnselect();
  async function handleDelete() {
    setLoading(true);
    const errMsg = await Effect.runPromise(programDeleteRecord(timestamp, mode, products));
    setLoading(false);
    setError(errMsg);
    if (errMsg === null) {
      unselect();
      onClose();
      revalidate();
    }
  }
  return { error, loading, handleDelete };
}

export function programDeleteRecord(
  timestamp: number,
  mode: DB.Mode,
  productRecords: { id: number; productId?: number; qty: number }[],
) {
  return Effect.gen(function* () {
    const filtered = productRecords.flatMap((p) =>
      p.productId === undefined ? [] : [{ id: p.productId, qty: p.qty }],
    );
    yield* Effect.all([
      db.record.delByTimestamp(timestamp),
      ...(mode === "buy"
        ? filtered.map((p) => db.product.update.stock.dec(p.id, p.qty))
        : filtered.map((p) => db.product.update.stock.inc(p.id, p.qty))),
    ]);
    return null;
  }).pipe(
    Effect.catchAll(({ e }) => {
      log.error(e);
      return Effect.succeed(e.message);
    }),
  );
}
