/**
 * A line's discount stack on the clipboard.
 *
 * A discount is a `[{ value, kind }, …]` stack, not one number, so it cannot
 * travel as a bare cell value. The plain JSON the operator would guess is enough
 * to read it back, but a paste has to know *what* it is reading: `[` is also how
 * a half-typed name can start. So the JSON goes behind a versioned prefix and a
 * paste only treats the clipboard as a discount when that prefix is there.
 *
 * The derived fields (`eff`, `total`) are dropped on the way out: they are
 * re-derived against the target line's own price and quantity, which is what
 * makes a `10%` copied from one line mean `10%` of the line it is pasted onto.
 * Empty rows (the trailing blank the dialog always keeps) go too.
 */

/** `pcs`/`percent`/`number` are the dialog's kinds; see `DiscountKind`. */
export type CopiedDiscount = { value: number; kind: "number" | "percent" | "pcs" };

export const DISCOUNT_CLIPBOARD_PREFIX = "kassir.diskon:1:";

const KINDS: readonly CopiedDiscount["kind"][] = ["number", "percent", "pcs"];

/** The clipboard text for a line's discount stack. */
export function serializeDiscounts(
  discounts: readonly ({
    value: number;
    kind: CopiedDiscount["kind"];
    [derived: string]: unknown;
  })[],
): string {
  const rows: CopiedDiscount[] = discounts
    .filter((discount) => Number.isFinite(discount.value) && discount.value !== 0)
    .map((discount) => ({ value: discount.value, kind: discount.kind }));
  return `${DISCOUNT_CLIPBOARD_PREFIX}${JSON.stringify(rows)}`;
}

/**
 * The stack a clipboard text carries, or `null` when it is not a discount at
 * all (the prefix is missing, the JSON is broken, or a row is not a number of a
 * known kind). A caller can then leave the cell untouched instead of writing a
 * half-read stack.
 */
export function parseDiscounts(text: string): CopiedDiscount[] | null {
  const trimmed = text.trim();
  if (!trimmed.startsWith(DISCOUNT_CLIPBOARD_PREFIX)) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed.slice(DISCOUNT_CLIPBOARD_PREFIX.length));
  } catch {
    return null;
  }
  if (!Array.isArray(parsed)) return null;

  const rows: CopiedDiscount[] = [];
  for (const item of parsed) {
    if (typeof item !== "object" || item === null) return null;
    const { value, kind } = item as { value?: unknown; kind?: unknown };
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return null;
    if (typeof kind !== "string" || !KINDS.includes(kind as CopiedDiscount["kind"])) return null;
    rows.push({ value, kind: kind as CopiedDiscount["kind"] });
  }
  return rows;
}
