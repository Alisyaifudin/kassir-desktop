import { Effect } from "effect";
import { useState } from "react";
import { db } from "~/database";
import { log } from "~/lib/log";
import { RecordData } from "../../use-data";
import { useGetUrlBack } from "~/hooks/use-get-url-back";
import { useNavigate } from "react-router";

export function useDelete({
  recordId,
  mode,
  products,
}: {
  recordId: string;
  mode: DB.Mode;
  products: RecordData["products"];
}) {
  const [error, setError] = useState<null | string>(null);
  const [loading, setLoading] = useState(false);
  const backUrl = useGetUrlBack("/records");
  const navigate = useNavigate();
  async function handleDelete() {
    setLoading(true);
    const errMsg = await Effect.runPromise(program(recordId, mode, products));
    setLoading(false);
    setError(errMsg);
    if (errMsg === null) {
      navigate(backUrl);
    }
  }
  return { error, loading, handleDelete };
}

function program(recordId: string, mode: DB.Mode, products: RecordData["products"]) {
  return Effect.gen(function* () {
    const filtered = products.flatMap((p) =>
      p.productId === undefined ? [] : [{ id: p.productId, qty: p.qty }],
    );
    yield* Effect.all([
      db.record.del.byId(recordId),
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
