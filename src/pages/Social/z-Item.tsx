import { Input } from "~/components/ui/input";
import { Loader2 } from "lucide-react";
import { TextError } from "~/components/TextError";
import { memo } from "react";
import { cn } from "~/lib/utils";
import { Show } from "~/components/Show";
import { DeleteBtn } from "./z-DeleteBtn";
import { useSocialForm } from "./use-social-form";
import { Field, FieldError } from "~/components/ui/field";

/**
 * One contact, edited in place: the write runs on submit (Enter, or the hidden
 * submit button), so there is no save button to reach for.
 */
export const Item = memo(function Item({
  id,
  name,
  value,
}: {
  id: string;
  name: string;
  value: string;
}) {
  const { form, error } = useSocialForm({ id, name, value });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
      className={cn(
        "grid gap-2 py-0.5 px-0.5 items-center",
        "grid-cols-[250px_1fr_60px]",
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
