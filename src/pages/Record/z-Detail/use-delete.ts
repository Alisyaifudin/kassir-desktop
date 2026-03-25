import { Effect } from "effect";
import { useState } from "react";
import { DataRecord, revalidate } from "../use-records";
import { db } from "~/database";
import { log } from "~/lib/log";
import { useUnselect } from "../use-selected";

export function useDelete({
  id,
  mode,
  products,
  onClose,
}: {
  id: string;
  mode: DB.Mode;
  products: DataRecord["products"];
  onClose: () => void;
}) {
  const [error, setError] = useState<null | string>(null);
  const [loading, setLoading] = useState(false);
  const unselect = useUnselect();
  async function handleDelete() {
    setLoading(true);
    const errMsg = await Effect.runPromise(programDeleteRecord(id, mode, products));
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
  id: string,
  mode: DB.Mode,
  productRecords: { id: string; productId?: string; qty: number }[],
) {
  return Effect.gen(function* () {
    const filtered = productRecords.flatMap((p) =>
      p.productId === undefined ? [] : [{ id: p.productId, qty: p.qty }],
    );
    yield* Effect.all([
      db.record.del.byId(id),
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
