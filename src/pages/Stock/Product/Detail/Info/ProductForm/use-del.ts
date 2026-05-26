import { Effect } from "effect";
import { useState } from "react";
import { useNavigate } from "react-router";
import { db } from "~/database";
import { useGetUrlBack } from "~/hooks/use-get-url-back";
import { log } from "~/lib/log";
import { revalidateProducts } from "~/hooks/use-get-products";

export function useDel(id: string) {
  const [error, setError] = useState<null | string>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const backUrl = useGetUrlBack("/stock");
  async function handleDelete() {
    setLoading(true);
    const errMsg = await Effect.runPromise(program(id));
    setLoading(false);
    setError(errMsg);
    if (errMsg === null) {
      navigate(backUrl);
      revalidateProducts();
    }
  }
  return { error, loading, handleDelete };
}

function program(id: string) {
  return db.product.del.byId(id).pipe(
    Effect.as(null),
    Effect.catchAll(({ e }) => {
      log.error(e);
      return Effect.succeed(e.message);
    }),
  );
}
