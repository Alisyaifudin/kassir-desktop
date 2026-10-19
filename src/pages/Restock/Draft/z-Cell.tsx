import { useEffect, useState, type KeyboardEvent } from "react";
import { Undo2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { InputCurrency } from "~/components/ui/input-currency";
import { InputPercent } from "~/components/ui/input-percent";
import { cn } from "~/lib/utils";

export const SELECTED_RING = "z-10 ring-1 ring-primary ring-inset";
export const EDITING_RING = "z-10 ring-2 ring-primary ring-inset";

/** Keep only what a numeric field may hold; everything else is dropped as typed. */
function sanitizeNumeric(raw: string, mode: "integer" | "decimal"): string {
  if (mode === "integer") return raw.replace(/\D/g, "");
  const [whole, ...fraction] = raw.replace(/[^\d.]/g, "").split(".");
  return fraction.length === 0 ? whole : `${whole}.${fraction.join("")}`;
}

/**
 * A labelled cell whose value becomes an input while the parent says so.
 *
 * The parent owns selection and editing, so the whole grid can be driven by the
 * arrow keys; the cell only renders what it is told. `currency` and `percent`
 * pick the right editor for a money or a percentage value — everything else is
 * a plain text field, optionally numeric.
 */
export function Cell({
  id,
  className,
  label,
  selected,
  editing,
  value,
  display,
  empty,
  placeholder,
  base,
  numeric,
  currency,
  percent,
  onCommit,
  onSelect,
  onStartEdit,
  onEditingDone,
  align = "left",
}: {
  id: string;
  className?: string;
  label: string;
  selected: boolean;
  editing: boolean;
  value: string | number;
  display: string;
  empty: boolean;
  placeholder: string;
  base?: string | number;
  numeric?: "integer" | "decimal";
  currency?: boolean;
  percent?: boolean;
  onCommit: (raw: string) => void;
  onSelect: () => void;
  onStartEdit: () => void;
  onEditingDone: () => void;
  align?: "left" | "right" | "center";
}) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => {
    if (editing) setDraft(String(value));
  }, [editing, value]);
  // The tint follows what is on screen: the draft while editing, the committed
  // value otherwise. The undo affordance is the draft's own divergence.
  const canUndo = base !== undefined && draft !== String(base);
  const changed =
    base !== undefined && (editing ? draft !== String(base) : String(value) !== String(base));
  const alignClass =
    align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
  const justifyClass =
    align === "right" ? "justify-end" : align === "center" ? "justify-center" : "justify-start";
  const editClass =
    "h-9 rounded-none border-0 bg-transparent p-0 text-normal shadow-none focus-visible:ring-0 small:h-7";

  function handleEditKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      onCommit(draft);
      onEditingDone();
      return;
    }
    if (event.key === "Escape") {
      onEditingDone();
      return;
    }
    // Ctrl/Cmd+Z is the undo button, from the keyboard.
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z" && canUndo) {
      event.preventDefault();
      setDraft(String(base));
      onCommit(String(base));
    }
  }

  function handleEditBlur() {
    onCommit(draft);
    onEditingDone();
  }

  return (
    <div
      id={id}
      onClick={() => {
        if (!editing) onSelect();
      }}
      onDoubleClick={onStartEdit}
      title={editing ? undefined : "Klik dua kali untuk mengubah"}
      className={cn(
        "relative flex flex-col justify-center gap-0.5 px-2 py-1",
        className,
        changed && "bg-destructive/10",
        selected && (editing ? EDITING_RING : SELECTED_RING),
      )}
    >
      <span className={cn("text-small leading-none text-muted-foreground select-none", alignClass)}>
        {label}
      </span>
      {editing ? (
        <div className="flex items-center gap-1">
          {canUndo ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-6 shrink-0"
              title="Batalkan perubahan"
              // Keep the input focused so its blur does not commit first.
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                // Revert and stay in the field: undo is not how you leave it.
                setDraft(String(base));
                onCommit(String(base));
              }}
            >
              <Undo2 className="icon" />
            </Button>
          ) : null}
          {percent ? (
            <InputPercent
              autoFocus
              value={Number(draft) || 0}
              onValueChange={(next) => setDraft(String(next))}
              className={cn(editClass, alignClass)}
              onBlur={handleEditBlur}
              onKeyDown={handleEditKeyDown}
            />
          ) : currency ? (
            <InputCurrency
              autoFocus
              value={Number(draft) || 0}
              onValueChange={(next) => setDraft(String(next))}
              className={cn(editClass, alignClass)}
              onBlur={handleEditBlur}
              onKeyDown={handleEditKeyDown}
            />
          ) : (
            <Input
              autoFocus
              value={draft}
              placeholder={placeholder}
              className={cn(editClass, alignClass, "placeholder:italic")}
              onChange={(event) =>
                setDraft(
                  numeric === undefined
                    ? event.currentTarget.value
                    : sanitizeNumeric(event.currentTarget.value, numeric),
                )
              }
              inputMode={numeric === "integer" ? "numeric" : undefined}
              onBlur={handleEditBlur}
              onKeyDown={handleEditKeyDown}
            />
          )}
        </div>
      ) : (
        <button
          type="button"
          tabIndex={-1}
          className={cn(
            "flex h-9 w-full items-center text-normal select-none small:h-7",
            justifyClass,
          )}
        >
          {empty ? <span className="text-muted-foreground italic">{placeholder}</span> : display}
        </button>
      )}
    </div>
  );
}
