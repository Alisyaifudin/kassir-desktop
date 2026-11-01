import { useStore } from "@tanstack/react-form";
import { InputCurrency } from "~/components/ui/input-currency";
import { InputPercent } from "~/components/ui/input-percent";
import { useFieldContext, type Kind } from "./util-extra-options";
import { FieldRow } from "./z-FieldRow";

/**
 * Both amount inputs are unstyled inners (`border-0`), so the box they sit in is
 * this div: the same look as `Input`, with the focus ring moved to `:focus-within`.
 */
const CONTROL = [
  "flex h-9 items-center gap-1 rounded-md border border-input bg-transparent px-3 shadow-sm",
  "transition-colors focus-within:ring-1 focus-within:ring-ring has-[:disabled]:opacity-50",
].join(" ");

/**
 * What the amount means, in the operator's words: a `number` is rupiah added as
 * typed, a `percent` is a share of the running total (see `recalcExtras`), which
 * is why it is the one that carries a range.
 */
const HINT: Record<Kind, string> = {
  number: "Rupiah tetap, ditambahkan ke total.",
  percent: "Persen dari total berjalan, antara -100 dan 100.",
};

/**
 * The amount, in whatever the chosen kind can express: a dotted rupiah field for
 * `number`, a `%` field clamped to ±100 for `percent`. Switching the kind swaps
 * the field rather than re-reading the same text under a new unit, so a 50000
 * rupiah charge cannot silently become 50000%.
 */
export function ValueField({ children, kind }: { children: string; kind: Kind }) {
  const field = useFieldContext<number>();
  const isSubmitting = useStore(field.form.store, (state) => state.isSubmitting);
  const input = {
    id: field.name,
    name: field.name,
    placeholder: "0",
    value: field.state.value,
    onValueChange: field.handleChange,
    onBlur: field.handleBlur,
    disabled: isSubmitting,
    "aria-invalid": field.state.meta.errors.length > 0 || undefined,
    // Money reads as a column (DESIGN.md), and a percent that grows to `100` must
    // not shift the field's content sideways.
    className: "text-right tabular-nums",
  } as const;

  return (
    <FieldRow
      label={children}
      htmlFor={field.name}
      hint={HINT[kind]}
      errors={field.state.meta.errors}
    >
      <div className={CONTROL}>
        {kind === "number" ? (
          // An extra may be a deduction, so the minus is allowed in both kinds.
          <InputCurrency {...input} allowNegative />
        ) : (
          <InputPercent {...input} min={-100} max={100} />
        )}
      </div>
    </FieldRow>
  );
}
