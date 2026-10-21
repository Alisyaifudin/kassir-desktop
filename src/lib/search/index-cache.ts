import { compact, norm } from "./normalize";
import type { TextOptions } from "./quality";

/**
 * The machinery every fuzzy index under `src/lib/search` shares: the score
 * scale, the query ladder that turns one typed string into thresholds, the
 * signature-gated cache, and the score→hit plumbing.
 *
 * This used to be copy-pasted per unit (product, listing, and a third copy for
 * stock lots that nothing imported), which meant a change to the ladder had to
 * land three times and a "the same query behaves the same everywhere" comment
 * was maintained by hand. Only the *field weights* and the entry shape are
 * genuinely per unit now, because those are what differ between a listing, a
 * product and a lot.
 */

export const SCALE = 9999;

export type Hit = { id: string; score: number };

/** One typed query, already parsed into everything the graders need. */
export type Query = {
  raw: string;
  norm: string;
  words: string[];
  /** Letters and digits only, for code matching. */
  code: string;
  options: TextOptions;
  /** Below this a match is noise. A one- or two-character query has to be exact. */
  minimum: number;
};

/** `null` for an empty query, which matches nothing by definition. */
export function parseQuery(rawQuery: string): Query | null {
  const query = norm(rawQuery);
  if (query === "") return null;
  const code = compact(rawQuery);
  const length = code.length;
  return {
    raw: rawQuery,
    norm: query,
    words: query.split(" "),
    code,
    options: { tokenPrefix: length >= 2, weak: length >= 3 },
    minimum: length <= 1 ? 7000 : length === 2 ? 5000 : 1500,
  };
}

export type Index<Entry> = { signature: string; entries: Entry[] };

/**
 * An index keyed by a *text signature* rather than by array identity: the
 * product/listing streams re-emit a fresh array on every hydrate (including
 * stock and price changes), so the array is not a useful cache key. Editing a
 * name, code or alias changes the signature and rebuilds; a sale does not.
 */
export function createIndexCache<Item, Entry>(
  signatureOf: (items: Item[]) => string,
  toEntry: (item: Item) => Entry,
) {
  let cache: Index<Entry> | null = null;
  let signatures = new WeakMap<Item[], string>();

  function signature(items: Item[]): string {
    const cached = signatures.get(items);
    if (cached !== undefined) return cached;
    const next = signatureOf(items);
    signatures.set(items, next);
    return next;
  }

  function build(items: Item[]): Index<Entry> {
    return { signature: signature(items), entries: items.map(toEntry) };
  }

  function get(items: Item[]): Index<Entry> {
    const current = signature(items);
    if (cache !== null && cache.signature === current) return cache;
    cache = build(items);
    return cache;
  }

  function reset(): void {
    cache = null;
    signatures = new WeakMap();
  }

  return { build, get, reset };
}

/** `null` when the match is too weak to show for what was typed. */
export function toHit(id: string, best: number, query: Query): Hit | null {
  if (best <= 0) return null;
  const score = Math.round(SCALE * best);
  return score >= query.minimum ? { id, score } : null;
}

/** Highest score first; `Array#sort` is stable, so ties keep index order. */
export function sortHits(hits: Hit[]): Hit[] {
  return hits.sort((a, b) => b.score - a.score);
}
