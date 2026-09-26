import { Field, FieldError, FieldLabel } from "~/components/ui/field";
import { Textarea } from "~/components/ui/textarea";
import { useFieldContext } from "./util-product-options";
import { useStore } from "@tanstack/react-form";

export function NoteInput() {
  const field = useFieldContext<string>();
  const isSubmitting = useStore(field.form.store, (state) => state.isSubmitting);
  return (
    <Field>
      <FieldLabel htmlFor={field.name}>Catatan</FieldLabel>
      <Textarea
        value={field.state.value}
        name={field.name}
        rows={3}
        disabled={isSubmitting}
        id={field.name}
        onBlur={field.handleBlur}
        onChange={(e) => field.handleChange(e.currentTarget.value)}
      />
      <FieldError errors={field.state.meta.errors} />
    </Field>
  );
}
