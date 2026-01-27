import { revalidate } from "~/hooks/use-micro";
import { KEY } from "./loader";
import { Effect } from "effect";
import { store } from "~/store-effect";
import { log } from "~/lib/utils";
import { toast } from "sonner";
type Kind = Exclude<DB.MethodEnum, "cash">;
export function DefaultMethod({ kind, id, defVal }: { kind: Kind; id: number; defVal?: number }) {
  const handleClick = useClicked({ kind, id, defVal });
  return (
    <input
      type="radio"
      name={kind}
      onClick={handleClick}
      onChange={() => {}}
      checked={id === defVal}
    />
  );
}

function useClicked({ kind, id, defVal }: { kind: Kind; id: number; defVal?: number }) {
  async function handleClick() {
    const error = await Effect.runPromise(program(kind, id, defVal));
    if (error === null) {
      revalidate(KEY);
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
      log.error(JSON.stringify(e.stack));
      return Effect.succeed(e.message);
    }),
  );
}
