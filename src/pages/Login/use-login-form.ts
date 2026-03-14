import { useForm } from "@tanstack/react-form";
import { Effect, Either } from "effect";
import { useState } from "react";
import { useNavigate } from "react-router";
import z from "zod";
import { db } from "~/database";
import { auth } from "~/lib/auth-effect";
import { log } from "~/lib/log";

const schema = z.object({
  name: z.string().nonempty(),
  password: z.string(),
});

type InputForm = z.infer<typeof schema>;

const defaultValues: InputForm = { name: "", password: "" };

export function useLoginForm() {
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
    const cashier = yield* db.cashier.get.byName(name);
    yield* auth.verify(password, cashier.hash);
    auth.set({ name, role: "admin" });
    return { role: cashier.role, name: cashier.name };
  }).pipe(
    Effect.catchTag("DbError", ({ e }) => {
      log.error(e);
      return Effect.fail("Gagal menyimpan di database");
    }),
    Effect.catchTag("InvokeError", ({ e }) => {
      log.error(e);
      return Effect.fail(e.message);
    }),
    Effect.catchTag("InvalidCredential", () => Effect.fail("Kata sandi salah")),
    Effect.catchTag("NotFound", () => Effect.fail("Akun tidak ditemukan")),
    Effect.either,
  );
}
