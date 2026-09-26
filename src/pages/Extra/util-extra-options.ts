import { createFormHookContexts } from "@tanstack/react-form";
import { Effect } from "effect";
import { z } from "zod";
import { DUAL_FLAG } from "~/lib/constants";

export const { fieldContext, formContext, useFieldContext } = createFormHookContexts();

type Extra = {
  name: string;
  value: number;
  kind: DB.ValueKind;
  flag: number;
};

const numeric = z.string().refine((v) => {
  const num = Number(v);
  return !isNaN(num) && isFinite(num);
}, "Harus angka");

const schema = z
  .object({
    name: z.string().trim().nonempty("Harus ada"),
    value: numeric, // assuming numeric is your custom schema
    kind: z.enum(["percent", "number"]),
    dual: z.boolean(),
  })
  .refine(
    (data) => {
      return !(data.kind === "percent" && Math.abs(Number(data.value)) > 100);
    },
    {
      message: "Tidak boleh lebih dari 100 atau kurang dari -100",
      path: ["value"],
    },
  );

type Input = z.infer<typeof schema>;

export function createExtraOptions({
  program,
  onError,
  onSuccess,
  extra: product,
}: {
  program: (extra: Extra) => Effect.Effect<string | null>;
  onSuccess: () => void;
  onError: (error: string) => void;
  extra?: Extra;
}) {
  return {
    defaultValues: {
      name: product?.name ?? "",
      value: product?.value.toString() ?? "",
      kind: (product?.kind ?? "percent") as DB.ValueKind,
      dual: Boolean((product?.flag ?? 0) & DUAL_FLAG),
    },
    validators: {
      onSubmit: schema,
    },
    async onSubmit({ value: v }: { value: Input }) {
      const value = Number(v.value);
      const name = v.name.trim();
      const kind = v.kind;
      const flag = ((product?.flag ?? 0) & ~DUAL_FLAG) | (v.dual ? DUAL_FLAG : 0);
      const errMsg = await Effect.runPromise(program({ value, name, kind, flag }));
      if (errMsg === null) {
        onSuccess();
      } else {
        onError(errMsg);
      }
    },
  };
}
