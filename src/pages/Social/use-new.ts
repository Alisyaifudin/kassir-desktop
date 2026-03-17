import { Effect } from "effect";
import { useState } from "react";
import { db } from "~/database";
import { log } from "~/lib/log";
import { revalidate } from "./use-data";
import { z } from "zod";
import { useForm } from "@tanstack/react-form";
import { revalidateInfo } from "~/pages/Record/Item/z-Receipt/use-info";

const schema = z.object({
  name: z.string().nonempty("Harus ada"),
  value: z.string().nonempty("Harus ada"),
});

const defaultValues = { name: "", value: "" };

export function useNew(onClose: () => void) {
  const [error, setError] = useState<null | string>(null);
  const form = useForm({
    defaultValues,
    validators: {
      onSubmit: schema,
    },
    async onSubmit({ value }) {
      const errMsg = await Effect.runPromise(program(value));
      setError(errMsg);
      if (errMsg === null) {
        revalidate();
        revalidateInfo();
        onClose();
      }
    },
  });
  return {
    error,
    form,
  };
}

function program({ name, value }: { name: string; value: string }) {
  return Effect.gen(function* () {
    yield* db.social.add(name, value);
    return null;
  }).pipe(
    Effect.catchAll(({ e }) => {
      log.error(e);
      return Effect.succeed(e.message);
    }),
  );
}
