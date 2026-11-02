import { compact, norm } from "./normalize";
import { matchPosition, type TextOptions } from "./quality";

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

const SCALE = 9999;

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

/**
 * One entry's winning field: its score plus the signals that break its ties.
 *
 * The shipped ladder has only six tier constants across four field weights, so at
 * most 24 distinct scores exist in a whole catalogue and every same-tier match is
 * *exactly* tied — `Aqua 600ml` (320 sold) and `Aqua Galon` (35 sold) are
 * indistinguishable to `score` alone. The two signals here are what separate them.
 */
export type Ranked = {
  id: string;
  /** `quality × field weight`, before the 0..9999 scale and the query floor. */
  score: number;
  /** Word index of the earliest query hit in the winning field; `Infinity` if none. */
  position: number;
  /** `|query| / |winning field|`, clamped: 1 means the query is the whole field. */
  tightness: number;
};

/** Clamped `query / field` length ratio, the same shape `gradeCode` already uses. */
function tightness(queryLength: number, fieldLength: number): number {
  if (fieldLength === 0) return 0;
  return Math.min(1, queryLength / fieldLength);
}

/**
 * Accumulates the best-scoring field of one entry, together with the tie-break
 * signals that field earned.
 *
 * Keeping this here rather than in each index is the point: position and
 * tightness must mean the same thing for a listing, a product and an alias, and
 * the last time the scoring loop was copy-pasted per unit it drifted three ways.
 */
export type Matcher = {
  /** Offer a text field for a given `quality` under `weight`. */
  offerText(quality: number, weight: number, fieldNorm: string, fieldWords: string[]): void;
  /** Offer a compacted identifier (a barcode or an SKU). */
  offerCode(quality: number, weight: number, code: string): void;
  /** The winning field, or `null` when nothing matched. */
  result(): Ranked | null;
};

export function createMatcher(id: string, query: Query): Matcher {
  let best: Ranked | null = null;

  function consider(candidate: Ranked): void {
    if (best === null || candidate.score > best.score) best = candidate;
  }

  return {
    offerText(quality, weight, fieldNorm, fieldWords) {
      if (quality <= 0) return;
      consider({
        id,
        score: quality * weight,
        position: matchPosition(fieldWords, query.words),
        tightness: tightness(query.norm.length, fieldNorm.length),
      });
    },
    offerCode(quality, weight, code) {
      if (quality <= 0) return;
      consider({
        id,
        score: quality * weight,
        // A code has no words to count: an exact scan is position 0, a prefix or
        // an inner fragment is position 1. A scanned barcode must never be
        // reordered by a name that happens to start with the digits typed.
        position: quality === 1 ? 0 : 1,
        tightness: tightness(query.code.length, code.length),
      });
    },
    result: () => best,
  };
}

/**
 * Scores to hits, weakest dropped, highest first.
 *
 * Ties are the whole reason this is not a one-line sort. The score decides
 * whenever scores differ, so a tie-break can never reorder a strictly better tier
 * below a worse one: it only ever separates entries the ladder called equal.
 * Position first (the name that *starts* with what was typed beats one that
 * contains it later), then tightness (the shorter name wins, because the
 * distinguishing token is the one the cashier did not need to type). Remaining
 * ties keep index order, which `Array#sort` guarantees by being stable.
 */
export function rankHits(rows: Ranked[], query: Query): Hit[] {
  const hits: Array<Hit & { position: number; tightness: number }> = [];

  for (const row of rows) {
    const hit = toHit(row.id, row.score, query);
    if (hit === null) continue;
    hits.push({ ...hit, position: row.position, tightness: row.tightness });
  }

  hits.sort((left, right) => {
    if (left.score !== right.score) return right.score - left.score;
    if (left.position !== right.position) return left.position - right.position;
    if (left.tightness !== right.tightness) return right.tightness - left.tightness;
    return 0;
  });

  return hits.map((hit) => ({ id: hit.id, score: hit.score }));
}
