import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useDebounce } from "use-debounce";
import { CheckIcon, ChevronDownIcon } from "lucide-react";
import { cn } from "~/lib/utils";
import { SEARCH_DELAY } from "~/lib/constants";
import { Input } from "./input";
import { Popover, PopoverAnchor, PopoverContent } from "./popover";

export type ComboboxOption = {
  /** Stored value. */
  value: string;
  /** Display text shown in the field and the list; falls back to `value`. */
  label?: string;
};

function labelFor(value: string, options: readonly ComboboxOption[]): string {
  return options.find((option) => option.value === value)?.label ?? value;
}

/**
 * Text input with a filterable suggestion list, showing each option's `label`
 * while storing its `value` (like a select that also accepts free text).
 *
 * Typing works against both: a keystroke that exactly matches a label or value
 * resolves to that option's value, anything else is kept as typed — so custom
 * entries (`karton`) still survive. Selecting (and blurring) normalizes the
 * field back to the canonical label.
 *
 * The list is a real listbox: the input keeps focus and drives it with
 * `aria-activedescendant`, arrow keys, and Enter. The highlight starts empty, so
 * Enter submits the surrounding form until an arrow key arms a row — the same
 * rule the Shop search overlay uses.
 */
export function Combobox({
  value,
  onValueChange,
  options,
  placeholder,
  disabled,
  emptyText = "Tidak ada pilihan",
  className,
  "aria-label": ariaLabel,
  id,
}: {
  value: string;
  onValueChange: (value: string) => void;
  options: readonly ComboboxOption[];
  placeholder?: string;
  disabled?: boolean;
  emptyText?: string;
  className?: string;
  "aria-label"?: string;
  id?: string;
}) {
  const [text, setText] = useState(() => labelFor(value, options));
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  // Both spellings resolve to the stored value, so typing "Ecer" or "retail"
  // agrees on `retail`.
  const valuesByNeedle = useMemo(() => {
    const map = new Map<string, string>();
    for (const option of options) {
      map.set(option.value.toLowerCase(), option.value);
      if (option.label) map.set(option.label.toLowerCase(), option.value);
    }
    return map;
  }, [options]);

  // Keep the field in step with external writes (form reset, draft reload).
  // `setText` bails out when unchanged, so an unstable `options` identity is safe.
  useEffect(() => {
    setText(labelFor(value, options));
  }, [value, options]);

  // The list narrows on the settled text, not on every keystroke: with a catalog
  // of every customer or product name, filtering and re-rendering the whole
  // listbox between keys is what made the field itself feel slow.
  const [query] = useDebounce(text.trim().toLowerCase(), SEARCH_DELAY);
  // An exact hit means the field already reads as a chosen value — show the full
  // list again rather than a single self-match.
  const browsing = query === "" || valuesByNeedle.has(query);

  const filtered = useMemo(() => {
    if (browsing) return options;
    return options.filter(
      (option) =>
        option.value.toLowerCase().includes(query) ||
        (option.label ?? "").toLowerCase().includes(query),
    );
  }, [options, query, browsing]);

  // A new query or a fresh open re-arms against nothing.
  useEffect(() => {
    setActive(null);
  }, [query, open]);

  // Keep the highlighted row inside the scroll viewport.
  useEffect(() => {
    if (!open || active === null) return;
    document.getElementById(`${listId}-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [active, open, listId]);

  function select(option: ComboboxOption) {
    setText(option.label ?? option.value);
    onValueChange(option.value);
    setOpen(false);
    inputRef.current?.focus();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    const last = filtered.length - 1;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        setActive(filtered.length === 0 ? null : event.key === "ArrowDown" ? 0 : last);
        return;
      }
      if (filtered.length === 0) return;
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((current) =>
        current === null ? (step === 1 ? 0 : last) : (current + step + filtered.length) % filtered.length,
      );
      return;
    }
    if (event.key === "Enter" && open && active !== null && filtered[active] !== undefined) {
      event.preventDefault();
      select(filtered[active]);
      return;
    }
    if (event.key === "Escape" && open) {
      event.preventDefault();
      setOpen(false);
    }
  }

  const activeOption = open && active !== null ? filtered[active] : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div ref={rootRef} className={cn("relative", className)}>
          <Input
            ref={inputRef}
            id={id}
            role="combobox"
            aria-label={ariaLabel}
            aria-expanded={open}
            aria-controls={open ? listId : undefined}
            aria-autocomplete="list"
            aria-activedescendant={
              activeOption === undefined ? undefined : `${listId}-${active}`
            }
            autoComplete="off"
            spellCheck={false}
            value={text}
            disabled={disabled}
            placeholder={placeholder}
            onChange={(event) => {
              const next = event.currentTarget.value;
              setText(next);
              onValueChange(valuesByNeedle.get(next.trim().toLowerCase()) ?? next);
              setOpen(true);
            }}
            onBlur={() => setText(labelFor(value, options))}
            onKeyDown={handleKeyDown}
            className="pr-9"
          />
          <button
            type="button"
            tabIndex={-1}
            disabled={disabled}
            aria-label="Tampilkan pilihan"
            onClick={() => {
              setOpen((current) => !current);
              inputRef.current?.focus();
            }}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
          >
            <ChevronDownIcon
              className={cn("size-4 opacity-50 transition-transform", open && "rotate-180")}
            />
          </button>
        </div>
      </PopoverAnchor>

      <PopoverContent
        align="start"
        sideOffset={4}
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
        // The anchor is not a PopoverTrigger, so Radix would dismiss on a click
        // inside the field itself. Keep it open; the chevron owns toggling.
        onPointerDownOutside={(event) => {
          if (rootRef.current?.contains(event.target as Node)) event.preventDefault();
        }}
        className="w-[var(--radix-popover-trigger-width)] min-w-0 overflow-hidden p-1"
      >
        {filtered.length === 0 ? (
          <p className="px-2 py-2 text-sm text-muted-foreground">{emptyText}</p>
        ) : (
          <ul id={listId} role="listbox" aria-label={ariaLabel} className="max-h-72 overflow-y-auto">
            {filtered.map((option, index) => {
              const selected = option.value === value;
              return (
                <li
                  key={option.value}
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={selected}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => select(option)}
                  className={cn(
                    "flex cursor-pointer items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-base transition-colors",
                    index === active ? "bg-accent text-accent-foreground" : "hover:bg-accent/50",
                  )}
                >
                  <span className="truncate">{option.label ?? option.value}</span>
                  {selected ? <CheckIcon className="size-4 shrink-0" /> : null}
                </li>
              );
            })}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
