import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentProps,
  type KeyboardEvent,
} from "react";
import { cn } from "~/lib/utils";

const PREFIX = "Rp";

/**
 * The amount as raw text: digits with at most one decimal comma and no grouping
 * (`68000` or `68000,5`). `.` is dropped because it is the grouping mark on
 * screen; the separator is always normalized to `,`.
 */
function canonicalize(display: string): string {
  const cleaned = display.replace(PREFIX, "").replace(/\./g, "").replace(/[^\d,]/g, "");
  const [whole = "", ...rest] = cleaned.split(",");
  const trimmed = whole.replace(/^0+(?=\d)/, "");
  return rest.length === 0 ? trimmed : `${trimmed},${rest.join("")}`;
}

/** A number as raw text; a JS number's `.` is the decimal point. */
function toRaw(value: number): string {
  return String(value).replace(".", ",");
}

function toNumber(raw: string): number {
  return raw === "" ? 0 : Number(raw.replace(",", "."));
}

/** `Rp`, the integer grouped with dots, then an optional `,` and its decimals. */
function format(raw: string): string {
  const [whole = "", decimals] = raw.split(",");
  const grouped = (whole === "" ? "0" : whole).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return decimals === undefined ? `Rp${grouped}` : `Rp${grouped},${decimals}`;
}

/** How many raw characters sit before the display caret. */
function rawIndexAt(display: string, caret: number): number {
  return display.slice(0, caret).replace(PREFIX, "").replace(/\./g, "").length;
}

/**
 * Where the caret goes for raw index `index`. A separator is never sat in front
 * of, so a boundary that falls on one moves to just after it: `1|.000` is not a
 * caret position, `1.|000` is.
 */
function displayIndexAt(display: string, index: number): number {
  let seen = 0;
  let pos = display.length;
  for (let i = PREFIX.length; i < display.length; i++) {
    if (seen === index) {
      pos = i;
      break;
    }
    if (display[i] === ".") continue;
    seen++;
  }
  return display[pos] === "." ? pos + 1 : pos;
}

/**
 * A plain `input` that shows and edits a rupiah amount. Thousands are dotted as
 * they are typed; `.` and `,` both begin the decimals, are shown as `,`, and a
 * second separator is refused.
 *
 * The caret is tracked by digit, not by display column, so it steps over the
 * separators: Left from `10.|000` lands on `1|0.000`, and Backspace there
 * removes the digit (`1.|000`), not the dot.
 *
 * Unstyled — the caller supplies the look, as the listing cells do.
 */
export function InputCurrency({
  value,
  onValueChange,
  className,
  onKeyDown,
  ...props
}: Omit<ComponentProps<"input">, "value" | "onChange"> & {
  value: number;
  onValueChange: (value: number) => void;
}) {
  const [raw, setRaw] = useState(() => toRaw(value));
  const inputRef = useRef<HTMLInputElement>(null);
  const caret = useRef(raw.length);
  const emitted = useRef(value);

  useLayoutEffect(() => {
    const el = inputRef.current;
    if (el === null) return;
    const pos = displayIndexAt(format(raw), Math.min(caret.current, raw.length));
    el.setSelectionRange(pos, pos);
  }, [raw]);

  // External writes (undo, a reload) reset the field; our own echo does not, so
  // a trailing comma survives the round trip through the number.
  useEffect(() => {
    if (value !== emitted.current) {
      const next = toRaw(value);
      setRaw(next);
      caret.current = next.length;
      emitted.current = value;
    }
  }, [value]);

  function apply(next: string, index: number) {
    caret.current = Math.max(0, Math.min(index, next.length));
    setRaw(next);
    const parsed = toNumber(next);
    emitted.current = parsed;
    onValueChange(parsed);
  }

  /** Move the caret without editing (arrows); no render, so place it directly. */
  function place(index: number) {
    caret.current = Math.max(0, Math.min(index, raw.length));
    const el = inputRef.current;
    if (el === null) return;
    const pos = displayIndexAt(format(raw), caret.current);
    el.setSelectionRange(pos, pos);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    const el = event.currentTarget;
    const index = rawIndexAt(format(raw), el.selectionStart ?? raw.length);

    switch (event.key) {
      case "ArrowLeft":
        event.preventDefault();
        place(index - 1);
        return;
      case "ArrowRight":
        event.preventDefault();
        place(index + 1);
        return;
      case "Backspace":
        event.preventDefault();
        if (index > 0) apply(raw.slice(0, index - 1) + raw.slice(index), index - 1);
        return;
      case "Delete":
        event.preventDefault();
        if (index < raw.length) apply(raw.slice(0, index) + raw.slice(index + 1), index);
        return;
      case "Home":
        event.preventDefault();
        place(0);
        return;
      case "End":
        event.preventDefault();
        place(raw.length);
        return;
      case ".":
      case ",":
        event.preventDefault();
        if (!raw.includes(",")) {
          const next = raw === "" ? "0," : raw.slice(0, index) + "," + raw.slice(index);
          apply(next, index + 1);
        }
        return;
    }
  }

  return (
    <input
      {...props}
      ref={inputRef}
      inputMode="decimal"
      value={format(raw)}
      className={cn("w-full min-w-0 border-0 outline-none", className)}
      onChange={(event) => {
        const el = event.currentTarget;
        const display = el.value;
        const displayCaret = el.selectionStart ?? display.length;
        apply(canonicalize(display), rawIndexAt(display, displayCaret));
      }}
      onKeyDown={handleKeyDown}
    />
  );
}
