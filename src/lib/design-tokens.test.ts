/**
 * Guards the typography scale.
 *
 * The app used to size text with its own tokens — `text-big`, `text-normal`,
 * `text-small`, `text-tiny` — re-resolved per app size through a `small:` variant.
 * Both the tokens and the variant are gone: type now comes straight from stock
 * Tailwind sizes, anchored on `text-base` (16px) for body copy, so there is one
 * scale and no second "compact" pass over the same element list.
 *
 * | role              | class        | size  | line-height |
 * |-------------------|--------------|-------|-------------|
 * | change / hero     | `text-6xl`   | 60px  | 1 (0.8 in cart) |
 * | page / loud money | `text-5xl`   | 48px  | 1           |
 * | section title     | `text-2xl`   | 24px  | 32px        |
 * | body (default)    | `text-base`  | 16px  | 24px        |
 * | secondary         | `text-sm`    | 14px  | 20px        |
 * | detail / meta     | `text-xs`    | 12px  | 16px        |
 *
 * The allowlist is the point: a stray `text-xl` is not a smaller version of
 * `text-base`, it is a seventh size nobody chose. Run with:
 *
 *   bun test src/lib/design-tokens.test.ts
 */
import { describe, expect, test } from "bun:test";
import { Glob } from "bun";
import { readFileSync } from "node:fs";

/** The only text sizes the UI is allowed to use (see the table above). */
const SIZES = new Set(["xs", "sm", "base", "2xl", "5xl", "6xl"]);

/**
 * The retired tokens and the `small:` variant. They emit no rule any more, so a
 * leftover would fall back to the inherited body size and look *almost* right —
 * exactly the kind of drift a guard is for.
 */
const LEGACY_TOKEN = /(?<![\w-])text-(?:big|normal|small|tiny|change|grand-total)(?![\w-])/g;
const SMALL_VARIANT = /(?<![\w-])small:/;

/**
 * A lucide `size={N}` writes `width`/`height` **attributes**, which no class can
 * override. `size-5` (and `size-N` for a deliberately different glyph) is
 * the convention; the attribute is not.
 */
const SIZE_ATTRIBUTE = /(?<![\w-])size=\{\s*\d+\s*\}/g;

/**
 * Every stock Tailwind text-size utility, whether or not the app allows it, so
 * the allowlist above can reject the ones nobody chose.
 */
const STANDARD_SIZE = /(?<![\w-])text-((?:xs|sm|base|lg|xl|[0-9]+xl))(?![\w-])/g;

/**
 * A string is a class list when it is a `className` value or an argument to
 * `cn(...)` — the only two places the retired `icon` class could hide.
 */
const CLASS_STRING = /className="([^"]*)"|cn\(([^)]*)\)/g;

/**
 * A misspelled class (`text-mormal`, `text-2xll`) emits no rule at all, so the
 * element silently falls back to the inherited body size. Every `text-<name>`
 * inside a string literal must therefore be a real utility: one of the allowed
 * sizes above, a theme colour from `global.css`, a Tailwind palette colour, or a
 * non-size utility (alignment, wrap).
 */
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
  for (const match of content.matchAll(/import\s*\{([^}]*)\}\s*from\s*"lucide-react"/g)) {
    for (const part of match[1].split(",")) {
      const name = part
        .trim()
        .split(/\s+as\s+/)
        .pop()
        ?.trim();
      if (name) names.add(name);
    }
  }
  return names;
}

describe("design tokens", () => {
  test("the retired size tokens are gone", () => {
    const offenders: string[] = [];
    for (const path of sources()) {
      const content = readFileSync(path, "utf8");
      for (const match of content.matchAll(LEGACY_TOKEN)) offenders.push(`${path}: ${match[0]}`);
    }
    expect(offenders).toEqual([]);
  });

  test("global.css carries no retired token, `small:` variant or `icon` utility", () => {
    // CSS is the one place the `.tsx` scan cannot see: `@apply icon` survived the
    // component sweep and silently stopped emitting a rule.
    const css = readFileSync("src/global.css", "utf8");
    expect([...css.matchAll(LEGACY_TOKEN)].map((match) => match[0])).toEqual([]);
    expect(SMALL_VARIANT.test(css)).toBe(false);
    expect(/@utility\s+icon\b|@apply\s+[^;]*?(?<![\w-])icon(?![\w-])/.test(css)).toBe(false);
  });

  test("the `small:` variant is gone", () => {
    const offenders: string[] = [];
    for (const path of sources()) {
      const content = readFileSync(path, "utf8");
      if (SMALL_VARIANT.test(content)) offenders.push(`${path}: small:`);
    }
    expect(offenders).toEqual([]);
  });

  test("every text size is one of the allowed Tailwind sizes", () => {
    const offenders: string[] = [];
    for (const path of sources()) {
      const content = readFileSync(path, "utf8");
      for (const match of content.matchAll(STANDARD_SIZE)) {
        if (!SIZES.has(match[1])) offenders.push(`${path}: ${match[0]}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  test("no icon ships a numeric `size` attribute instead of a size class", () => {
    const offenders: string[] = [];
    for (const path of sources()) {
      const content = readFileSync(path, "utf8");
      for (const match of content.matchAll(SIZE_ATTRIBUTE)) offenders.push(`${path}: ${match[0]}`);
    }
    expect(offenders).toEqual([]);
  });

  test("no icon carries the retired `icon` class", () => {
    // `@utility icon` is gone, so the class would silently render at 24px. A
    // Button's `size="icon"` variant is a prop, not a class, and stays.
    const offenders: string[] = [];
    for (const path of sources()) {
      const content = readFileSync(path, "utf8");
      for (const match of content.matchAll(CLASS_STRING)) {
        const text = match[1] ?? match[2] ?? "";
        if (/(^|\s)icon(?=\s|$)/.test(text)) offenders.push(`${path}: icon`);
      }
    }
    expect(offenders).toEqual([]);
  });

  test("every `text-*` class names a real size, colour or utility", () => {
    const colors = themeColors();
    const offenders: string[] = [];
    for (const path of sources()) {
      const content = readFileSync(path, "utf8");
      for (const literal of content.matchAll(STRING_LITERAL)) {
        const text = literal[1] ?? literal[2] ?? literal[3] ?? "";
        for (const match of text.matchAll(TEXT_CLASS)) {
          const name = match[1].replace(/!$/, "").split("/")[0];
          if (SIZES.has(name) || colors.has(name) || NOT_A_SIZE.has(name)) continue;
          if (PALETTE.test(name)) continue;
          offenders.push(`${path}: ${match[0]}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  test("a lucide icon is never sized with a fixed `w-`/`h-` class", () => {
    // `w-4 h-4` pins the glyph to 16px; `size-5` (the house default) and
    // `size-N` (a deliberately different glyph) are the documented spellings.
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

  test("a lucide icon declares a heavier stroke as a CSS variable, not a prop", () => {
    // `global.css` sets `stroke-width: calc(var(--icon-stroke, 2) * var(--icon-scale))`
    // on every lucide glyph, where `--icon-scale` is the zoom's compensation
    // (see `iconScaleOf`). A `strokeWidth` prop is an SVG *attribute*, and that
    // rule outranks it — the prop would be silently ignored at every level. The
    // documented spelling is `[--icon-stroke:2.5]` in the icon's class list.
    const offenders: string[] = [];
    for (const path of sources()) {
      const content = readFileSync(path, "utf8");
      const icons = lucideIcons(content);
      if (icons.size === 0) continue;
      for (const match of content.matchAll(/<([A-Z][A-Za-z0-9]*)\b[^>]*?strokeWidth=/g)) {
        if (icons.has(match[1])) offenders.push(`${path}: <${match[1]} strokeWidth=`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
