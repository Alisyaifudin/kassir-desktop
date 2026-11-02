/**
 * Ranking experiments over the *shipped* scoring path.
 *
 * There is exactly one place that decides whether an entry matches and what it
 * scores — `scoreListings` in `../listings`, which `searchListings` itself calls.
 * Every ranker here consumes that same `Ranked[]` and only differs in how it
 * orders the rows. So a candidate can never quietly win by changing *which*
 * listings match: `eval.test.ts` asserts every non-expanding ranker returns the
 * shipped id set for every query.
 *
 * ## The defect the tie-breaks were built for
 *
 * Typing `roll` ranked `Barenbliss Roll To Clean Mascara` above `Roll Rambut
 * Besar`, and typing `ha` ranked `2IN1 Volume HairPin` above `Hanasui`. Three
 * separate reasons, all landing on the same tie:
 *
 * 1. `TEXT.tokenSet` is `queryWords.every((word) => fieldWords.includes(word))` —
 *    an *unordered set* test, so `roll` as word 0 and `roll` as word 1 are the
 *    identical value. **The ladder never records where the match was.**
 * 2. `TEXT.prefix` (0.8) grades *below* `tokenSet` (0.86) and is tested after it,
 *    so `hasBoundaryMatch` is unreachable for any single-word query already present
 *    as a whole token: "starts with" cannot outrank "appears somewhere".
 * 3. `hasBoundaryMatch` accepts *any* word boundary, so `ha` at index 12 ("h‑airpin")
 *    equals `ha` at index 0 ("Hanasui").
 *
 * Six tier constants × four field weights = at most 24 distinct scores in a whole
 * catalogue, so all three collapses are exact ties resolved by array order.
 *
 * ## Why tie-breaks and not a bonus
 *
 * A `head` tier ("the name starts with the query") does not fit. Weights span
 * 0.88–0.92 while the smallest tier gap is `tokenSet - prefix = 0.06`, so with any
 * in-tier bonus budget `B`:
 *
 *     head <= (1.0 * 0.88 - B) / 0.92 = 0.9130   (must not beat an exact match)
 *     head >= (0.86 * 0.92 + B) / 0.88 = 0.9445  (must beat every tokenSet match)
 *
 * No value satisfies both, and additive bonuses can lift a `tokenPrefix` above a
 * `prefix` across field weights — silently inverting a ladder the product agreed
 * on. So the signals in the shipped `rankHits` are strictly lexicographic
 * tie-breaks on the rounded score, and `TieBreaks` below re-runs that comparison
 * with individual signals switched off to attribute the wins.
 */
import { TEXT } from "../quality";
import { buildListingIndex, scoreListings, searchListings } from "../listings";
import { parseQuery, toHit, type Query, type Ranked } from "../index-cache";
import type { CatalogueItem, Ranker } from "./types";

/** Which tie-breaks a candidate switches on, applied in this order. */
export type TieBreaks = {
  position: boolean;
  tightness: boolean;
  popularity: boolean;
  /**
   * Promote "the name starts with the query" *above* the tier ladder rather than
   * only breaking ties. This is the literal reading of "always prefer items whose
   * name starts with the query", kept as a measured alternative: it is safe for
   * exact matches (a field equal to the query starts at word 0, and an exact code
   * is pinned to position 0), so only prefix-class matches trade places.
   */
  positionPrimary: boolean;
};

const NONE: TieBreaks = {
  position: false,
  tightness: false,
  popularity: false,
  positionPrimary: false,
};

/** The wired ranking: position, then tightness — what `searchListings` now does. */
export const SHIPPED_BREAKS: TieBreaks = {
  position: true,
  tightness: true,
  popularity: false,
  positionPrimary: false,
};

type ListingIndex = ReturnType<typeof buildListingIndex>;

/**
 * Built once per catalogue array. The app re-emits a fresh array on every hydrate,
 * and re-normalising 52 names per candidate per query would measure the harness.
 */
const indexes = new WeakMap<CatalogueItem[], ListingIndex>();

function indexFor(items: CatalogueItem[]): ListingIndex {
  const cached = indexes.get(items);
  if (cached !== undefined) return cached;
  const built = buildListingIndex(items);
  indexes.set(items, built);
  return built;
}

type Row = { id: string; score: number; ranked: Ranked; sold: number };

/** Rows that clear the query's floor, with the shelf data the tie-breaks read. */
function toRows(rows: Ranked[], items: CatalogueItem[], query: Query): Row[] {
  const sold = new Map(items.map((item) => [item.id, item.sold]));
  const out: Row[] = [];
  for (const row of rows) {
    const hit = toHit(row.id, row.score, query);
    if (hit === null) continue;
    out.push({ id: row.id, score: hit.score, ranked: row, sold: sold.get(row.id) ?? 0 });
  }
  return out;
}

function compare(breaks: TieBreaks) {
  return (left: Row, right: Row): number => {
    if (breaks.positionPrimary) {
      const leftLeads = left.ranked.position === 0 ? 0 : 1;
      const rightLeads = right.ranked.position === 0 ? 0 : 1;
      if (leftLeads !== rightLeads) return leftLeads - rightLeads;
    }
    if (left.score !== right.score) return right.score - left.score;
    if (breaks.position && left.ranked.position !== right.ranked.position) {
      return left.ranked.position - right.ranked.position;
    }
    if (breaks.tightness && left.ranked.tightness !== right.ranked.tightness) {
      return right.ranked.tightness - left.ranked.tightness;
    }
    if (breaks.popularity && left.sold !== right.sold) {
      return right.sold - left.sold;
    }
    // Still tied: `Array#sort` is stable, so catalogue order is the last resort.
    return 0;
  };
}

function rankWithBreaks(items: CatalogueItem[], queryText: string, breaks: TieBreaks): string[] {
  const query = parseQuery(queryText);
  if (query === null) return [];
  const rows = toRows(scoreListings(indexFor(items), query), items, query);
  return rows.sort(compare(breaks)).map((row) => row.id);
}

function ranker(name: string, breaks: TieBreaks): Ranker {
  return { name, rank: (items, query) => rankWithBreaks(items, query, breaks) };
}

/**
 * The ranker as it shipped before the tie-breaks: score only, ties by array order.
 * Frozen here so the report keeps a "before" column after the fix landed — this is
 * the only intentionally preserved copy of the old ordering, and it exists to be
 * compared against, never called.
 */
export const legacy: Ranker = ranker("legacy (score only)", NONE);

export const positionOnly: Ranker = ranker("+ position", {
  ...NONE,
  position: true,
});

export const positionAndTightness: Ranker = ranker("+ position + tightness", SHIPPED_BREAKS);

export const withPopularity: Ranker = ranker("+ all three", {
  ...SHIPPED_BREAKS,
  popularity: true,
});

/** The literal "always prefer a name that starts with the query" rule. */
export const leadingFirst: Ranker = ranker("+ leading above tier", {
  ...SHIPPED_BREAKS,
  popularity: true,
  positionPrimary: true,
});

/** The wired ranker, called through its real entry point. */
export const shipped: Ranker = {
  name: "shipped (searchListings)",
  rank: (items, query) => searchListings(indexFor(items), query).map((hit) => hit.id),
};

/**
 * Category words an operator never types into a product name. A placeholder for
 * the real table: the shape of a fix, not the fix.
 */
export const CATEGORY_WORDS: Record<string, string[]> = {
  mie: ["indomie", "sarimi"],
  instan: ["indomie", "sarimi"],
  rokok: ["sampoerna", "gudang garam"],
  kopi: ["kapal api"],
};

/**
 * Expansion, scored as a *guess*: each target term is probed through the real
 * ladder and then capped just below `tokenSet`, so an expanded hit can never
 * outrank a real match on a name. The tie-breaks still run, which is what decides
 * `rokok` between Sampoerna and Gudang Garam.
 *
 * Simplification: only queries whose words are *all* category words expand, and
 * targets are probed as standalone terms. Multi-word targets and mixed queries
 * ("rokok sampoerna") are out of scope for the prototype.
 */
export function expansionsFor(query: Query): string[] | null {
  const targets = query.words.map((word) => CATEGORY_WORDS[word]);
  if (targets.some((target) => target === undefined)) return null;
  return [...new Set(targets.flat())];
}

export const withExpansion: Ranker = {
  name: "+ expansion",
  rank(items, query) {
    const parsed = parseQuery(query);
    if (parsed === null) return [];

    const targets = expansionsFor(parsed);
    if (targets === null) return rankWithBreaks(items, query, withPopularityBreaks());

    const CEILING = TEXT.tokenSet - 0.01;
    const index = indexFor(items);
    const best = new Map<string, Ranked>();

    for (const target of targets) {
      const probe = parseQuery(target);
      if (probe === null) continue;
      for (const row of scoreListings(index, probe)) {
        const capped: Ranked = { ...row, score: Math.min(CEILING, row.score) };
        const current = best.get(row.id);
        if (current === undefined || capped.score > current.score) best.set(row.id, capped);
      }
    }

    return toRows([...best.values()], items, parsed)
      .sort(compare(withPopularityBreaks()))
      .map((row) => row.id);
  },
};

function withPopularityBreaks(): TieBreaks {
  return { ...SHIPPED_BREAKS, popularity: true };
}

/** Everything the report scores, in the order it should be read. */
export const candidates: Ranker[] = [
  legacy,
  positionOnly,
  positionAndTightness,
  withPopularity,
  leadingFirst,
  withExpansion,
];

/** The wired ranker, for tests that assert the prototype and the app agree. */
export { shipped as shippedRanker };
