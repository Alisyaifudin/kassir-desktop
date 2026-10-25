import { FieldError, FieldLabel } from "~/components/ui/field";
import { useFieldContext } from "./util-extra-options";
import { Input } from "~/components/ui/input";
import { useStore } from "@tanstack/react-form";

export function ShortField({ children, type }: { children: string; type: "text" | "number" }) {
  const field = useFieldContext<string>();
  const isSubmitting = useStore(field.form.store, (state) => state.isSubmitting);
  return (
    <div className="flex flex-col gap-1">
      <div className="grid grid-cols-[150px_1fr] small:grid-cols-[100px_1fr] items-center">
        <FieldLabel htmlFor={field.name}>{children}</FieldLabel>
        <Input
          type={type}
          className="outline w-full"
          name={field.name}
          step="any"
          value={field.state.value}
          onBlur={field.handleBlur}
          disabled={isSubmitting}
          onChange={(e) => field.handleChange(e.currentTarget.value)}
          required
          aria-autocomplete="list"
        />
      </div>
      <FieldError errors={field.state.meta.errors} />
    </div>
  );
}
