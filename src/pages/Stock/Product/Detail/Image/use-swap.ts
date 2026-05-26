import { Effect } from "effect";
import { useState } from "react";
import { toast } from "sonner";
import { db } from "~/database";
import { log } from "~/lib/log";
import { revalidate } from "./use-data";

export function useSwap() {
  const [loading, setLoading] = useState(false);
  async function handleSwap(a: string, b: string) {
    setLoading(true);
    const errMsg = await Effect.runPromise(program(a, b));
    setLoading(false);
    if (errMsg !== null) {
      toast.error(errMsg);
      return;
    }
    revalidate();
  }
  return { handleSwap, loading };
}

function program(a: string, b: string) {
  return db.image.update.swap(a, b).pipe(
    Effect.as(null),
    Effect.catchAll((e) => {
      switch (e._tag) {
        case "DbError":
          log.error(e.e);
          return Effect.succeed(e.e.message);
        case "NotFound":
          log.error(e.msg);
          return Effect.succeed(e.msg);
      }
    }),
  );
}
