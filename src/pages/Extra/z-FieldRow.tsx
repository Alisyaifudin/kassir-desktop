import type { ReactNode } from "react";
import { FieldError, FieldLabel } from "~/components/ui/field";

/** The label's line box: as tall as a control (`h-9`), so it centres on the field. */
const LABEL = "flex h-9 w-fit items-center gap-2 leading-snug";

/**
 * One labelled row of the extra form: the name in a fixed left column, the
 * control, its hint and its error stacked in the right one.
 *
 * `htmlFor` is optional because not every row owns a single input — the kind
 * picker is a group of two buttons, and a `<label>` pointing at a `<div>` would
 * claim an association that is not there.
 */
export function FieldRow({
  label,
  htmlFor,
  errors,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  errors?: Array<{ message?: string } | undefined>;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[150px_1fr] items-start gap-x-4">
      {htmlFor === undefined ? (
        <span className={LABEL}>{label}</span>
      ) : (
        <FieldLabel htmlFor={htmlFor} className={LABEL}>
          {label}
        </FieldLabel>
      )}
      <div className="flex min-w-0 flex-col gap-1">
        {children}
        {hint === undefined ? null : <p className="text-xs text-muted-foreground">{hint}</p>}
        <FieldError className="text-sm" errors={errors} />
      </div>
    </div>
  );
}
