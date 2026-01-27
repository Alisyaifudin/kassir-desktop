import { TextError } from "~/components/TextError";
import { Input } from "~/components/ui/input";
import { DeleteBtn } from "./z-DeleteBtn";
import { Spinner } from "~/components/Spinner";
import { memo } from "react";
import { Method } from "~/database-effect/method/get-all";
import { Effect } from "effect";
import { isString, log } from "~/lib/utils";
import { DefaultMethod } from "./z-DefaultMethod";
import { db } from "~/database-effect";
import { useSubmit } from "~/hooks/use-submit";
import { revalidate } from "~/hooks/use-micro";
import { KEY } from "./loader";

export const Item = memo(function ({ method, defVal }: { method: Method; defVal?: number }) {
  const { loading, error, handleSubmit } = useSubmit(
    (e) => {
      const formdata = new FormData(e.currentTarget);
      return Effect.runPromise(program(method.id, formdata));
    },
    () => {
      revalidate(KEY);
    },
  );
  return (
    <>
      <div className="flex items-center gap-1 p-0.5 w-full">
        <form onSubmit={handleSubmit} className="flex item-center gap-1 w-full">
          <DefaultMethod kind={method.kind} id={method.id} defVal={defVal} />
          <Input
            className="w-full"
            name="name"
            defaultValue={method.name}
            aria-autocomplete="list"
          />
          <Spinner when={loading} />
        </form>
        <DeleteBtn method={method} />
      </div>
      <TextError>{error}</TextError>
    </>
  );
});

function program(id: number, formdata: FormData) {
  return Effect.gen(function* () {
    const name = formdata.get("name");
    if (!isString(name)) return null;
    yield* db.method.update(id, name);
    return null;
  }).pipe(
    Effect.catchTag("DbError", ({ e }) => {
      log.error(JSON.stringify(e.stack));
      return Effect.succeed(e.message);
    }),
  );
}
