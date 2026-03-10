import { createFormHookContexts } from "@tanstack/react-form";
import { Effect } from "effect";
import { z } from "zod";

export const { fieldContext, formContext, useFieldContext } = createFormHookContexts();

type Extra = {
  name: string;
  value: number;
  kind: DB.ValueKind;
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
    },
    validators: {
      onSubmit: schema,
    },
    async onSubmit({ value: v }: { value: Input }) {
      const value = Number(v.value);
      const name = v.name.trim();
      const kind = v.kind;
      const errMsg = await Effect.runPromise(program({ value, name, kind }));
      if (errMsg === null) {
        onSuccess();
      } else {
        onError(errMsg);
      }
    },
  };
}
