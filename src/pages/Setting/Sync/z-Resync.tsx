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
    Effect.all(
      [
        store.sync.product.set(0),
        store.sync.productEvent.set(0),
        store.sync.record.set(0),
        store.sync.method.set(0),
        store.sync.grave.set(0),
        db.product.update.unsyncAll(),
        db.productEvent.update.unsyncAll(),
        db.record.update.unsyncAll(),
        db.method.update.unsyncAll(),
      ],
      { concurrency: "unbounded" },
    ).pipe(
      Effect.tap(() => {
        return db.productEvent.get.countUnsync().pipe(
          Effect.tap((count) => {
            console.log("count product event", count);
          }),
        );
      }),
      Effect.catchAll((e) => {
        log.error(e.e);
        return Effect.fail(e.e.message);
      }),
    ),
  );
  return { loading, error, handleClick: handler };
}
