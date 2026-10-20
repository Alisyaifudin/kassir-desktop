import Decimal from "decimal.js";

/**
 * Rupiah formatting, the one number-to-text rule the restock screen needs.
 *
 * The value is rounded in decimal arithmetic before it is shown, so a float sum
 * can never leak a stray cent into the display.
 */
export function rupiah(value: number | Decimal, fix = 0): string {
  return `Rp${Number(new Decimal(value).toFixed(fix)).toLocaleString("id-ID")}`;
}
