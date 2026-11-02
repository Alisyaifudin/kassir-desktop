/**
 * The report: every candidate ranker scored over the fixture set, overall and
 * per query tag.
 *
 * `bun src/lib/search/eval/run.ts` prints it. `eval.test.ts` asserts the same
 * numbers, so a ranking change cannot quietly trade `wrong#1` for `p@1` — which
 * is exactly the trade the shipped ladder makes today.
 */
import { byTag, evaluate, formatRow, headerRow, tagsOf } from "./metrics";
import { candidates } from "./candidates";
import { catalogue, queries } from "./fixtures";

export type Report = {
  overall: string;
  perTag: string;
  detail: string;
};

/** Run every candidate and render the three tables. */
export function report(): Report {
  const results = candidates.map((ranker) => ({
    ranker,
    ...evaluate(ranker, catalogue, queries),
  }));

  const overallLines = [headerRow()];
  for (const { ranker, scores } of results) overallLines.push(formatRow(ranker.name, scores));

  const tags = tagsOf(queries);
  const perTagWidth = 24;
  const tagLines = [
    `${"rank by tag".padEnd(perTagWidth)}${tags.map((tag) => tag.padEnd(14)).join("")}`,
  ];
  for (const { ranker, outcomes } of results) {
    const cells = tags.map((tag) => {
      const scores = byTag(outcomes, tag);
      return `p@1 ${scores.precision1.toFixed(2)}`.padEnd(14);
    });
    tagLines.push(`${ranker.name.padEnd(perTagWidth)}${cells.join("")}`);
  }

  // Only the cases where the answers disagree are interesting.
  const detailLines: string[] = [];
  for (const testCase of queries) {
    const rankings = results.map(({ ranker }) => ({
      name: ranker.name,
      top: ranker.rank(catalogue, testCase.query)[0] ?? "—",
    }));
    if (new Set(rankings.map((ranking) => ranking.top)).size === 1) continue;
    detailLines.push(`\n  query: ${testCase.query}${testCase.note ? `  (${testCase.note})` : ""}`);
    for (const ranking of rankings) detailLines.push(`    ${ranking.name.padEnd(24)}${ranking.top}`);
  }

  return {
    overall: overallLines.join("\n"),
    perTag: tagLines.join("\n"),
    detail: detailLines.join("\n"),
  };
}

if (import.meta.main) {
  const output = report();
  console.log(`\nSearch ranking report — ${queries.length} queries, ${catalogue.length} listings`);
  console.log(`\n${output.overall}`);
  console.log(`\n${output.perTag}`);
  console.log(`\nWhere the candidates disagree${output.detail}\n`);
}
