import { Effect, Either } from "effect";
import { useState } from "react";
import { DataRecord } from "../use-records";
import { tx } from "~/transaction";
import { log } from "~/lib/log";
import { useNavigate } from "react-router";

export function useToTransaction(data: DataRecord) {
  const [error, setError] = useState<null | string>(null);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  async function handleClick() {
    setLoading(true);
    const either = await Effect.runPromise(program(data));
    setLoading(false);
    Either.match(either, {
      onLeft: (e) => setError(e),
      onRight: (tab) => {
        setError(null);
        navigate(`/shop/${tab.tab}`);
      },
    });
  }
  return { error, loading, handleClick };
}

function program({ extras, products, record }: DataRecord) {
  return tx.transaction.add
    .one({
      extras,
      products,
      record: {
        ...record,
        methodId: record.method.id,
      },
    })
    .pipe(
      Effect.catchTag("DbError", ({ e }) => {
        log.error(e);
        return Effect.fail(e.message);
      }),
      Effect.catchTag("TooMany", (e) => {
        log.error(e.msg);
        return Effect.fail(e.msg);
      }),
      Effect.catchTag("TxError", ({ e }) => {
        log.error(e);
        return Effect.fail(e.message);
      }),
      Effect.either,
    );
}
