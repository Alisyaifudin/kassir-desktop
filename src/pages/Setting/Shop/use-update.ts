import { Effect } from "effect";
import { useState } from "react";
import { log } from "~/lib/log";
import { revalidate } from "./use-data";
import { z } from "zod";
import { useForm } from "@tanstack/react-form";
import { store } from "~/store-effect";
import { revalidateTitle } from "~/layouts/authenticated/z-Title";
import { revalidateInfo } from "~/pages/Record/Item/z-Receipt/use-info";

const schema = z.object({
  owner: z.string(),
  address: z.string(),
  header: z.string(),
  footer: z.string(),
});

type InputValues = z.infer<typeof schema>;

export function useUpdate(values: InputValues) {
  const [error, setError] = useState<null | string>(null);
  const form = useForm({
    defaultValues: values,
    validators: {
      onSubmit: schema,
    },
    async onSubmit({ value }) {
      const errMsg = await Effect.runPromise(program(value));
      setError(errMsg);
      if (errMsg === null) {
        revalidate();
        revalidateTitle();
        revalidateInfo();
      }
    },
  });
  return {
    error,
    form,
  };
}

function program(values: InputValues) {
  return Effect.gen(function* () {
    yield* store.info.set.basic(values);
    return null;
  }).pipe(
    Effect.catchAll(({ e }) => {
      log.error(e);
      return Effect.succeed(e.message);
    }),
  );
}
