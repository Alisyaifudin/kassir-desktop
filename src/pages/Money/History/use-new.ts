import { useForm } from "@tanstack/react-form";
import { useState } from "react";
import { z } from "zod";
import { db } from "~/database";
import { Effect } from "effect";
import Decimal from "decimal.js";
import { log } from "~/lib/log";
import { revalidate } from "./use-data";
import { MoneyKind } from "~/database/money/get-by-range";
import { revalidateMoney } from "../use-data";

const schema = z.object({
  value: z.string().refine((r) => {
    const num = Number(r);
    return !isNaN(num) && isFinite(num);
  }),
  type: z.enum(["absolute", "change"]),
  note: z.string(),
});

export function useNew(kind: MoneyKind, onClose: () => void) {
  const [error, setError] = useState<null | string>(null);
  const form = useForm({
    defaultValues: {
      value: "",
      type: kind.type,
      note: "",
    },
    validators: {
      onSubmit: schema,
    },
    async onSubmit({ value: v }) {
      const value = Number(v.value);
      const { note, type } = v;
      const errMsg = await Effect.runPromise(program({ value, note, type, kindId: kind.id }));
      setError(errMsg);
      if (errMsg === null) {
        onClose();
        form.reset();
        revalidate();
        revalidateMoney();
      }
    },
  });
  return { error, form };
}

function program({
  value,
  kindId,
  type,
  note,
}: {
  value: number;
  kindId: string;
  type: DB.MoneyType;
  note: string;
}) {
  return Effect.gen(function* () {
    const val = yield* type === "absolute"
      ? calcValueAbsolute(value)
      : calcValueChange(value, kindId);
    yield* Effect.all(
      [db.money.add.record(val, kindId, note), db.moneyKind.update.type(kindId, type)],
      { concurrency: "unbounded" },
    );
    return null;
  }).pipe(
    Effect.catchAll(({ e }) => {
      log.error(e);
      return Effect.succeed(e.message);
    }),
  );
}

function calcValueAbsolute(value: number) {
  return Effect.succeed(value);
}

function calcValueChange(value: number, kindId: string) {
  return Effect.gen(function* () {
    const money = yield* db.money.get.last(Date.now(), kindId);
    return new Decimal(money).plus(value).toNumber();
  });
}
