import Decimal from "decimal.js";
import type { MoneyEntry } from "~/services/money";

/** An entry with the movement it represents: `value` minus the entry before it. */
export type MoneyRow = MoneyEntry & { diff: number };

/**
 * Adds each entry's diff. `entries` arrive newest first, so an entry is measured
 * against the one below it; the oldest has no entry below it and is measured
 * against `previous` — the balance in force *before* the range began, which the
 * caller reads from the service. `value` is decimal arithmetic, not float
 * subtraction: a `change` pocket's running balance drifts by a fraction of a
 * rupiah per entry otherwise.
 */
export function withDiff(entries: readonly MoneyEntry[], previous: number): MoneyRow[] {
  return entries.map((entry, index) => {
    const older = index + 1 < entries.length ? entries[index + 1].value : previous;
    return { ...entry, diff: new Decimal(entry.value).minus(older).toNumber() };
  });
}
