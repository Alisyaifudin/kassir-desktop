/**
 * Guards the dialog's accessible description.
 *
 * Radix's `DialogContent` logs
 * `Missing 'Description' or 'aria-describedby={undefined}' for {DialogContent}`
 * on every mount when the dialog renders neither, and a screen reader then
 * announces a bare title — which on this app means "Bayar Kredit, dialog" with
 * nothing about what is being settled. Twenty-one of thirty-five dialogs shipped
 * that way, and the warning was already visible in the test output.
 *
 * Every `<DialogContent>` therefore has to either render a `<DialogDescription>`
 * or state `aria-describedby={undefined}` on purpose (with a comment saying
 * why). The primitive itself is exempt: it is the one place the rule is defined.
 *
 * Run with:  bun test src/lib/dialog-description.test.ts
 */
import { describe, expect, test } from "bun:test";
import { Glob } from "bun";
import { readFileSync } from "node:fs";

/** The primitive that declares the convention, not a caller of it. */
const PRIMITIVE = "src/components/ui/dialog.tsx";

const CONTENT = /<DialogContent\b[\s\S]*?<\/DialogContent>/g;

/** Either a description, or the deliberate opt-out. */
const DESCRIBED = /<DialogDescription|aria-describedby=\{undefined\}|description=/;

function sources(): string[] {
  return [...new Glob("src/**/*.tsx").scanSync(process.cwd())].filter((path) => path !== PRIMITIVE);
}

describe("dialog descriptions", () => {
  test("every dialog content describes itself or opts out on purpose", () => {
    const offenders: string[] = [];
    for (const path of sources()) {
      const content = readFileSync(path, "utf8");
      for (const [index, block] of [...content.matchAll(CONTENT)].entries()) {
        if (!DESCRIBED.test(block[0])) offenders.push(`${path}: dialog #${index + 1}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
