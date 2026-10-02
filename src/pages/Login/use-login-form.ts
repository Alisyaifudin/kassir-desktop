import { useForm } from "@tanstack/react-form";
import { Effect, Either } from "effect";
import { useState } from "react";
import { useNavigate } from "react-router";
import z from "zod";
import { verify } from "~/lib/auth";
import { log } from "~/lib/log";
import { service } from "~/services";

const schema = z.object({
  id: z.string().nonempty(),
  password: z.string(),
});

type InputForm = z.infer<typeof schema>;

const defaultValues: InputForm = { id: "", password: "" };

export function useLoginForm() {
  const navigate = useNavigate();
  const [error, setError] = useState<null | string>(null);
  const form = useForm({
    defaultValues,
    validators: {
      onSubmit: schema,
    },
    async onSubmit({ value }) {
      const { password, id } = value;
      const either = await Effect.runPromise(program(id, password));
      Either.match(either, {
        onLeft(errMsg) {
          setError(errMsg);
        },
        onRight() {
          setError(null);
          navigate("/");
        },
      });
    },
  });
  return { error, form };
}

function program(id: string, password: string) {
  return Effect.gen(function* () {
    const cashier = yield* service.cashier.get.byId(id);
    yield* verify(password, cashier.hash);
    yield* service.auth.set({ id: cashier.id, role: cashier.role, name: cashier.name });
  }).pipe(
    Effect.catchTag("CashierError", ({ message }) => {
      log.error(message);
      return Effect.fail("Gagal menyimpan di database");
    }),
    Effect.catchTag("InvokeError", ({ message }) => {
      log.error(message);
      return Effect.fail(message);
    }),
    Effect.catchTag("InvalidCredential", () => Effect.fail("Kata sandi salah")),
    Effect.catchTag("NotFound", () => Effect.fail("Akun tidak ditemukan")),
    Effect.catchTag("AuthError", ({ message }) => {
      log.error(message);
      return Effect.fail("Gagal menyimpan sesi");
    }),
    Effect.either,
  );
}
