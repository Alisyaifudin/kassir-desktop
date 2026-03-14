import { Effect } from "effect";
import { useState } from "react";
import { db } from "~/database";
import { log } from "~/lib/log";
import { Data } from "../../use-data";
import { useBackUrl } from "~/hooks/use-back-url";
import { useNavigate } from "react-router";

export function useDelete({
  timestamp,
  mode,
  products,
}: {
  timestamp: number;
  mode: DB.Mode;
  products: Data["products"];
}) {
  const [error, setError] = useState<null | string>(null);
  const [loading, setLoading] = useState(false);
  const backUrl = useBackUrl("/records");
  const navigate = useNavigate();
  async function handleDelete() {
    setLoading(true);
    const errMsg = await Effect.runPromise(program(timestamp, mode, products));
    setLoading(false);
    setError(errMsg);
    if (errMsg === null) {
      navigate(backUrl);
    }
  }
  return { error, loading, handleDelete };
}

function program(timestamp: number, mode: DB.Mode, products: Data["products"]) {
  return Effect.gen(function* () {
    const filtered = products.flatMap((p) =>
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
