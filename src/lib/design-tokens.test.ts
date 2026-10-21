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

/**
 * A lucide `size={N}` writes `width`/`height` **attributes**, which no `.small`
 * rule can override — so the icon keeps its pixel size while every other icon on
 * the screen drops from 30px to 20px. `className="icon"` is the convention
 * (`@utility icon` in global.css, re-resolved per app size) and is used ~90
 * times; fifteen call sites had drifted to a numeric `size`, the two most-clicked
 * ones being the Records day steppers.
 *
 * A deliberately larger glyph uses a size class instead (`size-16`,
 * `size-[100px]`), never the attribute.
 */
const SIZE_ATTRIBUTE = /(?<![\w-])size=\{\s*\d+\s*\}/g;

/**
 * A misspelled token class (`text-mormal`, `text-smallall!`) emits no rule at
 * all, so the element silently falls back to the inherited body size — the guard
 * only knew the `text-xs|sm|lg|[Npx]` shape and let two shipped headings render
 * at 16px. Every `text-<name>` inside a string literal must therefore be a real
 * utility: one of the four size tokens (plus the two custom sizes), a theme
 * colour from `global.css`, a Tailwind palette colour, or a non-size utility
 * (alignment, wrap).
 */
const TOKENS = new Set(["big", "normal", "small", "tiny", "change", "grand-total"]);

const NOT_A_SIZE = new Set([
  // alignment
  "center",
  "start",
  "end",
  "left",
  "right",
  "justify",
  // wrap / overflow / transform
  "wrap",
  "nowrap",
  "balance",
  "pretty",
  "clip",
  "ellipsis",
  "uppercase",
  "lowercase",
  "capitalize",
  // keywords
  "white",
  "black",
  "transparent",
  "current",
  "inherit",
]);

const PALETTE =
  /^(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|[1-9]00|950)$/;

const STRING_LITERAL = /"([^"\n]*)"|'([^'\n]*)'|`([^`]*)`/g;
const TEXT_CLASS = /(?<![\w-])text-([a-zA-Z0-9-]+)/g;

function themeColors(): Set<string> {
  const css = readFileSync("src/global.css", "utf8");
  return new Set([...css.matchAll(/--color-([a-z0-9-]+)\s*:/g)].map((match) => match[1]));
}

function sources(): string[] {
  return [...new Glob("src/**/*.tsx").scanSync(process.cwd())];
}

/** The lucide identifiers a file imports, so only icons are size-checked. */
function lucideIcons(content: string): Set<string> {
  const names = new Set<string>();
  for (const match of content.matchAll(
    /import\s*\{([^}]*)\}\s*from\s*"lucide-react"/g,
  )) {
    for (const part of match[1].split(",")) {
      const name = part.trim().split(/\s+as\s+/).pop()?.trim();
      if (name) names.add(name);
    }
  }
  return names;
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

  test("no icon ships a numeric `size` attribute instead of the `icon` utility", () => {
    const offenders: string[] = [];
    for (const path of sources()) {
      const content = readFileSync(path, "utf8");
      for (const match of content.matchAll(SIZE_ATTRIBUTE)) offenders.push(`${path}: ${match[0]}`);
    }
    expect(offenders).toEqual([]);
  });

  test("every `text-*` class names a real token, colour or utility", () => {
    const colors = themeColors();
    const offenders: string[] = [];
    for (const path of sources()) {
      const content = readFileSync(path, "utf8");
      for (const literal of content.matchAll(STRING_LITERAL)) {
        const text = literal[1] ?? literal[2] ?? literal[3] ?? "";
        for (const match of text.matchAll(TEXT_CLASS)) {
          const name = match[1].replace(/!$/, "").split("/")[0];
          if (TOKENS.has(name) || colors.has(name) || NOT_A_SIZE.has(name)) continue;
          if (PALETTE.test(name)) continue;
          offenders.push(`${path}: ${match[0]}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  test("a lucide icon is never sized with a fixed `w-`/`h-` class", () => {
    // `w-4 h-4` pins the glyph to 16px in *both* app sizes; `className="icon"`
    // re-resolves from `--icon-size` and `size-*` is the documented way to ask
    // for a deliberately different glyph.
    const offenders: string[] = [];
    for (const path of sources()) {
      const content = readFileSync(path, "utf8");
      const icons = lucideIcons(content);
      if (icons.size === 0) continue;
      for (const match of content.matchAll(/<([A-Z][A-Za-z0-9]*)\b[^>]*?className="([^"]*)"/g)) {
        if (!icons.has(match[1])) continue;
        if (/(?<![\w-])[wh]-\d/.test(match[2])) {
          offenders.push(`${path}: <${match[1]} className="${match[2]}">`);
        }
      }
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
