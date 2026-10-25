import { createFormHookContexts } from "@tanstack/react-form";
import { z } from "zod";
import { DUAL_FLAG, type ValueKind } from "~/lib/constants";

export const { fieldContext, formContext, useFieldContext } = createFormHookContexts();

const numeric = z.string().refine((v) => {
  const num = Number(v);
  return !isNaN(num) && isFinite(num);
}, "Harus angka");

/** The form's own shape: numbers are typed as text, and `dual` is the flag bit. */
export const extraSchema = z
  .object({
    name: z.string().trim().nonempty("Harus ada"),
    value: numeric,
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

export type ExtraFormValues = z.infer<typeof extraSchema>;

/** The `dual` bit out of a stored flag. */
export function isDual(flag: number): boolean {
  return Boolean(flag & DUAL_FLAG);
}

/** `flag` with its `dual` bit set or cleared, leaving the other bits alone. */
export function withDual(flag: number, dual: boolean): number {
  return (flag & ~DUAL_FLAG) | (dual ? DUAL_FLAG : 0);
}

export type Kind = ValueKind;

/** Display name for an extra's kind. */
export const KIND_LABEL: Record<Kind, string> = {
  percent: "Persen",
  number: "Angka",
};
