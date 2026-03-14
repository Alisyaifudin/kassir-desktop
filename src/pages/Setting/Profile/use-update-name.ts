import { Effect } from "effect";
import { useState } from "react";
import { db } from "~/database";
import { useUser } from "~/hooks/use-user";
import { auth } from "~/lib/auth";
import { log } from "~/lib/log";

export function useUpdateName() {
  const name = useUser().name;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<null | string>(null);
  const [input, setInput] = useState(name);
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const user = auth.user();
    setLoading(true);
    const error = await Effect.runPromise(program({ old: user.name, new: input }));
    setLoading(false);
    setError(error);
    if (error === null) {
      auth.set({ ...user, name: input });
    }
  }
  return { loading, error, handleSubmit, name: { value: input, set: setInput } };
}

function program(name: { old: string; new: string }) {
  return Effect.gen(function* () {
    yield* db.cashier.update.name(name);
    return null;
  }).pipe(
    Effect.catchTags({
      DbError: ({ e }) => {
        log.error(e);
        return Effect.succeed(e.message);
      },
    }),
  );
}
