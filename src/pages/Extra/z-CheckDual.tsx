import { useStore } from "@tanstack/react-form";
import { Checkbox } from "~/components/ui/checkbox";
import { useFieldContext } from "./util-extra-options";
import { FieldRow } from "./z-FieldRow";

/**
 * The `dual` flag: a charge that carries it also books its own outcoming record,
 * so the sale shows the money on both sides. Only a sale writes that twin —
 * on a purchase the charge is already the outcoming side.
 */
export function CheckDual() {
  const field = useFieldContext<boolean>();
  const isSubmitting = useStore(field.form.store, (state) => state.isSubmitting);
  return (
    <FieldRow
      label="Dual"
      htmlFor="dual"
      hint="Penjualan yang memakai biaya ini ikut mencatat pengeluaran kembarannya."
    >
      <div className="flex h-9 items-center">
        <Checkbox
          id="dual"
          checked={field.state.value}
          disabled={isSubmitting}
          onCheckedChange={(checked) => field.handleChange(checked === true)}
        />
      </div>
    </FieldRow>
  );
}
