import { Either } from "effect";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import { useMutation } from "~/components/Loader";
import { service } from "~/services";
import type { SocialInput } from "~/services/social";

const schema = z.object({
  name: z.string().trim().nonempty("Harus ada"),
  value: z.string().trim().nonempty("Harus ada"),
});

/** A contact as the form needs it: the id to write, the values to show. */
export type EditableSocial = { id: string; name: string; value: string };

const EMPTY: EditableSocial = { id: "", name: "", value: "" };

/**
 * The one contact form. `social` is absent when adding, so the only difference
 * between add and edit is which service write `onSubmit` calls; `onSuccess`
 * closes the add dialog.
 */
export function useSocialForm(social?: EditableSocial, onSuccess?: () => void) {
  const { error, mutate } = useMutation((input: SocialInput) =>
    social === undefined ? service.social.add(input) : service.social.set.info(social.id, input),
  );

  // Read only at mount: a refresh from the service must not wipe out typing.
  const initial = social ?? EMPTY;

  const form = useForm({
    defaultValues: { name: initial.name, value: initial.value },
    validators: {
      onSubmit: schema,
    },
    async onSubmit({ value }) {
      const result = await mutate({
        name: value.name.trim(),
        value: value.value.trim(),
      });
      if (Either.isRight(result)) onSuccess?.();
    },
  });

  return { form, error: error?.message ?? null };
}
