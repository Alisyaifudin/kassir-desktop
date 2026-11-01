import { useStore } from "@tanstack/react-form";
import { Input } from "~/components/ui/input";
import { useFieldContext } from "./util-extra-options";
import { FieldRow } from "./z-FieldRow";

/** A one-line text field: the extra's name. */
export function ShortField({ children, placeholder }: { children: string; placeholder?: string }) {
  const field = useFieldContext<string>();
  const isSubmitting = useStore(field.form.store, (state) => state.isSubmitting);
  return (
    <FieldRow label={children} htmlFor={field.name} errors={field.state.meta.errors}>
      <Input
        type="text"
        id={field.name}
        name={field.name}
        placeholder={placeholder}
        value={field.state.value}
        onBlur={field.handleBlur}
        disabled={isSubmitting}
        onChange={(e) => field.handleChange(e.currentTarget.value)}
        // `Input` already declares `aria-autocomplete` (the WebView2 workaround
        // in `input.tsx`); nothing extra is needed here.
        required
      />
    </FieldRow>
  );
}
