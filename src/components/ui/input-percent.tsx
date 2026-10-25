import { useEffect, useRef, useState, type ComponentProps } from "react";
import { cn } from "~/lib/utils";

/** Digits, at most one decimal comma, and an optional leading minus. */
function canonicalize(raw: string, allowNegative: boolean): string {
  const negative = allowNegative && raw.trimStart().startsWith("-");
  // `.` is the decimal key here too: there is no grouping, so normalize it to `,`.
  const cleaned = raw.replace(/\./g, ",").replace(/[^\d,]/g, "");
  const [whole = "", ...rest] = cleaned.split(",");
  const trimmed = whole.replace(/^0+(?=\d)/, "");
  const body = rest.length === 0 ? trimmed : `${trimmed},${rest.join("")}`;
  if (!negative) return body;
  // A lone minus is a valid in-progress value: the digits come after it.
  return body === "" ? "-" : `-${body}`;
}

function toNumber(raw: string): number {
  if (raw === "" || raw === "-") return 0;
  const parsed = Number(raw.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function fromNumber(value: number): string {
  return value === 0 ? "" : String(value).replace(".", ",");
}

/**
 * A plain `input` for a percentage: the number plus a fixed `%` suffix, `.` and
 * `,` both shown as `,`, and the value clamped to `[min, max]`.
 *
 * Unstyled — the caller supplies the look.
 */
export function InputPercent({
  value,
  onValueChange,
  min = -100,
  max = 100,
  className,
  ...props
}: Omit<ComponentProps<"input">, "value" | "onChange"> & {
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
}) {
  const [raw, setRaw] = useState(() => fromNumber(value));
  const emitted = useRef(value);

  useEffect(() => {
    if (value !== emitted.current) {
      setRaw(fromNumber(value));
      emitted.current = value;
    }
  }, [value]);

  function commit(next: string) {
    const parsed = toNumber(next);
    const clamped = Math.min(Math.max(parsed, min), max);
    // Keep the field as typed unless the value was clamped, so clearing it stays
    // blank instead of snapping back to `0`.
    setRaw(clamped === parsed ? next : fromNumber(clamped));
    emitted.current = clamped;
    onValueChange(clamped);
  }

  return (
    <div className="flex w-full min-w-0 items-baseline gap-0.5">
      <input
        // See `input.tsx`: Edge's WebView2 suggests as you type, and a textbox
        // declaring `aria-autocomplete` is left alone.
        aria-autocomplete="list"
        {...props}
        inputMode="decimal"
        value={raw}
        className={cn("w-full min-w-0 border-0 bg-transparent p-0 outline-none", className)}
        onChange={(event) => commit(canonicalize(event.currentTarget.value, min < 0))}
      />
      <span className="shrink-0 text-muted-foreground select-none">%</span>
    </div>
  );
}
