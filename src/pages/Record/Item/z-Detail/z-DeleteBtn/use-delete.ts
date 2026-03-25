import { Effect } from "effect";
import { useState } from "react";
import { db } from "~/database";
import { log } from "~/lib/log";
import { useGetUrlBack } from "~/hooks/use-get-url-back";
import { useNavigate } from "react-router";

export function useDelete({
  recordId,
}: {
  recordId: string;
}) {
  const [error, setError] = useState<null | string>(null);
  const [loading, setLoading] = useState(false);
  const backUrl = useGetUrlBack("/records");
  const navigate = useNavigate();
  async function handleDelete() {
    setLoading(true);
    const errMsg = await Effect.runPromise(program(recordId));
    setLoading(false);
    setError(errMsg);
    if (errMsg === null) {
      navigate(backUrl);
    }
  }
  return { error, loading, handleDelete };
}

function program(recordId: string) {
  return Effect.gen(function* () {
    yield* db.record.del.byId(recordId);
    return null;
  }).pipe(
    Effect.catchAll(({ e }) => {
      log.error(e);
      return Effect.succeed(e.message);
    }),
  );
}
