/** Money as the app writes it: rupiah mark, Indonesian grouping, no invented decimals. */
export function formatMoney(value: number): string {
  return `Rp ${value.toLocaleString("id-ID")}`;
}

/**
 * A destination that remembers Beranda, so the screen it opens can send the
 * operator back here. Same `url_back` contract every nav link in the app uses.
 */
export function withUrlBack(path: string, from = "/"): string {
  return `${path}?url_back=${encodeURIComponent(from)}`;
}
