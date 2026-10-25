import { Either } from "effect";
import { z } from "zod";
import { useForm } from "@tanstack/react-form";
import { useMutation } from "~/components/Loader";
import { log } from "~/lib/log";
import { patchInfo } from "./util-patch-info";

const schema = z.object({
  owner: z.string(),
  address: z.string(),
  header: z.string(),
  footer: z.string(),
});

type InputValues = z.infer<typeof schema>;

export function useUpdate(values: InputValues) {
  const { error, mutate } = useMutation(patchInfo);
  const form = useForm({
    defaultValues: values,
    validators: {
      onSubmit: schema,
    },
    async onSubmit({ value }) {
      const result = await mutate(value);
      if (Either.isLeft(result)) log.error(result.left);
    },
  });
  return {
    error: error?.message ?? null,
    form,
  };
}
