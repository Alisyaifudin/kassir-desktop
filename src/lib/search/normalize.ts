/**
 * Search-side text normalisation. The display string is never touched; only the
 * copy that gets indexed or compared goes through here, so casing, accents and
 * punctuation cannot hide a match.
 */

/** Casefold, strip diacritics, and turn runs of punctuation into single spaces. */
export function norm(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "")
    .toLocaleLowerCase("id")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * Same as `norm` but without spaces. Identifiers such as a GS1 payload
 * (`(90)NA1121…`) compare equal whether or not the user types the separators.
 */
export function compact(value: string): string {
  return norm(value).replace(/ /g, "");
}

/** Normalised text plus its words, so the index is built in a single pass. */
export function analyze(value: string): { norm: string; words: string[] } {
  const normalized = norm(value);
  return {
    norm: normalized,
    words: normalized === "" ? [] : normalized.split(" "),
  };
}
