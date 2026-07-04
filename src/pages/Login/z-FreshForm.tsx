import { Input } from "~/components/ui/input";
import { TextError } from "~/components/TextError";
import { Button } from "~/components/ui/button";
import { Spinner } from "~/components/Spinner";
import { FieldError, FieldGroup, FieldLabel } from "~/components/ui/field";
import { Password } from "~/components/Password";
import z from "zod";
import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { Cashier, CashierError } from "~/services/cashier";
import { Effect, Either } from "effect";

type Props = {
  onAdd: (name: string, password: string) => Effect.Effect<Cashier, CashierError>;
  login: (user: Cashier) => void;
};

export function FreshForm({ onAdd, login }: Props) {
  const { form, error } = useFreshForm(onAdd, login);
  return (
    <div className="flex flex-col gap-5 p-5 bg-white mx-auto w-full max-w-5xl ">
      <h1 className="text-big font-bold">Selamat Datang</h1>
      <p>Silakan buat akun terlebih 😊</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit();
        }}
        className="flex text-normal flex-col gap-2"
      >
        <FieldGroup>
          <form.Field name="name">
            {(field) => (
              <div className="grid grid-cols-[250px_1fr] small:grid-cols-[100px_1fr] items-center">
                <FieldLabel htmlFor={`input-${field.name}`}>Nama</FieldLabel>
                <Input
                  required
                  id={`input-${field.name}`}
                  name={field.name}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.currentTarget.value)}
                  onBlur={field.handleBlur}
                  aria-autocomplete="list"
                />
                <FieldError errors={field.state.meta.errors}></FieldError>
              </div>
            )}
          </form.Field>
          <form.Field name="password">
            {(field) => (
              <div className="grid grid-cols-[250px_1fr] small:grid-cols-[100px_1fr] items-center">
                <FieldLabel htmlFor={`input-${field.name}`}>Kata sandi</FieldLabel>
                <Password
                  type="password"
                  id={`input-${field.name}`}
                  name={field.name}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.currentTarget.value)}
                  onBlur={field.handleBlur}
                  aria-autocomplete="list"
                />
                <FieldError errors={field.state.meta.errors}></FieldError>
              </div>
            )}
          </form.Field>
          <form.Field name="confirm">
            {(field) => (
              <div className="grid grid-cols-[250px_1fr] small:grid-cols-[100px_1fr] items-center">
                <FieldLabel htmlFor={`input-${field.name}`}>Ulangi kata sandi</FieldLabel>
                <Password
                  type="password"
                  id={`input-${field.name}`}
                  name={field.name}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.currentTarget.value)}
                  onBlur={field.handleBlur}
                  aria-autocomplete="list"
                />
                <FieldError errors={field.state.meta.errors}></FieldError>
              </div>
            )}
          </form.Field>
          <TextError>{error}</TextError>
          <form.Subscribe selector={(state) => state.isSubmitting}>
            {(isSubmitting) => (
              <Button className="w-fit self-end" disabled={isSubmitting}>
                Simpan
                <Spinner when={isSubmitting} />
              </Button>
            )}
          </form.Subscribe>
        </FieldGroup>
      </form>
    </div>
  );
}

// =======================================================
// =======================================================
// =======================================================

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

function useFreshForm(
  add: (name: string, password: string) => Effect.Effect<Cashier, CashierError>,
  login: (user: Cashier) => void,
) {
  const [error, setError] = useState<null | string>(null);
  const form = useForm({
    defaultValues,
    validators: {
      onSubmit: schema,
    },
    async onSubmit({ value }) {
      const { password, name } = value;
      const either = await Effect.runPromise(add(name, password).pipe(Effect.either));
      Either.match(either, {
        onLeft({ e }) {
          setError(e.message);
        },
        onRight(cashier) {
          login(cashier);
        },
      });
    },
  });
  return { error, form };
}
