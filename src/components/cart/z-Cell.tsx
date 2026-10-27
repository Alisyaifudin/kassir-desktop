import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode, type RefObject } from "react";
import { Undo2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { InputCurrency } from "~/components/ui/input-currency";
import { InputPercent } from "~/components/ui/input-percent";
import { cn } from "~/lib/utils";

export const SELECTED_RING = "z-10 ring-1 ring-primary ring-inset";
export const EDITING_RING = "z-10 ring-2 ring-primary ring-inset";

/**
 * The digit a cell's editor was opened with, remembered for that session.
 *
 * `seed` arrives on the render where the parent flips `editing` on and is dropped
 * again as soon as the editor closes, so the two hooks below have to latch which
 * open it belonged to. Both read it once and forget it; a second latch per hook
 * keeps them independent.
 */
function useSeedOnOpen(editing: boolean, seed?: string | null) {
  const openSeed = useRef<string | null>(null);
  const wasEditing = useRef(false);
  if (editing && !wasEditing.current) openSeed.current = seed ?? null;
  wasEditing.current = editing;
  return openSeed;
}

/**
 * Put the caret where the editor opened.
 *
 * Enter, a double-click or a `singleClickEdit` click means "type over this", not
 * "append to it": with the caret parked at the end, replacing a price or a
 * quantity was a Backspace session first. So an ordinary open selects everything.
 *
 * A *seeded* open is the opposite case. The digit that opened the editor is
 * already the cell's value, so selecting it would put the next digit over it —
 * `1` then `2` read `2`, not `12`. The caret goes after the digit instead, where
 * the rest of the number appends.
 *
 * Runs in a *layout* effect so it lands in the same paint as the focus. It must
 * therefore be the last word on the caret: `InputCurrency` parks its own caret at
 * the end while mounting, in a layout effect of its own — children's run first,
 * so this one wins.
 */
export function useSelectAllOnEdit(
  editing: boolean,
  container: RefObject<HTMLElement | null>,
  seed?: string | null,
) {
  const openSeed = useSeedOnOpen(editing, seed);
  useLayoutEffect(() => {
    if (!editing) return;
    const input = container.current?.querySelector("input");
    if (input === null || input === undefined) return;
    if (openSeed.current !== null) {
      const end = input.value.length;
      input.setSelectionRange(end, end);
      return;
    }
    input.select();
  }, [editing, container, openSeed]);
}

/**
 * Commit the digit that opened a cell's editor, as it opens.
 *
 * A typed digit is the cell's new value from that keypress on — not a draft to
 * confirm. Committing it here means the line (and the totals built from it) holds
 * the digit while the rest of the number is being typed, Escape keeps it, and the
 * cell's undo has something to go back to. The effect fires once per open: the
 * latch is spent on the way out.
 */
export function useCommitSeedOnEdit(
  editing: boolean,
  seed: string | null | undefined,
  commit: (raw: string) => void,
) {
  const openSeed = useSeedOnOpen(editing, seed);
  // The callback is an inline arrow at every call site; keep the latest without
  // re-running the effect on each render.
  const latest = useRef(commit);
  latest.current = commit;
  useEffect(() => {
    if (openSeed.current === null) return;
    const digit = openSeed.current;
    openSeed.current = null;
    latest.current(digit);
  }, [editing, openSeed]);
}

/**
 * The digit that opens a numeric cell's editor, or `null` for anything else.
 *
 * Typing a number on a selected cell means "this is the value now": the editor
 * opens with that digit alone (see `useEditorDraft`'s `seed`), so a cashier can
 * overtype a price without Enter, then Backspace, then the number. Only digits
 * seed it — a leading `.` or `-` does not survive the trip through the number the
 * editor is given, so those keys stay inert until the field is open.
 */
export function typedDigit(event: KeyboardEvent<Element>): string | null {
  if (event.ctrlKey || event.metaKey || event.altKey) return null;
  return /^[0-9]$/.test(event.key) ? event.key : null;
}

/**
 * A cell editor's text, seeded by the key that opened it.
 *
 * `seed` is applied on the render where `editing` flips — as a render-phase
 * adjustment, not an effect, so the editor's first paint already holds the digit.
 * (An effect painted the value it replaces for one frame first, which is the flash
 * a seeded edit used to have.) The seed is then dropped immediately: it belongs to
 * the keystroke that opened this editor, so a later echo of the committed value
 * must not bring it back — that is how a seed would turn into a phantom edit one
 * cell later.
 */
export function useEditorDraft(
  editing: boolean,
  value: string,
  seed?: string | null,
): [string, (next: string) => void] {
  const [draft, setDraft] = useState(value);
  const wasEditing = useRef(false);
  // True for the render that opened the editor, so the sync below leaves the seed
  // it already applied alone.
  const opening = useRef(false);
  if (editing !== wasEditing.current) {
    wasEditing.current = editing;
    opening.current = editing;
    if (editing) setDraft(seed ?? value);
  }
  useEffect(() => {
    if (!editing) return;
    if (opening.current) {
      opening.current = false;
      return;
    }
    // The value changed underneath the open editor (an undo, another writer, this
    // cell's own commit): follow it.
    setDraft(value);
  }, [editing, value]);
  return [draft, setDraft];
}

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
  ariaLabel,
  prefix,
  footer,
  onChange,
  onCommit,
  onSelect,
  onStartEdit,
  onEditingDone,
  onEditKeyDown,
  align = "left",
  seed,
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
  /** Accessible name for the cell and its editor, e.g. "Nama baris 2". */
  ariaLabel?: string;
  /** Drawn over the left of the cell (e.g. a key hint), in both modes. */
  prefix?: ReactNode;
  /** Drawn under the value/editor, e.g. an inline validation message. */
  footer?: ReactNode;
  /** Fires on every keystroke, before commit; lets a total update live. */
  onChange?: (raw: string) => void;
  onCommit: (raw: string) => void;
  onSelect: () => void;
  onStartEdit: () => void;
  onEditingDone: () => void;
  /** Intercept an editor key before the Cell's defaults; return true when handled. */
  onEditKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => boolean;
  align?: "left" | "right" | "center";
  /** A digit typed while this cell was selected: the editor opens with it. */
  seed?: string | null;
}) {
  const [draft, setDraft] = useEditorDraft(editing, String(value), seed);
  const cellRef = useRef<HTMLDivElement>(null);
  useSelectAllOnEdit(editing, cellRef, seed);
  useCommitSeedOnEdit(editing, seed, onCommit);
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
      ref={cellRef}
      id={id}
      // The grid's active descendant must point at a role-bearing node, not a
      // bare div: otherwise a screen reader enters an ARIA grid it cannot read.
      role="gridcell"
      aria-label={ariaLabel}
      aria-selected={selected}
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
              aria-label="Batalkan perubahan"
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
              aria-label={ariaLabel}
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
              aria-label={ariaLabel}
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
              aria-label={ariaLabel}
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
      {footer}
    </div>
  );
}
