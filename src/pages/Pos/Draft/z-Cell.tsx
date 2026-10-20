import { useEffect, useState, type KeyboardEvent, type ReactNode } from "react";
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
  allowNegative,
  singleClickEdit,
  editId,
  prefix,
  onChange,
  onCommit,
  onSelect,
  onStartEdit,
  onEditingDone,
  onEditKeyDown,
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
  allowNegative?: boolean;
  /** One click enters the editor; otherwise it selects and Enter/double-click edits. */
  singleClickEdit?: boolean;
  /** The id the editing input gets, so a shortcut can find it. */
  editId?: string;
  /** Drawn over the left of the cell (e.g. a key hint), in both modes. */
  prefix?: ReactNode;
  /** Fires on every keystroke, before commit; lets a total update live. */
  onChange?: (raw: string) => void;
  onCommit: (raw: string) => void;
  onSelect: () => void;
  onStartEdit: () => void;
  onEditingDone: () => void;
  /** Intercept an editor key before the Cell's defaults; return true when handled. */
  onEditKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => boolean;
  align?: "left" | "right" | "center";
}) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => {
    if (editing) setDraft(String(value));
  }, [editing, value]);
  function handleDraft(next: string) {
    setDraft(next);
    onChange?.(next);
  }
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
    if (onEditKeyDown?.(event) === true) return;
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
        if (editing) return;
        onSelect();
        if (singleClickEdit === true) onStartEdit();
      }}
      onDoubleClick={singleClickEdit === true ? undefined : onStartEdit}
      title={
        editing
          ? undefined
          : singleClickEdit === true
            ? "Klik untuk mengubah"
            : "Klik dua kali untuk mengubah"
      }
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
          {prefix !== undefined ? <span className="shrink-0">{prefix}</span> : null}
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
              id={editId}
              autoFocus
              value={Number(draft) || 0}
              onValueChange={(next) => handleDraft(String(next))}
              className={cn(editClass, alignClass)}
              onBlur={handleEditBlur}
              onKeyDown={handleEditKeyDown}
            />
          ) : currency ? (
            <InputCurrency
              id={editId}
              autoFocus
              allowNegative={allowNegative}
              value={Number(draft) || 0}
              onValueChange={(next) => handleDraft(String(next))}
              className={cn(editClass, alignClass)}
              onBlur={handleEditBlur}
              onKeyDown={handleEditKeyDown}
            />
          ) : (
            <Input
              id={editId}
              autoFocus
              value={draft}
              placeholder={placeholder}
              className={cn(editClass, alignClass, "placeholder:italic")}
              onChange={(event) =>
                handleDraft(
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
            prefix !== undefined ? "justify-between" : justifyClass,
          )}
        >
          {prefix !== undefined ? <span className="shrink-0">{prefix}</span> : null}
          {empty ? <span className="text-muted-foreground italic">{placeholder}</span> : display}
        </button>
      )}
    </div>
  );
}
