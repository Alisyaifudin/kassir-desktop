import { Effect } from "effect";
import { useState } from "react";
import { db } from "~/database-effect";
import { log } from "~/lib/log";
import { z } from "zod";
import { useForm } from "@tanstack/react-form";
import { revalidateCustomers } from "~/hooks/use-get-customer";

const schema = z.object({
  name: z.string().nonempty("Harus ada"),
  phone: z.string(),
});

type InputType = z.infer<typeof schema>;

const defaultValues: InputType = { name: "", phone: "" };

export function useNew(onClose: () => void) {
  const [error, setError] = useState<null | string>(null);
  const form = useForm({
    defaultValues,
    validators: {
      onSubmit: schema,
    },
    async onSubmit({ value }) {
      const errMsg = await Effect.runPromise(program(value.name, value.phone));
      setError(errMsg);
      if (errMsg === null) {
        revalidateCustomers();
        onClose();
        form.reset();
      }
    },
  });

  return { error, form };
}

function program(name: string, phone: string) {
  return Effect.gen(function* () {
    yield* db.customer.add(name, phone);
    return null;
  }).pipe(
    Effect.catchTag("DbError", ({ e }) => {
      log.error(JSON.stringify(e.stack));
      return Effect.succeed(e.message);
    }),
  );
}
