/**
 * The shapes the search evaluation harness is built from.
 *
 * The point of this directory is to make a ranking change *falsifiable*: the
 * test file asserts the ladder's promises today, but nothing measures how often
 * the search actually puts the right thing first. So the harness carries its own
 * catalogue and query set, and every candidate ranker is scored against them.
 */

/** One searchable listing plus the signal a ranker may use beyond the text. */
export type CatalogueItem = {
  id: string;
  name: string;
  code: string | null;
  productName: string;
  altNames: string[];
  /**
   * Units sold in the window the till cares about. Only the popularity
   * candidates read this; the baseline ignores it, because the shipped
   * `SearchableListing` carries no such field yet.
   */
  sold: number;
};

/** What a query case is exercising. Drives the per-tag breakdown in the report. */
export type QueryTag =
  | "exact"
  | "code"
  | "prefix"
  | "typo"
  | "transposition"
  | "swap"
  | "abbrev"
  | "synonym"
  | "confusable";

/**
 * One typed query and the two different notions of "correct" it can have.
 *
 * `relevant` and `best` are deliberately separate. For a near-duplicate family
 * (`Gula Pasir 1kg` vs `Gula Pasir 500g`) both ids are relevant — a cashier
 * landing on either has found the right shelf — but only one is the answer they
 * meant. Collapsing those two into one list is what hides the wrong-item bug: the
 * baseline would score 100% recall and look fine while ringing up the 500g.
 */
export type QueryCase = {
  query: string;
  tags: QueryTag[];
  /** Every id that is a correct answer. Feeds MRR and recall@10. */
  relevant: string[];
  /** The ids allowed to be #1. Defaults to `relevant` when omitted. */
  best?: string[];
  /** The failure this case reproduces, for the report. */
  note?: string;
};

/** A ranking strategy under test. Returns ids, highest first. */
export type Ranker = {
  name: string;
  rank(items: CatalogueItem[], query: string): string[];
};

/** Aggregate result of scoring one ranker over the whole query set. */
export type Scores = {
  queries: number;
  /** Share of queries whose #1 is an allowed #1. */
  precision1: number;
  /** Mean reciprocal rank of the first relevant hit. */
  mrr: number;
  /** Share of queries with any relevant hit in the top 10. */
  recall10: number;
  /**
   * #1 was a correct answer but not the right one — a near-duplicate sibling
   * won. This is the "wrong item rung up" rate, counted separately because it
   * moves the opposite way from recall.
   */
  wrongFirst: number;
  /** Nothing relevant in the top 10 — the "item not found" rate. */
  misses: number;
};

/** Per-query detail, so a regression can be traced to a case and not a number. */
export type Outcome = {
  query: string;
  tags: QueryTag[];
  /** Id at rank 1, or null when the ranker returned nothing. */
  rank1: string | null;
  /** 1-indexed rank of the first relevant hit, or null. */
  firstRelevant: number | null;
  correctAt1: boolean;
  wrongFirst: boolean;
  miss: boolean;
};
