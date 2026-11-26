/** One row of a list, as a remembered position sees it: its identity and the value it is ordered by. */
export type AnchorRow = { id: string; value: number };

/**
 * The row whose value is closest to `saved` — where a list goes when the row that
 * was on screen whole is no longer there (a filter narrowed the list, the day's
 * records changed, the record was deleted).
 *
 * The list is already in the order the value names, so the closest value is the
 * closest row; walking the array is exact for both directions and needs no sorted
 * assumption beyond the values being comparable. The **first** of two equal rows
 * wins, so a list that has not changed since the position was stored lands on the
 * row it was stored from instead of drifting one record per visit.
 *
 * `rows` must not be empty — the caller has a list or has nothing to put back.
 */
export function nearestRow(rows: readonly AnchorRow[], saved: number): number {
  let best = 0;
  let distance = Number.POSITIVE_INFINITY;
  for (let index = 0; index < rows.length; index += 1) {
    const next = Math.abs(rows[index].value - saved);
    if (next < distance) {
      best = index;
      distance = next;
    }
  }
  return best;
}
