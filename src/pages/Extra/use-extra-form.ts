import { Either } from "effect";
import { useBack } from "~/services/route/react";
import { useMutation } from "~/components/Loader";
import { service } from "~/services";
import type { Extra, ExtraInput } from "~/services/extra";
import { extraSchema, isDual, withDual, type ExtraFormValues } from "./util-extra-options";
import { useAppForm } from "./z-ExtraForm";

/**
 * The add/edit form for one extra. `extra` is absent when adding; the same form
 * serves both, so the only difference is which service write it calls.
 */
export function useExtraForm(extra?: Extra) {
  // The list this form was opened from — whether the form is `/extras/new` or the
  // edit pane on `/extras/:id`, it is one pop away, and the saved row is already
  // on it.
  const back = useBack("/extras");
  const { error, mutate } = useMutation((input: ExtraInput) =>
    extra === undefined ? service.extra.add(input) : service.extra.set.info(extra.id, input),
  );

  const defaultValues: ExtraFormValues = {
    name: extra?.name ?? "",
    value: extra?.value ?? 0,
    kind: extra?.kind ?? "percent",
    dual: isDual(extra?.flag ?? 0),
  };

  const form = useAppForm({
    defaultValues,
    validators: {
      onSubmit: extraSchema,
    },
    async onSubmit({ value }: { value: ExtraFormValues }) {
      const result = await mutate({
        name: value.name.trim(),
        value: value.value,
        kind: value.kind,
        // Other flag bits belong to whatever wrote them; only `dual` is ours.
        flag: withDual(extra?.flag ?? 0, value.dual),
      });
      if (Either.isRight(result)) back();
    },
  });

  return { form, error: error?.message ?? null };
}
