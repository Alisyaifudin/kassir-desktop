import { useStore } from "@tanstack/react-form";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { KIND_LABEL, useFieldContext, type Kind } from "./util-extra-options";
import { FieldRow } from "./z-FieldRow";

/**
 * The kinds in the order the form offers them. `percent` first: it is the
 * default, and it is the kind a surcharge usually wants.
 */
const KINDS: Kind[] = ["percent", "number"];

/**
 * The kind as a two-segment control rather than a select: with two options a
 * select costs a click to open and hides the alternative, and this choice is the
 * one that decides which field edits the amount below it.
 */
export function KindField() {
  const field = useFieldContext<Kind>();
  const isSubmitting = useStore(field.form.store, (state) => state.isSubmitting);
  return (
    <FieldRow label="Jenis" hint="Persen dihitung dari total; angka ditambahkan apa adanya.">
      <div
        role="group"
        aria-label="Jenis"
        className="flex h-9 w-fit items-center gap-1 rounded-md border p-0.5"
      >
        {KINDS.map((kind) => {
          const selected = field.state.value === kind;
          return (
            <Button
              key={kind}
              type="button"
              variant="ghost"
              aria-pressed={selected}
              disabled={isSubmitting}
              onClick={() => field.handleChange(kind)}
              className={cn(
                "h-8 rounded-sm px-4 text-sm",
                selected
                  ? "bg-secondary font-medium text-secondary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {KIND_LABEL[kind]}
            </Button>
          );
        })}
      </div>
    </FieldRow>
  );
}
