import { Effect } from "effect";
import { revalidate } from "../../../hooks/use-get-methods";
import { store } from "~/store-effect";
import { log } from "~/lib/log";
import { toast } from "sonner";

export type Kind = Exclude<DB.MethodEnum, "cash">;

export function useClicked({ kind, id, defVal }: { kind: Kind; id: number; defVal?: number }) {
  async function handleClick() {
    const error = await Effect.runPromise(program(kind, id, defVal));
    if (error === null) {
      revalidate();
    } else {
      toast.error(error);
    }
  }

  return handleClick;
}

function program(kind: Kind, id: number, defVal?: number) {
  return Effect.gen(function* () {
    yield* store.method.set(kind, id === defVal ? undefined : id);
    return null;
  }).pipe(
    Effect.catchTag("StoreError", ({ e }) => {
      log.error(e);
      return Effect.succeed(e.message);
    }),
  );
}
