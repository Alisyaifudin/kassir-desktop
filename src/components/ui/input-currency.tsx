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
 * The amount as raw text: an optional leading minus, digits with at most one
 * decimal comma and no grouping (`68000` or `68000,5`). `.` is dropped because
 * it is the grouping mark on screen; the separator is always normalized to `,`.
 */
function canonicalize(display: string, allowNegative: boolean): string {
  const negative = allowNegative && display.trimStart().startsWith("-");
  const cleaned = display.replace(PREFIX, "").replace(/\./g, "").replace(/[^\d,]/g, "");
  const [whole = "", ...rest] = cleaned.split(",");
  const trimmed = whole.replace(/^0+(?=\d)/, "");
  const body = rest.length === 0 ? trimmed : `${trimmed},${rest.join("")}`;
  if (!negative) return body;
  // A lone minus is a valid in-progress value: the digits come after it.
  return body === "" ? "-" : `-${body}`;
}

/** A number as raw text; zero is blank, and a JS number's `.` is the decimal point. */
function toRaw(value: number): string {
  return value === 0 ? "" : String(value).replace(".", ",");
}

function toNumber(raw: string): number {
  if (raw === "" || raw === "-") return 0;
  return Number(raw.replace(",", "."));
}

/** `-`, then `Rp`, the integer grouped with dots, then `,` and its decimals. */
function format(raw: string): string {
  // Empty, or a sign still waiting for its digits, stays as typed.
  if (raw === "" || raw === "-") return raw;
  const negative = raw.startsWith("-");
  const [whole = "", decimals] = (negative ? raw.slice(1) : raw).split(",");
  const grouped = (whole === "" ? "0" : whole).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const body = decimals === undefined ? `${PREFIX}${grouped}` : `${PREFIX}${grouped},${decimals}`;
  return negative ? `-${body}` : body;
}

/** How many raw characters sit before the display caret. */
function rawIndexAt(display: string, caret: number): number {
  return display.slice(0, caret).replace(PREFIX, "").replace(/\./g, "").length;
}

/**
 * Where the caret goes for raw index `index`, counting the raw characters
 * (`-`, digits, `,`) and stepping over the `Rp` prefix and the grouping dots.
 */
function displayIndexAt(display: string, index: number): number {
  let seen = 0;
  let pos = display.length;
  for (let i = 0; i < display.length; i++) {
    const ch = display[i];
    if (ch === "." || ch === "R" || ch === "p") continue;
    if (seen === index) {
      pos = i;
      break;
    }
    seen++;
  }
  return display[pos] === "." ? pos + 1 : pos;
}

/**
 * A plain `input` that shows and edits a rupiah amount. Thousands are dotted as
 * they are typed; `.` and `,` both begin the decimals, are shown as `,`, and a
 * second separator is refused. A leading minus is kept only when the caller
 * allows it.
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
  allowNegative = false,
  ...props
}: Omit<ComponentProps<"input">, "value" | "onChange"> & {
  value: number;
  onValueChange: (value: number) => void;
  allowNegative?: boolean;
}) {
  const [raw, setRaw] = useState(() => toRaw(value));
  const inputRef = useRef<HTMLInputElement>(null);
  const caret = useRef(raw.length);
  const emitted = useRef(value);

  useLayoutEffect(() => {
    const el = inputRef.current;
    if (el === null) return;
    const display = format(raw);
    // At the end, always land past the field — the placeholder `0` shown for an
    // empty or sign-only value is not a raw character.
    const pos =
      caret.current >= raw.length ? display.length : displayIndexAt(display, caret.current);
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
    const display = format(raw);
    const pos =
      caret.current >= raw.length ? display.length : displayIndexAt(display, caret.current);
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
          // An empty or sign-only field gets its leading zero first.
          const base = raw === "-" || raw === "" ? `${raw}0` : raw;
          const at = raw === "-" || raw === "" ? base.length : index;
          apply(`${base.slice(0, at)},${base.slice(at)}`, at + 1);
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
        apply(canonicalize(display, allowNegative), rawIndexAt(display, displayCaret));
      }}
      onKeyDown={handleKeyDown}
    />
  );
}
