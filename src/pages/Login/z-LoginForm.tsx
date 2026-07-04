import { Password } from "~/components/Password";
import { TextError } from "~/components/TextError";
import { Button } from "~/components/ui/button";
import { Spinner } from "~/components/Spinner";
import { capitalize } from "~/lib/capitalize";
import { FieldError, FieldGroup, FieldLabel } from "~/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import z from "zod";
import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { Effect, Either } from "effect";
import { Cashier, CashierError } from "~/services/cashier";
import { HashError, InvalidPassword } from "~/services/hash";
import { NotFoundError } from "~/lib/error-effect";

type Props = {
  cashiers: Cashier[];
  onCheck: (
    id: string,
    password: string,
  ) => Effect.Effect<Cashier, CashierError | NotFoundError | HashError | InvalidPassword>;
  login: (user: Cashier) => void;
};

export function LoginForm({ cashiers, onCheck, login }: Props) {
  const { form, error } = useLoginForm(onCheck, login);
  return (
    <div className="flex flex-col gap-5 p-5 bg-white mx-auto w-full max-w-5xl ">
      <h1 className="text-big font-bold">Masuk</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit();
        }}
        className="flex text-normal flex-col gap-2"
      >
        <FieldGroup>
          <form.Field name="id">
            {(field) => (
              <div className="grid grid-cols-[150px_1fr] small:grid-cols-[100px_1fr] items-center">
                <FieldLabel htmlFor={`select-${field.name}`}>Nama</FieldLabel>
                <Select
                  name={field.name}
                  value={field.state.value}
                  onValueChange={field.handleChange}
                >
                  <SelectTrigger
                    className="w-full"
                    id={`select-${field.name}`}
                    aria-invalid={!field.state.meta.isValid}
                  >
                    <SelectValue placeholder="Pilih Akun" />
                  </SelectTrigger>
                  <SelectContent position="item-aligned">
                    {cashiers.map((cashier) => (
                      <SelectItem key={cashier.id} value={cashier.id}>
                        {capitalize(cashier.name)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError errors={field.state.meta.errors}></FieldError>
              </div>
            )}
          </form.Field>
          <form.Field name="password">
            {(field) => (
              <div className="grid grid-cols-[150px_1fr] small:grid-cols-[100px_1fr] items-center">
                <FieldLabel htmlFor={`input-${field.name}`}>Kata sandi</FieldLabel>
                <Password
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
              <Button
                className="w-fit self-end"
                disabled={isSubmitting || form.state.values.id === ""}
              >
                Masuk
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

const schema = z.object({
  id: z.string().nonempty(),
  password: z.string(),
});

type InputForm = z.infer<typeof schema>;

const defaultValues: InputForm = { id: "", password: "" };

function useLoginForm(
  onCheck: (
    id: string,
    password: string,
  ) => Effect.Effect<Cashier, CashierError | NotFoundError | HashError | InvalidPassword>,
  login: (user: Cashier) => void,
) {
  const [error, setError] = useState<null | string>(null);
  const form = useForm({
    defaultValues,
    validators: {
      onSubmit: schema,
    },
    async onSubmit({ value }) {
      const { password, id } = value;
      const either = await Effect.runPromise(onCheck(id, password).pipe(Effect.either));
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
