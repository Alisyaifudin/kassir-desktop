import { Effect } from "effect";
import { useState } from "react";
import { toast } from "sonner";
import { db } from "~/database";
import { auth } from "~/lib/auth";
import { log } from "~/lib/log";

export function useUpdatePassword() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<null | string>(null);
  const [input, setInput] = useState("");
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const user = auth.user();
    setLoading(true);
    const error = await Effect.runPromise(program(user.id, input));
    setLoading(false);
    setError(error);
    if (error === null) {
      setInput("");
      toast.success("Berhasil diperbarui");
    }
  }
  return { loading, error, handleSubmit, password: { value: input, set: setInput } };
}

function program(id: string, password: string) {
  return Effect.gen(function* () {
    const hash = yield* auth.hash(password);
    yield* db.cashier.update.hash(id, hash);
    return null;
  }).pipe(
    Effect.catchTags({
      DbError: ({ e }) => {
        log.error(e);
        return Effect.succeed(e.message);
      },
      InvokeError: ({ e }) => {
        log.error(e);
        return Effect.succeed(e.message);
      },
    }),
  );
}
