import { useForm } from "@tanstack/react-form";
import { useState } from "react";
import { z } from "zod";
import { Effect, Either } from "effect";
import Decimal from "decimal.js";
import { useMutation } from "~/components/Loader";
import { service } from "~/services";
import type { Pocket, PocketType } from "~/services/money";

const schema = z.object({
  value: z.string().refine((r) => {
    const num = Number(r);
    return !isNaN(num) && isFinite(num);
  }),
  type: z.enum(["absolute", "change"]),
  note: z.string(),
});

type NewRecordInput = {
  pocketId: string;
  type: PocketType;
  /** What the user typed: an absolute balance, or a delta when `change`. */
  value: number;
  note: string;
};

export function useNew(pocket: Pocket, onClose: () => void) {
  const [error, setError] = useState<null | string>(null);
  const { mutate } = useMutation(program);

  const form = useForm({
    defaultValues: {
      value: "",
      type: pocket.type,
      note: "",
    },
    validators: {
      onSubmit: schema,
    },
    async onSubmit({ value: v }) {
      const result = await mutate({
        pocketId: pocket.id,
        type: v.type,
        value: Number(v.value),
        note: v.note,
      });
      if (Either.isRight(result)) {
        setError(null);
        form.reset();
        onClose();
        return;
      }
      setError(result.left.message);
    },
  });
  return { error, form };
}

/**
 * A `change` pocket stores a running balance, so the delta is added to whatever
 * the ledger held the instant before. The pocket's own type follows the entry's,
 * which is what the form's type selector is choosing.
 */
function program(input: NewRecordInput) {
  return Effect.gen(function* () {
    const timestamp = Date.now();
    const value =
      input.type === "absolute"
        ? input.value
        : new Decimal(yield* service.money.entries.get.last(input.pocketId, timestamp))
            .plus(input.value)
            .toNumber();
    yield* service.money.pockets.set.type(input.pocketId, input.type);
    yield* service.money.entries.add.one({
      pocketId: input.pocketId,
      timestamp,
      value,
      note: input.note,
    });
  });
}
