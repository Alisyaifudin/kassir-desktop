import { useState } from "react";
import { db } from "~/database";
import { Effect } from "effect";
import { log } from "~/lib/log";
import { useGetUrlBack } from "~/hooks/use-get-url-back";
import { useNavigate } from "react-router";
import { revalidateMoney } from "../use-data";

export function useDeletePocket(kindId: number, onClose: () => void) {
  const [error, setError] = useState<null | string>(null);
  const [loading, setLoading] = useState(false);
  const urlBack = useGetUrlBack("/money");
  const navigate = useNavigate();
  async function handleDelete() {
    setLoading(true);
    const errMsg = await Effect.runPromise(program(kindId));
    setLoading(false);
    setError(errMsg);
    if (errMsg === null) {
      revalidateMoney();
      onClose();
      navigate(urlBack);
    }
  }
  return { loading, error, handleDelete };
}

function program(kindId: number) {
  return db.money.delete.kind(kindId).pipe(
    Effect.as(null),
    Effect.catchAll(({ e }) => {
      log.error(e);
      return Effect.succeed(e.message);
    }),
  );
}
