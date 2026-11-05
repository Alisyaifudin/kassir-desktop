/**
 * The number a pasted string stands for.
 *
 * Two spellings have to land correctly, and they disagree about the separators:
 *
 * - A value copied *out of* this grid travels in English — `cellText` hands out
 *   `String(price)`, so `20000.2`, with a dot as the decimal point and no
 *   grouping. That is what makes a copy readable by a spreadsheet.
 * - A value shown on screen is Indonesian — `Rp20.000,2` — so pasting a display
 *   string (or a number typed in Indonesian elsewhere) has to read dots as
 *   grouping and the comma as the decimal point.
 *
 * Guessing by the shape of the string rather than by where it came from: a lone
 * separator followed by groups of exactly three digits is grouping (`12.500`,
 * `20,000`); anything else is a decimal point (`20000.2`, `10,5`). A string with
 * both separators uses whichever came last as the decimal point, which covers
 * both `1.234,56` and `1,234.56`.
 *
 * Answers `null` when there is no number in the text, so a cell can leave its
 * value alone instead of writing a zero.
 */
export function parseClipboardNumber(text: string): number | null {
  let value = text.trim().replace(/^rp/i, "").replace(/\s+/g, "");
  if (value === "") return null;

  const negative = value.startsWith("-");
  if (negative) value = value.slice(1);

  const dots = (value.match(/\./g) ?? []).length;
  const commas = (value.match(/,/g) ?? []).length;
  if (dots + commas === 0) {
    if (!/^\d+$/.test(value)) return null;
    return finish(value, negative);
  }

  let normalized: string;
  if (dots > 0 && commas > 0) {
    // The later separator is the decimal point; the other one groups.
    const decimal = value.lastIndexOf(".") > value.lastIndexOf(",") ? "." : ",";
    normalized = withDecimal(value, decimal);
  } else if (dots > 0) {
    normalized = looksGrouped(value, ".") ? value.replace(/\./g, "") : withDecimal(value, ".");
  } else {
    normalized = looksGrouped(value, ",") ? value.replace(/,/g, "") : withDecimal(value, ",");
  }

  // Anything that was not a digit or a separator means this is not a number
  // (`12 pcs`, a name): leave the cell alone.
  if (!/^\d*\.?\d*$/.test(normalized)) return null;
  if (!/\d/.test(normalized)) return null;
  return finish(normalized, negative);
}

/** `1.234.567` or `1,234,567`: groups of three after a short leading group. */
function looksGrouped(value: string, separator: "." | ","): boolean {
  const escaped = separator === "." ? "\\." : ",";
  return new RegExp(`^\\d{1,3}(?:${escaped}\\d{3})+$`).test(value);
}

/** Keep the last `separator` as the decimal point and drop every other one. */
function withDecimal(value: string, separator: "." | ","): string {
  const last = value.lastIndexOf(separator);
  const whole = value.slice(0, last).replace(/[.,]/g, "");
  const fraction = value.slice(last + 1).replace(/[.,]/g, "");
  return `${whole}.${fraction}`;
}

function finish(normalized: string, negative: boolean): number | null {
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return null;
  return negative ? -parsed : parsed;
}
