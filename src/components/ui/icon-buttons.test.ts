/**
 * Guards the one accessibility rule a source scan can check without a browser:
 * every icon-only button has a name.
 *
 * A `<Button size="icon">` that contains only an icon and no `aria-label` (or a
 * `sr-only` span) is announced as "button" by a screen reader. `title` is a
 * fallback in the accessible-name computation, not a guarantee — many screen
 * readers ignore it — so a `title`-only button is at best half-named. The two
 * import dialogs shipped unnamed dismiss/cancel buttons for exactly this reason.
 *
 * Run with:  bun test src/components/ui/icon-buttons.test.ts
 */
import { describe, expect, test } from "bun:test";
import { Glob } from "bun";
import { readFileSync } from "node:fs";

type Offender = { file: string; line: number };

/**
 * Every `<Button …>…</Button>` element, as its full source slice. Buttons do not
 * nest, so the first closing tag is the element's end.
 */
function buttons(content: string): { source: string; line: number }[] {
  const out: { source: string; line: number }[] = [];
  const pattern = /<Button\b[\s\S]*?<\/Button>/g;
  for (const match of content.matchAll(pattern)) {
    const line = content.slice(0, match.index).split("\n").length;
    out.push({ source: match[0], line });
  }
  return out;
}

function sources(): string[] {
  return [...new Glob("src/**/*.tsx").scanSync(process.cwd())];
}

describe("icon buttons", () => {
  test("no icon-only button ships without an accessible name", () => {
    const offenders: Offender[] = [];
    for (const file of sources()) {
      const content = readFileSync(file, "utf8");
      for (const { source, line } of buttons(content)) {
        if (!source.includes('size="icon"')) continue;
        if (source.includes("aria-label") || source.includes("aria-labelledby")) continue;
        // A screen-reader-only span inside the button is a name too.
        if (source.includes("sr-only")) continue;
        offenders.push({ file, line });
      }
    }
    expect(offenders).toEqual([]);
  });
});
