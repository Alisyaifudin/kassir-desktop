import { Effect, Either } from "effect";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import { useMutation } from "~/components/Loader";
import { hash } from "~/lib/auth";
import { generateId } from "~/lib/random";
import { service } from "~/services";

const schema = z.object({
  name: z.string().trim().nonempty("Harus ada"),
});

/**
 * Creates a cashier with the empty password, as the legacy page did: the new
 * account is a `user`, and they set their own password from Setting → Profile.
 */
export function useNewCashier(onClose: () => void) {
  const { error, mutate } = useMutation((name: string) =>
    Effect.gen(function* () {
      const id = generateId();
      const passwordHash = yield* hash("");
      yield* service.cashier.add({ id, name, role: "user", hash: passwordHash });
    }),
  );

  const form = useForm({
    defaultValues: { name: "" },
    validators: {
      onSubmit: schema,
    },
    async onSubmit({ value }) {
      const result = await mutate(value.name.trim());
      if (Either.isRight(result)) {
        // The dialog unmounts its content, but this form state outlives it.
        form.reset();
        onClose();
      }
    },
  });

  return { error: error?.message ?? null, form };
}
