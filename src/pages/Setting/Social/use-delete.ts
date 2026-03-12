import { Effect } from "effect";
import { useState } from "react";
import { db } from "~/database-effect";
import { log } from "~/lib/log";
import { revalidate } from "./use-data";
import { revalidateInfo } from "~/pages/Record/Item/z-Receipt/use-info";

export function useDelete(id: number, onClose: () => void) {
  const [error, setError] = useState<null | string>(null);
  const [loading, setLoading] = useState(false);
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    e.stopPropagation();
    setLoading(true);
    const errMsg = await Effect.runPromise(program(id));
    setLoading(false);
    setError(errMsg);
    if (errMsg === null) {
      onClose();
      revalidate();
      revalidateInfo();
    }
  }
  return { error, loading, handleSubmit };
}

function program(id: number) {
  return Effect.gen(function* () {
    yield* db.social.delById(id);
    return null;
  }).pipe(
    Effect.catchAll(({ e }) => {
      log.error(e);
      return Effect.succeed(e.message);
    }),
  );
}
