import { Input } from "~/components/ui/input";
import { Loader2 } from "lucide-react";
import { TextError } from "~/components/TextError";
import { memo } from "react";
import { cn } from "~/lib/utils";
import { Show } from "~/components/Show";
import { DeleteBtn } from "./z-DeleteBtn";
import { Social } from "~/database-effect/social/get-all";
import { useUpdate } from "./use-update";
import { Field, FieldError } from "~/components/ui/field";

export const Item = memo(function ({ id, name, value }: Social) {
  const { form, error } = useUpdate({ id, name, value });
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
            <DeleteBtn id={id} name={name} value={value} />
          </Show>
        )}
      </form.Subscribe>
      <TextError className="col-span-2">{error}</TextError>
    </form>
  );
});
