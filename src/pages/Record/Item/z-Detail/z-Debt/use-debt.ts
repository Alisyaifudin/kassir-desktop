import { useForm, useStore } from "@tanstack/react-form";
import Decimal from "decimal.js";
import { Either } from "effect";
import { useState } from "react";
import { z } from "zod";
import { useMutation } from "~/components/Loader";
import { numerish } from "~/lib/utils";
import { service } from "~/services";

/**
 * The shared `numerish` rule, not a local `Number.isFinite(Number(value))`: that
 * one accepted `""` (as 0), `" "`, `"0x10"` and `"1e3"`, so a blank "Bayaran"
 * reached the settle path as zero. An empty rounding field is the one case the
 * cashier means as zero, so it is defaulted *before* the shared rule runs.
 */
const schema = z.object({
  pay: numerish.min(1, { message: "Bayaran wajib diisi." }),
  rounding: z
    .string()
    .trim()
    .transform((value) => (value === "" ? "0" : value))
    .pipe(numerish),
});

export function useDebt({
  recordId,
  grandTotal,
  onClose,
}: {
  recordId: string;
  grandTotal: number;
  onClose: () => void;
}) {
  const [validationError, setValidationError] = useState<string | null>(null);
  const { pending, error, mutate } = useMutation(
    (input: { id: string; pay: number; rounding: number }) =>
      service.record.set.payCredit(input.id, { pay: input.pay, rounding: input.rounding }),
  );

  const form = useForm({
    defaultValues: { pay: "", rounding: "" },
    validators: { onSubmit: schema },
    async onSubmit({ value }) {
      setValidationError(null);
      const pay = Number(value.pay);
      const rounding = Number(value.rounding);
      const required = new Decimal(grandTotal).plus(rounding);
      if (required.gt(pay)) {
        setValidationError(
          "Pembayaran tidak cukup, minimal " + required.toNumber().toLocaleString("id-ID"),
        );
        return;
      }
      const result = await mutate({ id: recordId, pay, rounding });
      if (Either.isRight(result)) onClose();
    },
  });

  const total = useStore(form.store, (state) =>
    new Decimal(grandTotal).plus(Number(state.values.rounding) || 0).toNumber(),
  );
  const change = useStore(form.store, (state) =>
    new Decimal(Number(state.values.pay) || 0)
      .minus(new Decimal(grandTotal).plus(Number(state.values.rounding) || 0))
      .toNumber(),
  );

  return {
    form,
    loading: pending,
    error: validationError ?? error?.message ?? null,
    total,
    change,
  };
}
