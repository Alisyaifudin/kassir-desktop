import { Effect } from "effect";
import { useState } from "react";
import { db } from "~/database-effect";
import { log } from "~/lib/log";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import { Customer } from "~/database-effect/customer/get-all";
import { revalidateCustomers } from "~/hooks/use-get-customer";

const schema = z.object({
  name: z.string(),
  phone: z.string(),
});

type Input = z.infer<typeof schema>;

export function useUpdate({ id, name, phone }: Customer) {
  const [error, setError] = useState<null | string>(null);
  const form = useForm({
    defaultValues: {
      name,
      phone,
    },
    validators: {
      onSubmit: schema,
    },
    async onSubmit({ value }) {
      const errMsg = await Effect.runPromise(program(id, value));
      setError(errMsg);
      if (errMsg === null) {
        revalidateCustomers();
      }
    },
  });
  return { form, error };
}

function program(id: number, { name, phone }: Input) {
  return Effect.gen(function* () {
    yield* db.customer.update(id, name, phone);
    return null;
  }).pipe(
    Effect.catchAll(({ e }) => {
      log.error(e);
      return Effect.succeed(e.message);
    }),
  );
}
