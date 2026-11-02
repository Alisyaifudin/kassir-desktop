import { describe, expect, test } from "bun:test";
import { createIndexCache, createMatcher, parseQuery, rankHits, toHit, type Hit, type Ranked } from "./index-cache";

/**
 * One query ladder and one cache for every search box. The ladder is what keeps a
 * one- or two-character query exact (a `nas` that prefix-matches half the
 * catalogue is noise) and the cache is what keeps a sale — a fresh array with the
 * same names — from rebuilding the index on every emit.
 */
describe("parseQuery", () => {
  test("an empty query matches nothing", () => {
    expect(parseQuery("")).toBeNull();
    expect(parseQuery("   ")).toBeNull();
    expect(parseQuery("…!")).toBeNull();
  });

  test("the length ladder is read from the compact form, not the typed string", () => {
    // A GS1 payload with its separators typed in is two characters of query.
    const query = parseQuery("(90)");
    expect(query?.code).toBe("90");
    expect(query?.options).toEqual({ tokenPrefix: true, weak: false });
    expect(query?.minimum).toBe(5_000);
  });

  test("one character is exact-only, two allows prefixes, three allows typos", () => {
    expect(parseQuery("n")?.minimum).toBe(7_000);
    expect(parseQuery("n")?.options).toEqual({ tokenPrefix: false, weak: false });

    expect(parseQuery("na")?.minimum).toBe(5_000);
    expect(parseQuery("na")?.options).toEqual({ tokenPrefix: true, weak: false });

    expect(parseQuery("nas")?.minimum).toBe(1_500);
    expect(parseQuery("nas")?.options).toEqual({ tokenPrefix: true, weak: true });
  });

  test("carries the normalised text and its words alongside the raw query", () => {
    const query = parseQuery("  Nasi   Goreng ");
    expect(query?.raw).toBe("  Nasi   Goreng ");
    expect(query?.norm).toBe("nasi goreng");
    expect(query?.words).toEqual(["nasi", "goreng"]);
  });
});

describe("toHit", () => {
  const threeChars = parseQuery("nas")!;
  const oneChar = parseQuery("n")!;

  test("a match below the query's floor is dropped", () => {
    // 0.1499 × 9999 = 1499, one point under the three-character floor.
    expect(toHit("a", 0.1499, threeChars)).toBeNull();
    expect(toHit("a", 0, threeChars)).toBeNull();
    expect(toHit("a", -1, threeChars)).toBeNull();
  });

  test("the score is the quality on the shared 0..9999 scale", () => {
    expect(toHit("a", 0.5, threeChars)).toEqual({ id: "a", score: 5_000 });
    // A one-character query has to clear 7000 to be worth showing at all.
    expect(toHit("a", 0.69, oneChar)).toBeNull();
    // 0.71 × 9999 = 7099 — above the floor, where 0.69 (6899) is below it.
    expect(toHit("a", 0.71, oneChar)).toEqual({ id: "a", score: 7_099 });
  });
});

describe("rankHits", () => {
  const query = parseQuery("nas")!;

  function ranked(id: string, score: number, position: number, tightness: number): Ranked {
    return { id, score, position, tightness };
  }

  test("highest score first", () => {
    const rows = [ranked("a", 0.5, 0, 1), ranked("b", 0.9, 0, 1), ranked("c", 0.7, 0, 1)];
    expect(rankHits(rows, query).map((hit) => hit.id)).toEqual(["b", "c", "a"]);
  });

  test("a tie goes to the name that starts with the query", () => {
    // Both score 0.86 * 0.92: `roll` as word 0 of "Roll Rambut Besar" against
    // `roll` as word 1 of "Barenbliss Roll To Clean Mascara".
    const rows = [ranked("mid-name", 0.7912, 1, 0.9), ranked("leading", 0.7912, 0, 0.3)];
    expect(rankHits(rows, query).map((hit) => hit.id)).toEqual(["leading", "mid-name"]);
  });

  test("then the tighter name, then the catalogue order", () => {
    const rows = [
      ranked("loose", 0.7912, 0, 0.2),
      ranked("tight", 0.7912, 0, 0.8),
      ranked("tied-first", 0.7912, 0, 0.8),
    ];
    expect(rankHits(rows, query).map((hit) => hit.id)).toEqual(["tight", "tied-first", "loose"]);
  });

  test("a tie-break never reorders entries whose scores differ", () => {
    // The whole safety argument for lexicographic comparison: a leading, tight
    // match on a worse tier still loses to a mid-name match on a better one.
    const rows = [ranked("worse-tier", 0.736, 0, 1), ranked("better-tier", 0.7912, 9, 0)];
    expect(rankHits(rows, query).map((hit) => hit.id)).toEqual(["better-tier", "worse-tier"]);
  });

  test("drops what the query's floor rejects and returns plain hits", () => {
    const hits: Hit[] = rankHits([ranked("a", 0.1499, 0, 1), ranked("b", 0.5, 0, 1)], query);
    expect(hits).toEqual([{ id: "b", score: 5_000 }]);
  });
});

describe("createMatcher", () => {
  const query = parseQuery("ha")!;

  test("keeps the best-scoring field and the signals that field earned", () => {
    const matcher = createMatcher("id", query);
    // A product-name prefix match at 0.8 * 0.88 = 0.704 …
    matcher.offerText(0.8, 0.88, "hanasui", ["hanasui"]);
    // … loses to a listing-name match at 0.8 * 0.92, whose word 2 is the hit.
    matcher.offerText(0.8, 0.92, "2in1 volume hairpin", ["2in1", "volume", "hairpin"]);

    const row = matcher.result();
    expect(row?.score).toBeCloseTo(0.8 * 0.92, 10);
    expect(row?.position).toBe(2);
  });

  test("an exact code is pinned to position 0 so a scan always leads", () => {
    const matcher = createMatcher("id", query);
    matcher.offerCode(1, 1, "8998866200012");
    matcher.offerText(0.8, 0.92, "hanasui", ["hanasui"]);

    const row = matcher.result();
    expect(row?.score).toBe(1);
    expect(row?.position).toBe(0);
  });

  test("nothing offered means no row, not a zero score", () => {
    expect(createMatcher("id", query).result()).toBeNull();
  });
});

describe("createIndexCache", () => {
  type Item = { id: string; name: string };
  type Entry = { id: string; name: string };

  function setup() {
    const built: string[] = [];
    let signs = 0;
    const cache = createIndexCache<Item, Entry>(
      (items) => {
        signs += 1;
        return items.map((item) => `${item.id}:${item.name}`).join("|");
      },
      (item) => {
        built.push(item.id);
        return { id: item.id, name: item.name.trim() };
      },
    );
    return {
      cache,
      built,
      signatures: () => signs,
    };
  }

  test("build always returns a fresh index over the given array", () => {
    const { cache, built } = setup();
    const items = [
      { id: "a", name: " Kopi " },
      { id: "b", name: "Teh" },
    ];

    const index = cache.build(items);

    expect(index.entries).toEqual([
      { id: "a", name: "Kopi" },
      { id: "b", name: "Teh" },
    ]);
    expect(built).toEqual(["a", "b"]);
    expect(cache.build(items)).not.toBe(index);
  });

  test("get reuses the cache for a fresh array with the same content", () => {
    const { cache, built } = setup();
    const first = cache.get([{ id: "a", name: "Kopi" }]);
    // The streams re-emit a new array on every hydrate; a sale must not rebuild.
    const second = cache.get([{ id: "a", name: "Kopi" }]);

    expect(second).toBe(first);
    expect(built).toEqual(["a"]);
  });

  test("get rebuilds when a matched field changes", () => {
    const { cache, built } = setup();
    cache.get([{ id: "a", name: "Kopi" }]);
    const renamed = cache.get([{ id: "a", name: "Teh" }]);

    expect(renamed.entries).toEqual([{ id: "a", name: "Teh" }]);
    expect(built).toEqual(["a", "a"]);
  });

  test("an array's signature is computed once, so repeated reads skip the join", () => {
    const { cache, signatures } = setup();
    const items = [{ id: "a", name: "Kopi" }];

    cache.get(items);
    cache.get(items);
    cache.get(items);

    expect(signatures()).toBe(1);
  });

  test("reset forgets both the cache and the remembered signatures", () => {
    const { cache, built, signatures } = setup();
    const items = [{ id: "a", name: "Kopi" }];
    cache.get(items);
    expect(signatures()).toBe(1);

    cache.reset();

    // Same array, but the signature is asked for again and the index rebuilt.
    cache.get(items);
    expect(signatures()).toBe(2);
    expect(built).toEqual(["a", "a"]);
  });
});
