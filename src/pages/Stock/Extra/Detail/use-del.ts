import { Effect } from "effect";
import { useState } from "react";
import { useNavigate } from "react-router";
import { db } from "~/database";
import { useBackUrl } from "~/hooks/use-back-url";
import { log } from "~/lib/log";

export function useDel(id: number) {
  const [error, setError] = useState<null | string>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const backUrl = useBackUrl("/stock?tab=extra");
  async function handleDelete() {
    setLoading(true);
    const errMsg = await Effect.runPromise(program(id));
    setLoading(false);
    setError(errMsg);
    if (errMsg === null) navigate(backUrl);
  }
  return { error, loading, handleDelete };
}

function program(id: number) {
  return db.extra.delById(id).pipe(
    Effect.as(null),
    Effect.catchAll(({ e }) => {
      log.error(e);
      return Effect.succeed(e.message);
    }),
  );
}
