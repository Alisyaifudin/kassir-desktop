import { Checkbox } from "~/components/ui/checkbox";
import { FieldLabel } from "~/components/ui/field";
import { useStore } from "@tanstack/react-form";
import { useFieldContext } from "./util-extra-options";

export function CheckDual() {
  const field = useFieldContext<boolean>();
  const isSubmitting = useStore(field.form.store, (state) => state.isSubmitting);
  return (
    <div className="grid grid-cols-[150px_1fr] small:grid-cols-[100px_1fr] items-center">
      <FieldLabel htmlFor="dual-check">Dual</FieldLabel>
      <Checkbox
        id="dual-check"
        checked={field.state.value}
        disabled={isSubmitting}
        onCheckedChange={(e) => field.handleChange(e === true)}
      />
    </div>
  );
}
