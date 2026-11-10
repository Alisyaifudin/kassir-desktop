import { analyze } from "./normalize";
import { gradeText } from "./quality";
import {
  createIndexCache,
  createMatcher,
  parseQuery,
  rankHits,
  type Hit,
  type Index,
  type Query,
  type Ranked,
} from "./index-cache";
import type { Combo } from "~/services/combo";
import type { Extra } from "~/services/extra";
import type { Listing } from "~/services/listing";

/**
 * The combo index: templates searched by the same bar as the goods, scored by the
 * same ladder (`./index-cache`) and on the same `0..9999` scale, so the two units
 * can answer one list instead of two stitched together.
 *
 * A combo is never the thing being sold — it is a shortcut that expands into
 * listings — so its own name ranks just *below* a listing's own name (`0.9`
 * against `0.92`). That keeps an exact listing name in front on a tie, while
 * still putting a perfectly typed combo name above every partial listing match:
 * `prefix` on a listing is `0.8 × 0.92`, and the fuzzy tiers are far lower.
 *
 * That gap is the whole point. Typing `nasi` used to append combos after the
 * listing answers, and `nasi` is a subsequence of `hanasui`, so a combo called
 * `Nasi` arrived after a screenful of cosmetic guesses. The combo's own name
 * matched exactly; it has to outrank them.
 *
 * A component's names sit under the template's own: typing `scora` should reach
 * the goods first, then the bundles that contain them.
 */
export const COMBO_FIELD = {
  /** The template's own name. */
  name: 0.9,
  /** A component's listing name — how the operator recognises what is inside. */
  component: 0.72,
  /** The component's parent product name, which every listing under it inherits. */
  product: 0.68,
  /** A name the operator recorded for the component's product. */
  alt: 0.66,
} as const;

/**
 * What matching needs beyond the combos themselves: a component is named by the
 * live catalogue, and a template is only offerable while its Extras still exist.
 * Both live in other services, so they are threaded in as index context — the
 * same seam the product index uses for category names.
 */
export type ComboContext = {
  listings: Listing[];
  extras: Extra[];
};

/** One searchable text field, with the weight its tier is scaled by. */
type Field = { norm: string; words: string[]; weight: number };

type Entry = {
  id: string;
  /** `false` for a withdrawn template, or one that can no longer be expanded. */
  eligible: boolean;
  fields: Field[];
};

type ComboIndex = Index<Entry>;

function field(value: string, weight: number): Field {
  const text = analyze(value);
  return { norm: text.norm, words: text.words, weight };
}

function listingMap(listings: Listing[]): Map<string, Listing> {
  return new Map(listings.map((listing) => [listing.id, listing]));
}

function componentFields(combo: Combo, byId: Map<string, Listing>): Field[] {
  const fields: Field[] = [];
  for (const component of combo.components) {
    const listing = byId.get(component.listingId);
    if (listing === undefined) continue;
    fields.push(field(listing.name, COMBO_FIELD.component));
    fields.push(field(listing.productName, COMBO_FIELD.product));
    for (const alt of listing.altNames) fields.push(field(alt, COMBO_FIELD.alt));
  }
  return fields;
}

function toEntry(combo: Combo, context: ComboContext): Entry {
  const byId = listingMap(context.listings);
  const extraIds = new Set(context.extras.map((extra) => extra.id));
  // Every component and every Extra is read now, not when the template was saved:
  // a combo that cannot fully expand is not something the till can offer, and
  // `useAddCombo` would refuse it a keystroke later.
  const expandable =
    combo.components.length > 0 &&
    combo.components.every((component) => byId.has(component.listingId)) &&
    combo.extras.every((extra) => extraIds.has(extra.extraId));
  return {
    id: combo.id,
    eligible: combo.active && expandable,
    fields: [field(combo.name, COMBO_FIELD.name), ...componentFields(combo, byId)],
  };
}

/**
 * The fields that affect matching — not the cover, the quantities or `updated_at`.
 *
 * Component names are spelled out here rather than referenced: renaming a listing
 * changes what its bundles answer to, and the catalogue arrives as a fresh array
 * on every read, so the context has to be folded into the signature instead of
 * compared by identity.
 */
function signatureOf(combos: Combo[], context: ComboContext): string {
  const byId = listingMap(context.listings);
  const parts: string[] = [];
  for (const combo of combos) {
    parts.push(combo.id, "\u0000", combo.name, "\u0000", combo.active ? "1" : "0", "\u0000");
    for (const component of combo.components) {
      const listing = byId.get(component.listingId);
      parts.push(
        component.listingId,
        "\u0001",
        listing === undefined ? "" : listing.name,
        "\u0001",
        listing === undefined ? "" : listing.productName,
        "\u0001",
        listing === undefined ? "" : listing.altNames.join("\u0003"),
        "\u0001",
      );
    }
    for (const extra of combo.extras) parts.push(extra.extraId, "\u0001");
    parts.push("\u0002");
  }
  // Which presets exist decides eligibility, and a deletion is invisible in the
  // combo rows themselves.
  parts.push(
    "\u0004",
    context.extras
      .map((extra) => extra.id)
      .sort()
      .join("\u0001"),
  );
  return parts.join("");
}

/** Nothing to match against: no component resolves, no preset exists. */
const EMPTY_CONTEXT: ComboContext = { listings: [], extras: [] };

const cache = createIndexCache<Combo, Entry, ComboContext>(
  (combos, context) => signatureOf(combos, context ?? EMPTY_CONTEXT),
  (combo, context) => toEntry(combo, context ?? EMPTY_CONTEXT),
);

/** Build a fresh index. Exported for tests; the app calls `getComboIndex`. */
export function buildComboIndex(combos: Combo[], context: ComboContext): ComboIndex {
  return cache.build(combos, context);
}

/** Rebuilds only when a name, a component or the set of presets changes. */
export function getComboIndex(combos: Combo[], context: ComboContext): ComboIndex {
  return cache.get(combos, context);
}

export function resetComboIndex(): void {
  cache.reset();
}

/** Score every expandable combo against `rawQuery`, highest first. */
export function searchCombos(index: ComboIndex, rawQuery: string): Hit[] {
  const query = parseQuery(rawQuery);
  if (query === null) return [];
  return rankHits(scoreCombos(index, query), query);
}

/**
 * Every combo that matches `query` at all, with the tie-break signals its winning
 * field earned. Split from `searchCombos` for the same reason as its listing
 * twin: a ranking experiment must never be able to change *which* combos match.
 */
export function scoreCombos(index: ComboIndex, query: Query): Ranked[] {
  const rows: Ranked[] = [];

  for (const entry of index.entries) {
    if (!entry.eligible) continue;
    const matcher = createMatcher(entry.id, query);
    for (const field of entry.fields) {
      matcher.offerText(
        gradeText(field.norm, field.words, query.norm, query.words, query.options),
        field.weight,
        field.norm,
        field.words,
      );
    }
    const row = matcher.result();
    if (row !== null) rows.push(row);
  }

  return rows;
}
