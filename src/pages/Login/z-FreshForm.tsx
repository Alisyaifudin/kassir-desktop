import { Rocket } from "lucide-react";
import { Input } from "~/components/ui/input";
import { TextError } from "~/components/TextError";
import { Button } from "~/components/ui/button";
import { Spinner } from "~/components/Spinner";
import { useFreshForm } from "./use-fresh-form";
import { FieldError, FieldGroup, FieldLabel } from "~/components/ui/field";
import { Password } from "~/components/Password";

export function FreshForm() {
  const { form, error } = useFreshForm();

  return (
    <>
      <div className="mb-6 flex flex-col gap-2 small:mb-5 small:gap-1">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white small:size-12">
          <Rocket className="size-7 small:size-6" />
        </span>
        <h1 className="text-big font-bold tracking-tight">Selamat datang di Kassir</h1>
        <p className="text-muted-foreground">
          Buat akun admin pertama untuk mulai mengelola toko Anda. 😊
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit();
        }}
        className="flex flex-col gap-6 small:gap-5"
      >
        <FieldGroup className="gap-6 small:gap-5">
          <form.Field name="name">
            {(field) => (
              <div className="flex flex-col gap-3 small:gap-2">
                <FieldLabel htmlFor={`input-${field.name}`}>Nama</FieldLabel>
                <Input
                  required
                  id={`input-${field.name}`}
                  name={field.name}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.currentTarget.value)}
                  onBlur={field.handleBlur}
                  aria-autocomplete="list"
                  placeholder="Nama Anda"
                />
                <FieldError errors={field.state.meta.errors} />
              </div>
            )}
          </form.Field>

          <form.Field name="password">
            {(field) => (
              <div className="flex flex-col gap-3 small:gap-2">
                <FieldLabel htmlFor={`input-${field.name}`}>Kata sandi</FieldLabel>
                <Password
                  id={`input-${field.name}`}
                  name={field.name}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.currentTarget.value)}
                  onBlur={field.handleBlur}
                  aria-autocomplete="list"
                  placeholder="••••••••"
                />
                <FieldError errors={field.state.meta.errors} />
              </div>
            )}
          </form.Field>

          <form.Field name="confirm">
            {(field) => (
              <div className="flex flex-col gap-3 small:gap-2">
                <FieldLabel htmlFor={`input-${field.name}`}>Ulangi kata sandi</FieldLabel>
                <Password
                  id={`input-${field.name}`}
                  name={field.name}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.currentTarget.value)}
                  onBlur={field.handleBlur}
                  aria-autocomplete="list"
                  placeholder="••••••••"
                />
                <FieldError errors={field.state.meta.errors} />
              </div>
            )}
          </form.Field>

          <TextError>{error}</TextError>

          <form.Subscribe selector={(state) => state.isSubmitting}>
            {(isSubmitting) => (
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                Buat Akun
                <Spinner when={isSubmitting} />
              </Button>
            )}
          </form.Subscribe>
        </FieldGroup>
      </form>
    </>
  );
}
