import { Effect } from "effect";
import { Spinner } from "~/components/Spinner";
import { TextError } from "~/components/TextError";
import { Button } from "~/components/ui/button";
import { db } from "~/database";
import { useCallEffect } from "~/hooks/use-call-effect";
import { log } from "~/lib/log";
import { store } from "~/store";

export function Resync() {
  const { loading, error, handleClick } = useResync();
  return (
    <div className="flex justify-end">
      <Button disabled={loading} onClick={handleClick} variant="destructive">
        <Spinner when={loading}></Spinner>
        Sinkronisasi Ulang
      </Button>
      <TextError>{error}</TextError>
    </div>
  );
}

function useResync() {
  const { loading, error, handler } = useCallEffect(() =>
    Effect.gen(function* () {
      yield* store.sync.product.set(0);
      yield* db.product.update.unsyncAll();
    }).pipe(
      Effect.catchAll((e) => {
        log.error(e.e);
        return Effect.fail(e.e.message);
      }),
    ),
  );
  return { loading, error, handleClick: handler };
}
