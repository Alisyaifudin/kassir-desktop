import { Spinner } from "~/components/Spinner";
import { TextError } from "~/components/TextError";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { auth } from "~/lib/auth";
import { useState } from "react";
import { Effect } from "effect";
import { validate } from "~/lib/validate";
import { z } from "zod";
import { db } from "~/database-effect";
import { log } from "~/lib/utils";

export function Name() {
  const { loading, error, handleSubmit } = useSubmit();
  const name = auth.user().name;
  return (
    <form onSubmit={handleSubmit} className="flex-col gap-2 flex">
      <label className="grid grid-cols-[150px_1fr] gap-2 text-normal items-center">
        <span>Nama</span>
        <Input defaultValue={name} name="name" required aria-autocomplete="list" />
      </label>
      <Button className="w-fit self-end">
        Simpan <Spinner when={loading} />
      </Button>
      <TextError>{error}</TextError>
    </form>
  );
}

function useSubmit() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<null | string>(null);
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formdata = new FormData(form);
    setLoading(true);
    const error = await Effect.runPromise(program(formdata));
    setLoading(false);
    setError(error);
  }
  return { loading, error, handleSubmit };
}

function program(formdata: FormData) {
  return Effect.gen(function* () {
    const user = auth.user();
    const newName = yield* validate(z.string(), formdata.get("name"));
    yield* db.cashier.update.name({ old: user.name, new: newName });
    user.name = newName;
    auth.set(user);
    return null;
  }).pipe(
    Effect.catchTags({
      DbError: ({ e }) => {
        log.error(JSON.stringify(e.stack));
        return Effect.succeed(e.message);
      },
      ZodValError: (e) => {
        return Effect.succeed(e.error.message);
      },
    }),
  );
}
