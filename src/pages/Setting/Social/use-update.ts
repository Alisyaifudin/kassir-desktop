import { Effect } from "effect";
import { useState } from "react";
import { db } from "~/database-effect";
import { log } from "~/lib/log";
import { revalidate } from "./use-data";
import { z } from "zod";
import { useForm } from "@tanstack/react-form";
import { Social } from "~/database-effect/social/get-all";

const schema = z.object({
  name: z.string().nonempty("Harus ada"),
  value: z.string().nonempty("Harus ada"),
});

export function useUpdate({ id, name, value }: Social) {
  const [error, setError] = useState<null | string>(null);
  const form = useForm({
    defaultValues: {
      name,
      value,
    },
    validators: {
      onSubmit: schema,
    },
    async onSubmit({ value }) {
      const errMsg = await Effect.runPromise(program(id, value));
      setError(errMsg);
      if (errMsg === null) {
        revalidate();
      }
    },
  });
  return {
    error,
    form,
  };
}

function program(id: number, { name, value }: { name: string; value: string }) {
  return Effect.gen(function* () {
    yield* db.social.update(id, name, value);
    return null;
  }).pipe(
    Effect.catchAll(({ e }) => {
      log.error(e);
      return Effect.succeed(e.message);
    }),
  );
}
