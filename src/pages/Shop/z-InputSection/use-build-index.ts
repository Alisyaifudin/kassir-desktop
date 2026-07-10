import { useCallback, useMemo } from "react";
import type { Product } from "~/services/product";

// ---------------------------------------------------------------------------
// Scoring constants
// ---------------------------------------------------------------------------

const SCORE_EXACT_CODE = 100;
const SCORE_CODE_STARTS = 60;
const SCORE_CODE_CONTAINS = 40;
const SCORE_NAME_SUBSTRING = 8; // fallback for queries < 3 chars
const ORDER_SUBSEQUENCE = 12;
const ORDER_WORDS_FOUND = 6;
const THRESHOLD_RATIO = 0.25;
const RESULT_CAP = 20;
const SCORE_FLOOR = 8;

// ---------------------------------------------------------------------------
// Index types
// ---------------------------------------------------------------------------

type Index = {
  /** code → product (exact match) */
  codeExact: Map<string, Product>;
  /** code prefix → product ids (for starts-with) */
  codePrefixes: Map<string, Set<string>>;
  /** substring → product ids (for contains) */
  codeSubstrs: Map<string, Set<string>>;
  /** trigram → product ids */
  nameTrigrams: Map<string, Set<string>>;
  /** product id → product */
  products: Map<string, Product>;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extract all trigrams from a string */
function trigrams(s: string): string[] {
  const result: string[] = [];
  for (let i = 0; i <= s.length - 3; i++) {
    result.push(s.slice(i, i + 3));
  }
  return result;
}

/** Find word start positions in a name */
function wordStarts(name: string): Set<number> {
  const starts = new Set<number>();
  starts.add(0); // first word always starts at 0
  for (let i = 1; i < name.length; i++) {
    if (name[i - 1] === " ") starts.add(i);
  }
  return starts;
}

/** Position weight: 3 for first-word start, 2 for other word starts, 1 elsewhere */
function trigramWeight(i: number, wordStarts: Set<number>): number {
  if (i === 0) return 3;
  if (wordStarts.has(i)) return 2;
  return 1;
}

// ---------------------------------------------------------------------------
// Index builder
// ---------------------------------------------------------------------------

export function buildIndex(products: Product[]): Index {
  const codeExact = new Map<string, Product>();
  const codePrefixes = new Map<string, Set<string>>();
  const codeSubstrs = new Map<string, Set<string>>();
  const nameTrigrams = new Map<string, Set<string>>();
  const productMap = new Map<string, Product>();

  for (const p of products) {
    productMap.set(p.id, p);

    // --- Code index ---
    for (const rawCode of p.codes) {
      const code = rawCode.toLowerCase().trim();
      if (!code) continue;

      // Exact
      codeExact.set(code, p);

      // Prefixes & substrings (min length 2)
      for (let i = 0; i < code.length; i++) {
        for (let j = i + 2; j <= code.length; j++) {
          const sub = code.slice(i, j);
          // substring contains
          if (!codeSubstrs.has(sub)) codeSubstrs.set(sub, new Set());
          codeSubstrs.get(sub)!.add(p.id);
          // prefix (starts at index 0)
          if (i === 0) {
            if (!codePrefixes.has(sub)) codePrefixes.set(sub, new Set());
            codePrefixes.get(sub)!.add(p.id);
          }
        }
      }
    }

    // --- Name trigram index ---
    const name = p.name.toLowerCase();
    const tris = trigrams(name);

    for (let i = 0; i < tris.length; i++) {
      const tri = tris[i];
      if (!nameTrigrams.has(tri)) nameTrigrams.set(tri, new Set());
      nameTrigrams.get(tri)!.add(p.id);
    }
  }

  return {
    codeExact,
    codePrefixes,
    codeSubstrs,
    nameTrigrams,
    products: productMap,
  };
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

export function searchIndex(
  idx: Index,
  raw: string,
): { product: Product; score: number }[] {
  const query = raw.toLowerCase().trim();
  if (!query) return [];

  const scores = new Map<string, number>();

  // --- 1. Exact code match ---
  const exact = idx.codeExact.get(query);
  if (exact) scores.set(exact.id, SCORE_EXACT_CODE);

  // --- 2. Code starts-with (prefix lookup) ---
  for (const [prefix, ids] of idx.codePrefixes) {
    if (prefix.startsWith(query)) {
      for (const id of ids) {
        scores.set(id, Math.max(scores.get(id) ?? 0, SCORE_CODE_STARTS));
      }
    }
  }

  // --- 3. Code contains (substring) ---
  for (const [sub, ids] of idx.codeSubstrs) {
    if (sub.includes(query)) {
      for (const id of ids) {
        scores.set(
          id,
          Math.max(scores.get(id) ?? 0, SCORE_CODE_CONTAINS),
        );
      }
    }
  }

  // --- 4. Name trigram scoring ---
  if (query.length >= 3) {
    const queryTris = trigrams(query.replace(/\s+/g, ""));
    const candidateCounts = new Map<string, number>();

    for (const qTri of queryTris) {
      const matches = idx.nameTrigrams.get(qTri);
      if (!matches) continue;
      for (const id of matches) {
        candidateCounts.set(id, (candidateCounts.get(id) ?? 0) + 1);
      }
    }

    // For each matched product, compute weighted count
    for (const id of candidateCounts.keys()) {
      const product = idx.products.get(id)!;
      const name = product.name.toLowerCase();
      const starts = wordStarts(name);
      const nameTris = trigrams(name);

      let weighted = 0;
      for (let i = 0; i < nameTris.length; i++) {
        if (queryTris.includes(nameTris[i])) {
          weighted += trigramWeight(i, starts);
        }
      }

      const trigramScore = Math.round(
        Math.log10(1 + weighted) * 25,
      );
      scores.set(id, Math.max(scores.get(id) ?? 0, trigramScore));
    }
  } else {
    // Fallback: substring in name for short queries
    for (const [id, product] of idx.products) {
      if (product.name.toLowerCase().includes(query)) {
        scores.set(id, Math.max(scores.get(id) ?? 0, SCORE_NAME_SUBSTRING));
      }
    }
  }

  // --- 5. Order bonus ---
  const qCompact = query.replace(/\s+/g, "");
  const queryWords = query.split(/\s+/).filter(Boolean);

  for (const [id, score] of scores) {
    const product = idx.products.get(id)!;
    const nameCompact = product.name.toLowerCase().replace(/\s+/g, "");

    // Subsequence check: do all query chars appear in order?
    let qi = 0;
    for (let ni = 0; ni < nameCompact.length && qi < qCompact.length; ni++) {
      if (nameCompact[ni] === qCompact[qi]) qi++;
    }
    if (qi === qCompact.length) {
      scores.set(id, score + ORDER_SUBSEQUENCE);
      continue;
    }

    // Word presence: all query words found anywhere in name?
    const nameLower = product.name.toLowerCase();
    if (
      queryWords.length > 1 &&
      queryWords.every((w) => nameLower.includes(w))
    ) {
      scores.set(id, score + ORDER_WORDS_FOUND);
    }
  }

  // --- 6. Sort, threshold, cap ---
  const scored = [...scores]
    .map(([id, score]) => ({ product: idx.products.get(id)!, score }))
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) return [];

  const maxScore = scored[0].score;
  const threshold = Math.max(Math.round(maxScore * THRESHOLD_RATIO), SCORE_FLOOR);

  return scored.filter((s) => s.score >= threshold).slice(0, RESULT_CAP);
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useBuildIndex(products: Product[]) {
  const idx = useMemo(() => buildIndex(products), [products]);

  const search = useCallback(
    (query: string): Product[] =>
      searchIndex(idx, query).map((r) => r.product),
    [idx],
  );

  return search;
}
