import { Input } from "~/components/ui/input";
import { TextError } from "~/components/TextError";
import { Button } from "~/components/ui/button";
import { Spinner } from "~/components/Spinner";
import { useFreshForm } from "./use-fresh-form";
import { Field, FieldError, FieldGroup, FieldLabel } from "~/components/ui/field";
import { Password } from "~/components/Password";

export function FreshForm() {
  const { form, error } = useFreshForm();
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
              <Field orientation="horizontal">
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
              </Field>
            )}
          </form.Field>
          <form.Field name="password">
            {(field) => (
              <Field orientation="horizontal">
                <FieldLabel htmlFor={`input-${field.name}`}>Kata sandi</FieldLabel>
                <Password
                  required
                  type="password"
                  id={`input-${field.name}`}
                  name={field.name}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.currentTarget.value)}
                  onBlur={field.handleBlur}
                  aria-autocomplete="list"
                />
                <FieldError errors={field.state.meta.errors}></FieldError>
              </Field>
            )}
          </form.Field>
          <form.Field name="confirm">
            {(field) => (
              <Field orientation="horizontal">
                <FieldLabel htmlFor={`input-${field.name}`}>Ulangi kata sandi</FieldLabel>
                <Password
                  required
                  type="password"
                  id={`input-${field.name}`}
                  name={field.name}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.currentTarget.value)}
                  onBlur={field.handleBlur}
                  aria-autocomplete="list"
                />
                <FieldError errors={field.state.meta.errors}></FieldError>
              </Field>
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
