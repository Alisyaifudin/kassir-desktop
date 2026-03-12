import { useForm, useStore } from "@tanstack/react-form";
import Decimal from "decimal.js";
import { Effect } from "effect";
import { useState } from "react";
import { z } from "zod";
import { db } from "~/database-effect";
import { log } from "~/lib/log";
import { revalidate } from "../../use-data";

const numeric = z.string().refine((v) => {
  const num = Number(v);
  return !isNaN(num) && isFinite(num);
});
const schema = z.object({
  pay: numeric,
  rounding: numeric,
});

export function useDebt({
  timestamp,
  onClose,
  grandTotal,
}: {
  timestamp: number;
  grandTotal: number;
  onClose: () => void;
}) {
  const [error, setError] = useState<null | string>(null);
  const form = useForm({
    defaultValues: {
      pay: "",
      rounding: "",
    },
    validators: {
      onSubmit: schema,
    },
    async onSubmit({ value }) {
      const pay = Number(value.pay);
      const rounding = Number(value.rounding);
      const totalPay = new Decimal(grandTotal).plus(rounding);
      if (totalPay.gt(pay)) {
        setError("Pembayaran tidak cukup, minimal " + totalPay.toNumber().toLocaleString("id-ID"));
        return;
      }
      const errMsg = await Effect.runPromise(program({ timestamp, rounding, pay }));
      setError(errMsg);
      if (errMsg === null) {
        revalidate();
        onClose();
      }
    },
  });

  const loading = useStore(form.store, (s) => s.isSubmitting);
  const total = useStore(form.store, (s) => {
    const rounding = new Decimal(Number(s.values.rounding) || 0);
    return rounding.plus(grandTotal).toNumber();
  });
  const change = useStore(form.store, (s) => {
    const rounding = new Decimal(Number(s.values.rounding) || 0);
    const pay = new Decimal(Number(s.values.pay) || 0);
    const totalPay = rounding.plus(grandTotal);
    return pay.minus(totalPay).toNumber();
  });

  return { error, form, loading, change, total };
}

function program(args: { pay: number; rounding: number; timestamp: number }) {
  return db.record.update.payCredit(args).pipe(
    Effect.as(null),
    Effect.catchTag("DbError", ({ e }) => {
      log.error(e);
      return Effect.succeed(e.message);
    }),
  );
}
