import { useForm } from "@tanstack/react-form";
import { useState } from "react";
import { z } from "zod";
import { useKind } from "./use-kind";
import { db } from "~/database-effect";
import { Effect } from "effect";
import Decimal from "decimal.js";
import { log } from "~/lib/log";
import { revalidate } from "./use-data";

const schema = z.object({
  value: z.string().refine((r) => {
    const num = Number(r);
    return !isNaN(num) && isFinite(num);
  }),
  type: z.enum(["absolute", "change"]),
  note: z.string(),
});

export function useNew(onClose: () => void) {
  const [error, setError] = useState<null | string>(null);
  const kind = useKind();
  const form = useForm({
    defaultValues: {
      value: "",
      type: kind === "debt" ? "change" : ("absolute" as "change" | "absolute"),
      note: "",
    },
    validators: {
      onSubmit: schema,
    },
    async onSubmit({ value: v }) {
      const value = Number(v.value);
      const { note, type } = v;
      const errMsg = await Effect.runPromise(program({ value, note, type, kind }));
      setError(errMsg);
      if (errMsg === null) {
        onClose();
        form.reset();
        revalidate();
      }
    },
  });
  return { error, form };
}

function program({
  value,
  kind,
  type,
  note,
}: {
  value: number;
  kind: "diff" | "saving" | "debt";
  type: "absolute" | "change";
  note: string;
}) {
  return Effect.gen(function* () {
    const val = yield* type === "absolute"
      ? calcValueAbsolute(value)
      : calcValueChange(value, kind);
    yield* db.money.add(val, kind, note);
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

function calcValueChange(value: number, kind: "diff" | "saving" | "debt") {
  return Effect.gen(function* () {
    const money = yield* db.money.get.last(Date.now(), kind);
    let val = value;
    if (money !== null) {
      val = new Decimal(money.value).plus(value).toNumber();
    }
    return val;
  });
}
