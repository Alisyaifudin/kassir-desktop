import { Spinner } from "~/components/Spinner";
import { TextError } from "~/components/TextError";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Field, FieldError, FieldLabel } from "~/components/ui/field";
import { Effect } from "effect";
import { InfoDetailService, type Info } from "~/services/info";
import z from "zod";
import { useForm } from "@tanstack/react-form";
import { useState } from "react";

const schema = z.object({
  name: z.string(),
  address: z.string(),
  header: z.string(),
  footer: z.string(),
});

export const infoEffect = Effect.gen(function* () {
  const infoService = yield* InfoDetailService;
  const useInfo = () => infoService.useInfo();
  const set = (info: Info) => infoService.set(info);
  return function Info() {
    const info = useInfo();
    const [error, setError] = useState<string | null>(null);
    const form = useForm({
      defaultValues: info,
      validators: {
        onSubmit: schema,
      },
      async onSubmit({ value }) {
        const error = await set(value);
        setError(error);
      },
    });
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit();
        }}
        className="flex flex-col gap-2 p-0.5"
      >
        <form.Field name="name">
          {(field) => (
            <FieldText
              label={<FieldLabel htmlFor={`input-${field.name}`}>Nama Toko</FieldLabel>}
              error={<FieldError errors={field.state.meta.errors} />}
            >
              <Input
                value={field.state.value}
                onBlur={field.handleBlur}
                disabled={field.form.state.isSubmitting}
                onChange={(e) => field.handleChange(e.currentTarget.value)}
                id={`input-${field.name}`}
                aria-autocomplete="list"
              />
            </FieldText>
          )}
        </form.Field>
        <form.Field name="address">
          {(field) => (
            <FieldText
              label={<FieldLabel htmlFor={`input-${field.name}`}>Alamat</FieldLabel>}
              error={<FieldError errors={field.state.meta.errors} />}
            >
              <Input
                value={field.state.value}
                onChange={(e) => field.handleChange(e.currentTarget.value)}
                onBlur={field.handleBlur}
                disabled={field.form.state.isSubmitting}
                id={`input-${field.name}`}
                aria-autocomplete="list"
              />
            </FieldText>
          )}
        </form.Field>
        <form.Field name="header">
          {(field) => (
            <Field>
              <FieldLabel htmlFor={`input-${field.name}`}>Deskripsi Atas:</FieldLabel>
              <Textarea
                rows={3}
                value={field.state.value}
                onChange={(e) => field.handleChange(e.currentTarget.value)}
                onBlur={field.handleBlur}
                disabled={field.form.state.isSubmitting}
                id={`input-${field.name}`}
                aria-autocomplete="list"
              />
              <FieldError errors={field.state.meta.errors} />
            </Field>
          )}
        </form.Field>
        <form.Field name="footer">
          {(field) => (
            <Field>
              <FieldLabel htmlFor={`input-${field.name}`}>Deskripsi Bawah:</FieldLabel>
              <Textarea
                rows={3}
                value={field.state.value}
                onChange={(e) => field.handleChange(e.currentTarget.value)}
                onBlur={field.handleBlur}
                disabled={field.form.state.isSubmitting}
                id={`input-${field.name}`}
                aria-autocomplete="list"
              />
              <FieldError errors={field.state.meta.errors} />
            </Field>
          )}
        </form.Field>
        <TextError>{error}</TextError>
        <form.Subscribe selector={(e) => e.isSubmitting}>
          {(isSubmitting) => (
            <Button disabled={isSubmitting}>
              Simpan <Spinner when={isSubmitting} />
            </Button>
          )}
        </form.Subscribe>
      </form>
    );
  };
});

function FieldText({
  children,
  label,
  error,
}: {
  children: React.ReactNode;
  label: React.ReactNode;
  error: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 ">
      <div className="grid grid-cols-[160px_1fr] small:grid-cols-[100px_1fr] text-normal items-center gap-1">
        {label}
        {children}
      </div>
      {error}
    </div>
  );
}
