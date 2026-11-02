/**
 * Scoring for the search harness: turns a ranked id list into the five numbers
 * that matter, and keeps the per-query detail so a regression can be traced.
 *
 * `wrongFirst` exists because `precision1` alone is not enough for this app. A
 * cashier who lands on `Gula Pasir 500g` when they meant `1kg` has *found* the
 * right shelf and rung up the wrong bag — the search looks healthy on recall and
 * MRR while the shop loses money. Counting it separately is what makes the
 * "wrong item rung up" complaint measurable.
 */
import type { Outcome, QueryCase, Ranker, Scores, CatalogueItem, QueryTag } from "./types";

const TOP = 10;

function bestOf(testCase: QueryCase): string[] {
  return testCase.best ?? testCase.relevant;
}

/** Score one ranker over the whole query set. */
export function evaluate(
  ranker: Ranker,
  items: CatalogueItem[],
  cases: QueryCase[],
): { scores: Scores; outcomes: Outcome[] } {
  const outcomes: Outcome[] = cases.map((testCase) => {
    const ranked = ranker.rank(items, testCase.query);
    const allowed = new Set(bestOf(testCase));
    const relevant = new Set(testCase.relevant);

    const rank1 = ranked[0] ?? null;
    const top = ranked.slice(0, TOP);
    const firstIndex = top.findIndex((id) => relevant.has(id));

    return {
      query: testCase.query,
      tags: testCase.tags,
      rank1,
      firstRelevant: firstIndex === -1 ? null : firstIndex + 1,
      correctAt1: rank1 !== null && allowed.has(rank1),
      // Correct answer, wrong one — only meaningful when the case distinguishes them.
      wrongFirst: rank1 !== null && relevant.has(rank1) && !allowed.has(rank1),
      miss: firstIndex === -1,
    };
  });

  return { scores: aggregate(outcomes), outcomes };
}

export function aggregate(outcomes: Outcome[]): Scores {
  const n = outcomes.length;
  if (n === 0) {
    return { queries: 0, precision1: 0, mrr: 0, recall10: 0, wrongFirst: 0, misses: 0 };
  }
  const ratio = (count: number) => count / n;
  return {
    queries: n,
    precision1: ratio(outcomes.filter((o) => o.correctAt1).length),
    mrr: outcomes.reduce((sum, o) => sum + (o.firstRelevant === null ? 0 : 1 / o.firstRelevant), 0) / n,
    recall10: ratio(outcomes.filter((o) => o.firstRelevant !== null).length),
    wrongFirst: ratio(outcomes.filter((o) => o.wrongFirst).length),
    misses: ratio(outcomes.filter((o) => o.miss).length),
  };
}

/** Aggregate restricted to the cases carrying `tag`, for the per-area breakdown. */
export function byTag(outcomes: Outcome[], tag: QueryTag): Scores {
  return aggregate(outcomes.filter((outcome) => outcome.tags.includes(tag)));
}

/** Every tag present in the set, in a stable order for the report. */
export function tagsOf(cases: QueryCase[]): QueryTag[] {
  const seen = new Set<QueryTag>();
  for (const testCase of cases) for (const tag of testCase.tags) seen.add(tag);
  return [...seen].sort();
}

const COLUMNS = ["p@1", "MRR", "r@10", "wrong#1", "miss"] as const;

function pad(value: string, width: number): string {
  return value.length >= width ? value : value + " ".repeat(width - value.length);
}

function fixed(value: number, decimals = 3): string {
  return value.toFixed(decimals);
}

/** A fixed-width table row: `label  p@1  MRR  r@10  wrong#1  miss`. */
export function formatRow(label: string, scores: Scores): string {
  const cells = [
    fixed(scores.precision1),
    fixed(scores.mrr),
    fixed(scores.recall10),
    fixed(scores.wrongFirst),
    fixed(scores.misses),
  ];
  return `${pad(label, 24)}${cells.map((cell) => pad(cell, 9)).join("")}`;
}

export function headerRow(): string {
  return `${pad("ranker", 24)}${COLUMNS.map((column) => pad(column, 9)).join("")}`;
}
