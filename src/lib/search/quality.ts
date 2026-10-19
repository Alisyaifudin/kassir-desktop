/**
 * The match ladder. Every function here works on normalised input (see
 * `normalize.ts`) and returns a quality in `[0, 1]`; the caller multiplies it by
 * the field weight and the `0..9999` scale.
 *
 * Tiers are ordered by value, highest first. The ladder deliberately puts a
 * complete token-set (`goreng nasi`) above a single prefix fragment (`nas`),
 * and a typo last — matching the product-search ladder agreed with the user.
 */

export const TEXT = {
  /** The whole field equals the query. */
  exact: 1.0,
  /** Every query word is a whole word of the field, in any order. */
  tokenSet: 0.86,
  /** The query is a contiguous phrase starting at a word boundary. */
  prefix: 0.8,
  /** Every query word prefixes a distinct word of the field, in any order. */
  tokenPrefix: 0.68,
  /** All characters appear in order, with gaps (`nsg`). */
  subsequence: 0.28,
  /** Every query word is within the edit budget of a field word. */
  typo: 0.2,
} as const;

/** Which optional tiers the query is long enough to allow. */
export type TextOptions = { tokenPrefix: boolean; weak: boolean };

/** Highest-quality text tier a normalised field earns for a normalised query. */
export function gradeText(
  field: string,
  fieldWords: string[],
  query: string,
  queryWords: string[],
  options: TextOptions,
): number {
  if (query === "" || field === "") return 0;
  if (field === query) return TEXT.exact;
  if (queryWords.every((word) => fieldWords.includes(word))) return TEXT.tokenSet;
  if (hasBoundaryMatch(field, query)) return TEXT.prefix;
  if (options.tokenPrefix && everyTokenPrefixesWord(fieldWords, queryWords)) {
    return TEXT.tokenPrefix;
  }
  if (options.weak) {
    const inner = innerQuality(field, query);
    if (inner > 0) return inner;
    // A subsequence only makes sense for one short token: `nsg` inside
    // "nasi goreng". Longer or multi-token queries would match almost any
    // long name (`indomie` is a subsequence of half the catalogue).
    if (queryWords.length === 1 && query.length <= 4) {
      const span = subsequenceSpan(query, field.replace(/ /g, ""));
      if (span !== -1 && span <= query.length * 2 + 1) return TEXT.subsequence;
    }
    const typo = typoQualityFor(queryWords, fieldWords);
    if (typo > 0) return typo;
  }
  return 0;
}

/**
 * Identifier quality: exact, then prefix, then inner substring. `query` and
 * `code` are already `compact()`ed. Short fragments are dampened because a
 * two-character match against a 20-digit barcode only creates noise.
 */
export function gradeCode(code: string, query: string): number {
  if (query === "" || code === "") return 0;
  if (code === query) return 1;
  const ratio = query.length / code.length;
  const dampener = Math.min(1, query.length / 4);
  if (code.startsWith(query)) return (0.75 + 0.25 * ratio) * dampener;
  if (code.includes(query)) return (0.5 + 0.35 * ratio) * dampener;
  return 0;
}

/** True when `query` occurs at index 0 or right after a space. */
function hasBoundaryMatch(field: string, query: string): boolean {
  let from = 0;
  while (from <= field.length - query.length) {
    const index = field.indexOf(query, from);
    if (index === -1) return false;
    if (index === 0 || field[index - 1] === " ") return true;
    from = index + 1;
  }
  return false;
}

/** Greedy bipartite match: every query word takes a distinct field word prefix. */
function everyTokenPrefixesWord(fieldWords: string[], queryWords: string[]): boolean {
  if (queryWords.length === 0) return false;
  const used = new Set<number>();
  for (const query of queryWords) {
    let hit = false;
    for (let i = 0; i < fieldWords.length; i++) {
      if (used.has(i) || !fieldWords[i].startsWith(query)) continue;
      used.add(i);
      hit = true;
      break;
    }
    if (!hit) return false;
  }
  return true;
}

/** Quality for a match inside a word, proportional to how much it covers. */
function innerQuality(field: string, query: string): number {
  const index = field.indexOf(query);
  if (index === -1) return 0;
  let start = index;
  while (start > 0 && field[start - 1] !== " ") start--;
  let end = index + query.length;
  while (end < field.length && field[end] !== " ") end++;
  const word = field.slice(start, end);
  if (word === query) return 0;
  return Math.min(0.65, 0.35 + 0.3 * (query.length / word.length));
}

/**
 * The span covered by the greedy (earliest) subsequence match, or `-1` when the
 * characters do not appear in order. A bounded span stops a short query from
 * matching letters scattered across a long name.
 */
function subsequenceSpan(needle: string, haystack: string): number {
  if (needle.length === 0) return -1;
  let index = 0;
  let first = -1;
  let last = -1;
  for (let i = 0; i < haystack.length && index < needle.length; i++) {
    if (haystack[i] !== needle[index]) continue;
    if (first === -1) first = i;
    last = i;
    index++;
  }
  return index === needle.length ? last - first + 1 : -1;
}

/**
 * Typo quality for a full query. Every token must be within budget; the worst
 * token decides, so a clean token cannot carry a badly misspelt one.
 * The result stays in `[TEXT.typo*0.9, TEXT.typo]`, always below subsequence.
 */
function typoQualityFor(queryWords: string[], fieldWords: string[]): number {
  let worst = Number.POSITIVE_INFINITY;
  for (const query of queryWords) {
    const quality = typoQuality(query, fieldWords);
    if (quality === 0) return 0;
    if (quality < worst) worst = quality;
  }
  return worst;
}

/**
 * Edit budget grows with the word so short words cannot fuzzy-match at all.
 * OSA decides *whether* it is a typo (it handles transpositions, which trigrams
 * miss); trigram Dice only nudges the score inside the tier.
 */
function typoQuality(query: string, fieldWords: string[]): number {
  if (query.length < 4) return fieldWords.includes(query) ? TEXT.typo : 0;
  const max = query.length <= 7 ? 1 : 2;
  let best = 0;
  for (const word of fieldWords) {
    if (Math.abs(word.length - query.length) > max) continue;
    if (optimalStringAlignment(word, query) > max) continue;
    const quality = TEXT.typo * (0.9 + 0.1 * trigramDice(word, query));
    if (quality > best) best = quality;
  }
  return best;
}

function trigramDice(a: string, b: string): number {
  const left = trigrams(a);
  const right = trigrams(b);
  if (left.size === 0 || right.size === 0) return 0;
  let shared = 0;
  for (const gram of left) {
    if (right.has(gram)) shared++;
  }
  return (2 * shared) / (left.size + right.size);
}

function trigrams(value: string): Set<string> {
  const set = new Set<string>();
  for (let i = 0; i + 3 <= value.length; i++) set.add(value.slice(i, i + 3));
  return set;
}

/** Damerau–Levenshtein with adjacent transpositions (OSA), three rolling rows. */
function optimalStringAlignment(a: string, b: string): number {
  const rows = a.length;
  const columns = b.length;
  if (rows === 0) return columns;
  if (columns === 0) return rows;

  let twoBack: number[] = new Array(columns + 1).fill(0);
  let previous: number[] = Array.from({ length: columns + 1 }, (_, index) => index);

  for (let i = 1; i <= rows; i++) {
    const current: number[] = [i];
    for (let j = 1; j <= columns; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let value = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        value = Math.min(value, twoBack[j - 2] + 1);
      }
      current[j] = value;
    }
    twoBack = previous;
    previous = current;
  }

  return previous[columns];
}
