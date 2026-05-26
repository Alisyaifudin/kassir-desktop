import { useForm } from "@tanstack/react-form";
import { Effect } from "effect";
import { useState } from "react";
import { z } from "zod";
import { db } from "~/database";
import { auth } from "~/lib/auth";
import { log } from "~/lib/log";
import { revalidate } from "./use-data";

const schema = z.object({
  name: z.string().nonempty(),
});

export function useNewCashier(onClose: () => void) {
  const [error, setError] = useState<null | string>(null);
  const form = useForm({
    defaultValues: {
      name: "",
    },
    validators: {
      onSubmit: schema,
    },
    async onSubmit({ value }) {
      const errMsg = await Effect.runPromise(program(value.name));
      setError(errMsg);
      if (errMsg === null) {
        onClose();
        revalidate();
        form.reset();
      }
    },
  });
  return { error, form };
}

function program(name: string) {
  return Effect.gen(function* () {
    const hash = yield* auth.hash("");
    yield* db.cashier.add({ name, role: "user", hash });
    return null;
  }).pipe(
    Effect.catchAll(({ e }) => {
      log.error(e);
      return Effect.succeed(e.message);
    }),
  );
}
