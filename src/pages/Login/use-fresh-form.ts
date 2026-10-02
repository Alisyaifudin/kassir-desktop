import { useForm } from "@tanstack/react-form";
import { Effect, Either } from "effect";
import { useState } from "react";
import { useNavigate } from "react-router";
import z from "zod";
import { hash } from "~/lib/auth";
import { log } from "~/lib/log";
import { generateId } from "~/lib/random";
import { service } from "~/services";

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
        onRight() {
          setError(null);
          navigate("/setting");
        },
      });
    },
  });
  return { error, form };
}

function program(name: string, password: string) {
  return Effect.gen(function* () {
    const id = generateId();
    const passwordHash = yield* hash(password);
    yield* service.cashier.add({ id, name, role: "admin", hash: passwordHash });
    yield* service.auth.set({ id, name, role: "admin" });
  }).pipe(
    Effect.catchTag("CashierError", ({ message }) => {
      log.error(message);
      return Effect.fail("Gagal menyimpan di database");
    }),
    Effect.catchTag("InvokeError", ({ message }) => {
      log.error(message);
      return Effect.fail(message);
    }),
    Effect.catchTag("AuthError", ({ message }) => {
      log.error(message);
      return Effect.fail("Gagal menyimpan sesi");
    }),
    Effect.either,
  );
}
