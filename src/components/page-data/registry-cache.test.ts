import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * The cache is a page-level decision, and it has to stay decided once.
 *
 * This reads the registries' source instead of importing them on purpose: a
 * `data.ts` that builds a source imports `~/services`, which resolves the real
 * service layer (and the Tauri plugins under it) at module load — the wrong thing
 * to do in a unit test. The check is on the *argument list* of `createPageData`,
 * not on the word "cache" appearing in the file, so the comment explaining the
 * decision cannot satisfy it by itself.
 *
 * If a page needs a different shape (a `skip`, a tag), extend the assertion —
 * do not delete it.
 */
const DECLARATION = /createPageData<[\s\S]*?>\("\w+"((?:,\s*\{[\s\S]*?\})?)\s*\);/;

function registries(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === "Dev" ? [] : registries(path);
    return entry.name === "data.ts" ? [path] : [];
  });
}

function optionsIn(path: string): string | null {
  const match = DECLARATION.exec(readFileSync(path, "utf8"));
  if (match === null) return null;
  return match[1] ?? "";
}

describe("the page cache rollout", () => {
  test("every page registry keeps its answers in the store", () => {
    const files = registries("src/pages");
    expect(files.length).toBeGreaterThan(15);

    for (const file of files) {
      const options = optionsIn(file);
      expect({ file, declared: options !== null }).toEqual({ file, declared: true });
      expect({ file, cached: options?.includes("cache") ?? false }).toEqual({
        file,
        cached: true,
      });
    }
  });

  test("the two registries that must not cache, or must skip a key, say so", () => {
    // The playground's `beat` is a derived stream (`Stream.tick | scan`): caching
    // it would paint a snapshot and then contradict it, so the page stays off —
    // declared, and deliberately without options.
    expect(optionsIn("src/pages/Dev/PageData/data.ts")).toBe("");

    // The cache lab is the experiment, so its uncached half must stay uncached.
    const lab = readFileSync("src/pages/Dev/PageCache/data.ts", "utf8");
    expect(lab).toContain('"DevPageCachePlain"');
    expect(lab).toContain("cache: { tags: TAGS }");

    // `printers` is a read-once `Effect` that nothing invalidates: a seeded
    // hardware list would never show a printer plugged in since the last visit.
    expect(optionsIn("src/pages/Setting/Printer/data.ts")).toContain('skip: ["printers"]');
  });
});
