/**
 * Guards the typography tokens.
 *
 * `.pi/skills/services.md` and `.agent/agent.md` fix the scale at four tokens —
 * `text-big`, `text-normal`, `text-small`, and the owner-reserved `text-tiny` —
 * and the tokens are re-resolved per app size (`--text-normal` 30px → 20px under
 * `small:`). A raw `text-3xl` is a fixed 30px in *both* modes, so a screen that
 * uses one has a hierarchy that is only correct at one of the two supported
 * sizes; that is how the receipt header and both destructive money dialogs kept
 * 30px titles while the body around them dropped to 20px.
 *
 * Run with:  bun test src/lib/design-tokens.test.ts
 */
import { describe, expect, test } from "bun:test";
import { Glob } from "bun";
import { readFileSync } from "node:fs";

/** Raw text-size utilities: `text-sm`, `text-3xl`, `text-[14px]`, … */
const FORBIDDEN = /(?<![\w-])text-(?:xs|sm|base|lg|xl|[2-9]xl|\[[^\]]+\])(?![\w-])/g;

function sources(): string[] {
  return [...new Glob("src/**/*.tsx").scanSync(process.cwd())];
}

describe("design tokens", () => {
  test("no component ships a fixed text size", () => {
    const offenders: string[] = [];
    for (const path of sources()) {
      const content = readFileSync(path, "utf8");
      for (const match of content.matchAll(FORBIDDEN)) offenders.push(`${path}: ${match[0]}`);
    }
    expect(offenders).toEqual([]);
  });

  test("the owner-reserved `text-tiny` is not used", () => {
    const offenders = sources().filter((path) =>
      /(?<![\w-])text-tiny(?![\w-])/.test(readFileSync(path, "utf8")),
    );
    expect(offenders).toEqual([]);
  });
});
