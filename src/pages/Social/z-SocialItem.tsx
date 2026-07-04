import { useForm } from "@tanstack/react-form";
import { useState } from "react";
import z from "zod";
import { Show } from "~/components/Show";
import { TextError } from "~/components/TextError";
import { Field, FieldError } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Loader2 } from "lucide-react";
import { cn } from "~/lib/utils";
import { Social } from "~/services/social/type";
import { DeleteDialog } from "./z-DeleteDialog";

const schema = z.object({
  name: z.string().nonempty("Harus ada"),
  value: z.string().nonempty("Harus ada"),
});

type ItemProps = {
  social: Social;
  onUpdate: (id: string, name: string, value: string) => Promise<string | null>;
  onDelete: (id: string) => Promise<string | null>;
};

export function SocialItem({ social, onUpdate, onDelete }: ItemProps) {
  const [error, setError] = useState<null | string>(null);
  const form = useForm({
    defaultValues: { name: social.name, value: social.value },
    validators: { onSubmit: schema },
    async onSubmit({ value }) {
      const errMsg = await onUpdate(social.id, value.name, value.value);
      setError(errMsg);
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
      className={cn(
        "grid gap-2 py-0.5 px-0.5 items-center",
        "grid-cols-[250px_1fr_60px] small:grid-cols-[200px_1fr_30px]",
      )}
    >
      <form.Field name="name">
        {(field) => (
          <Field>
            <Input
              name={field.name}
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.currentTarget.value)}
              placeholder="Nama Kontak"
              aria-autocomplete="list"
              disabled={field.form.state.isSubmitting}
            />
            <FieldError errors={field.state.meta.errors} />
          </Field>
        )}
      </form.Field>
      <form.Field name="value">
        {(field) => (
          <Field>
            <Input
              name={field.name}
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.currentTarget.value)}
              placeholder="Isian Kontak"
              aria-autocomplete="list"
              disabled={field.form.state.isSubmitting}
            />
            <FieldError errors={field.state.meta.errors} />
          </Field>
        )}
      </form.Field>
      <button type="submit" className="hidden">
        Submit
      </button>
      <form.Subscribe selector={(e) => e.isSubmitting}>
        {(isSubmitting) => (
          <Show when={!isSubmitting} fallback={<Loader2 className="animate-spin" />}>
            <DeleteDialog
              id={social.id}
              name={social.name}
              value={social.value}
              onDelete={onDelete}
            />
          </Show>
        )}
      </form.Subscribe>
      <TextError className="col-span-3">{error}</TextError>
    </form>
  );
}
