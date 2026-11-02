/**
 * Checks for the search evaluation harness and the shipped tie-breaks.
 *
 * Run with:  bun test src/lib/search/eval/eval.test.ts
 *
 * Three kinds of assertion live here, and the split matters:
 *
 * - **Regression** — the two reported failures (`roll`, `ha`) are pinned to
 *   `legacy`, the frozen pre-fix ordering, and pinned *again* as fixed on the
 *   shipped ranker. If `legacy` ever stops failing them, the fixture set has
 *   drifted away from the app and the report's "before" column is fiction.
 * - **Equivalence** — the wired ranker must produce byte-identical orderings to
 *   the prototype it was promoted from, so the numbers in the report describe the
 *   code that actually runs.
 * - **Invariant** — a candidate may only *reorder*. It must return the same set of
 *   matching ids, so a ranking improvement cannot be bought by changing what
 *   matches. Only `withExpansion` may add hits, because adding hits is its point.
 */
import { describe, expect, test } from "bun:test";
import {
  candidates,
  legacy,
  leadingFirst,
  positionAndTightness,
  positionOnly,
  shipped,
  withExpansion,
  withPopularity,
} from "./candidates";
import { catalogue, queries } from "./fixtures";
import { evaluate } from "./metrics";
import { report } from "./run";

const ids = new Set(catalogue.map((item) => item.id));

function top(query: string, ranker: typeof legacy): string | null {
  return ranker.rank(catalogue, query)[0] ?? null;
}

describe("fixture integrity", () => {
  test("every id a case names exists in the catalogue", () => {
    const missing: string[] = [];
    for (const testCase of queries) {
      for (const id of [...testCase.relevant, ...(testCase.best ?? [])]) {
        if (!ids.has(id)) missing.push(`${testCase.query} -> ${id}`);
      }
    }
    expect(missing).toEqual([]);
  });

  test("a case only calls ids 'best' that it also calls relevant", () => {
    const broken: string[] = [];
    for (const testCase of queries) {
      for (const id of testCase.best ?? []) {
        if (!testCase.relevant.includes(id)) broken.push(`${testCase.query} -> ${id}`);
      }
    }
    expect(broken).toEqual([]);
  });

  test("catalogue ids are unique", () => {
    expect(ids.size).toBe(catalogue.length);
  });
});

describe("the reported failures reproduce on the pre-fix ordering", () => {
  test("`roll` ranked the mid-name match above the leading one", () => {
    // Both grade as TEXT.tokenSet (0.86): `queryWords.every(word =>
    // fieldWords.includes(word))` is an unordered set test, so the ladder never
    // recorded that `roll` is word 0 of one name and word 1 of the other.
    expect(top("roll", legacy)).toBe("barenbliss-mascara");
  });

  test("`ha` ranked a name that does not begin with `ha` first", () => {
    // Both grade as TEXT.prefix (0.8): hasBoundaryMatch accepts any word
    // boundary, so `ha` at index 12 ("hairpin") equalled `ha` at index 0.
    expect(top("ha", legacy)).toBe("2in1-hairpin");
  });

  test("both are fixed on the shipped ranker", () => {
    expect(top("roll", shipped)).toBe("roll-rambut-besar");
    expect(top("ha", shipped)).toBe("hanasui-lipcream");
  });
});

describe("the wired ranker is the prototype that was measured", () => {
  test("searchListings matches the position+tightness candidate exactly", () => {
    const divergences: string[] = [];
    for (const testCase of queries) {
      const wired = shipped.rank(catalogue, testCase.query);
      const prototype = positionAndTightness.rank(catalogue, testCase.query);
      if (wired.length !== prototype.length || wired.some((id, i) => id !== prototype[i])) {
        divergences.push(testCase.query);
      }
    }
    expect(divergences).toEqual([]);
  });
});

describe("a candidate may only reorder, never change what matches", () => {
  test("every non-expanding ranker returns the shipped id set", () => {
    const divergences: string[] = [];
    const nonExpanding = candidates.filter((ranker) => ranker.name !== withExpansion.name);

    for (const testCase of queries) {
      const expected = [...shipped.rank(catalogue, testCase.query)].sort();
      for (const ranker of nonExpanding) {
        const actual = [...ranker.rank(catalogue, testCase.query)].sort();
        if (expected.length !== actual.length || expected.some((id, i) => id !== actual[i])) {
          divergences.push(`${testCase.query} / ${ranker.name}`);
        }
      }
    }

    expect(divergences).toEqual([]);
  });
});

describe("the tie-breaks", () => {
  const scores = (ranker: typeof legacy) => evaluate(ranker, catalogue, queries).scores;

  test("position alone cuts the wrong-item rate without touching recall", () => {
    const before = scores(legacy);
    const after = scores(positionOnly);
    expect(after.precision1).toBeGreaterThan(before.precision1);
    expect(after.wrongFirst).toBeLessThan(before.wrongFirst);
    expect(after.recall10).toBe(before.recall10);
  });

  test("MRR cannot see this bug at all — which is why wrong#1 exists", () => {
    // Both siblings are *relevant*, so landing on the wrong one leaves MRR and
    // recall untouched while the shop rings up the wrong item. If MRR ever moves
    // here, the fixture stopped distinguishing 'relevant' from 'the one meant'.
    expect(scores(shipped).mrr).toBe(scores(legacy).mrr);
    expect(scores(shipped).recall10).toBe(scores(legacy).recall10);
  });

  test("tightness adds to position, and popularity adds to both", () => {
    expect(scores(positionAndTightness).precision1).toBeGreaterThan(
      scores(positionOnly).precision1,
    );
    expect(scores(withPopularity).precision1).toBeGreaterThan(
      scores(positionAndTightness).precision1,
    );
  });

  test("shipping position+tightness removes most of the wrong-item rate", () => {
    const before = scores(legacy);
    const after = scores(shipped);
    expect(after.wrongFirst).toBeLessThan(before.wrongFirst / 2);
    expect(after.recall10).toBe(before.recall10);
  });

  test("promoting leading above the tier buys nothing measurable", () => {
    // Kept as evidence rather than a recommendation: the tie-break already gives
    // every leading name its win on this set, so the riskier rule adds no value.
    expect(scores(leadingFirst).precision1).toBe(scores(withPopularity).precision1);
  });

  test("expansion recovers the queries nothing matches today", () => {
    expect(scores(withExpansion).recall10).toBeGreaterThan(scores(withPopularity).recall10);
  });

  test("prints the report", () => {
    const output = report();
    console.log(
      [
        `\nSearch ranking report — ${queries.length} queries, ${catalogue.length} listings`,
        `\n${output.overall}`,
        `\n${output.perTag}`,
        `\nWhere the candidates disagree${output.detail}`,
      ].join("\n"),
    );
    expect(output.overall.length).toBeGreaterThan(0);
  });
});
