/** Money as the app writes it: rupiah mark, Indonesian grouping, no invented decimals. */
export function formatMoney(value: number): string {
  return `Rp ${value.toLocaleString("id-ID")}`;
}
