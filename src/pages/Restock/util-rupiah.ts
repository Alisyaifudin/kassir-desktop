/**
 * Rupiah formatting, the one number-to-text rule the restock screen needs.
 * Kept out of the mock file so it survives the scaffolding.
 */
export function rupiah(value: number, fix = 0): string {
  return `Rp${Number(value.toFixed(fix)).toLocaleString("id-ID")}`;
}
