import { Either } from "effect";
import { useNavigate } from "react-router";
import { useMutation } from "~/components/Loader";
import { useGetUrlBack } from "~/hooks/use-get-url-back";
import { service } from "~/services";
import type { Extra, ExtraInput } from "~/services/extra";
import { extraSchema, isDual, withDual, type ExtraFormValues } from "./util-extra-options";
import { useAppForm } from "./z-ExtraForm";

/**
 * The add/edit form for one extra. `extra` is absent when adding; the same form
 * serves both, so the only difference is which service write it calls.
 */
export function useExtraForm(extra?: Extra) {
  const navigate = useNavigate();
  const backUrl = useGetUrlBack("/extras");
  const { error, mutate } = useMutation((input: ExtraInput) =>
    extra === undefined ? service.extra.add(input) : service.extra.set.info(extra.id, input),
  );

  const defaultValues: ExtraFormValues = {
    name: extra?.name ?? "",
    value: extra?.value.toString() ?? "",
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
        value: Number(value.value),
        kind: value.kind,
        // Other flag bits belong to whatever wrote them; only `dual` is ours.
        flag: withDual(extra?.flag ?? 0, value.dual),
      });
      if (Either.isRight(result)) navigate(backUrl);
    },
  });

  return { form, error: error?.message ?? null };
}
