import { Password } from "~/components/Password";
import { TextError } from "~/components/TextError";
import { Button } from "~/components/ui/button";
import { Spinner } from "~/components/Spinner";
import { capitalize } from "~/lib/utils";
import { Cashier } from "~/database/cashier/get-all";
import { useLoginForm } from "./use-login-form";
import { Field, FieldError, FieldGroup, FieldLabel } from "~/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

export function LoginForm({ cashiers }: { cashiers: Cashier[] }) {
  const { form, error } = useLoginForm();
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
          <form.Field name="name">
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
                      <SelectItem key={cashier.name} value={cashier.name}>
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
              <form.Subscribe selector={(state) => state.values.name}>
                {(name) => (
                  <Button className="w-fit self-end" disabled={isSubmitting || name === ""}>
                    Simpan
                    <Spinner when={isSubmitting} />
                  </Button>
                )}
              </form.Subscribe>
            )}
          </form.Subscribe>
        </FieldGroup>
      </form>
    </div>
  );
}
