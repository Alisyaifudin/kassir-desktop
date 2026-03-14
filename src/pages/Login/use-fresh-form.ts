import { useForm } from "@tanstack/react-form";
import { Effect, Either } from "effect";
import { useState } from "react";
import { useNavigate } from "react-router";
import z from "zod";
import { db } from "~/database";
import { auth } from "~/lib/auth";
import { log } from "~/lib/log";

const schema = z
  .object({
    name: z.string().nonempty(),
    password: z.string(),
    confirm: z.string(),
  })
  .refine((data) => data.password === data.confirm, {
    message: "Kata sandi tidak sesuai",
    path: ["confirm"],
  });

type InputForm = z.infer<typeof schema>;

const defaultValues: InputForm = { name: "", password: "", confirm: "" };

export function useFreshForm() {
  const navigate = useNavigate();
  const [error, setError] = useState<null | string>(null);
  const form = useForm({
    defaultValues,
    validators: {
      onSubmit: schema,
    },
    async onSubmit({ value }) {
      const { password, name } = value;
      const either = await Effect.runPromise(program(name, password));
      Either.match(either, {
        onLeft(errMsg) {
          setError(errMsg);
        },
        onRight(user) {
          setError(null);
          auth.set(user);
          navigate("/setting");
        },
      });
    },
  });
  return { error, form };
}

function program(name: string, password: string) {
  return Effect.gen(function* () {
    const hash = yield* auth.hash(password);
    yield* db.cashier.add({ name, role: "admin", hash });
    return { name, role: "admin" } as const;
  }).pipe(
    Effect.catchTag("DbError", ({ e }) => {
      log.error(e);
      return Effect.fail("Gagal menyimpan di database");
    }),
    Effect.catchTag("InvokeError", ({ e }) => {
      log.error(e);
      return Effect.fail(e.message);
    }),
    Effect.either,
  );
}
