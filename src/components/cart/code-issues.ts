import { discountsEatLine } from "~/lib/purchase";
import type { Listing } from "~/services/listing";
import type { DraftListing } from "~/services/transaction";

/** One reason a line's code is suspect; `productIds` are catalog links. */
type CodeIssueMessage = { text: string; productIds?: string[] };

/** A hard (`error`) issue blocks Bayar. Kept a union so a future soft
 *  (`warning`) issue does not have to change the shape. */
export type CodeIssue = { tone: "warning" | "error"; messages: CodeIssueMessage[] };

/** The inline problems a single listing card can show. */
export type LineIssue = {
  code?: CodeIssue;
  /** A hand-entered line with no name. */
  name?: boolean;
  /** A hand-entered line whose unit is not a positive integer. */
  unit?: boolean;
  /** A discount stack that takes the whole line: the sale would carry it free. */
  discount?: boolean;
};

function normalized(code: string): string {
  return code.trim().toLowerCase();
}

/** Case-folded code → the catalogue listings that carry it. */
type CatalogByCode = Map<string, Listing[]>;

let catalogCache: { catalog: readonly Listing[]; byCode: CatalogByCode } | null = null;

/**
 * The catalogue's code index. `listing.get.changes` hands out the same array
 * until the catalogue changes, so this is built once per catalogue instead of
 * once per cart keystroke — it used to be rebuilt on every edit inside a cell.
 */
function buildCatalogByCode(catalog: readonly Listing[]): CatalogByCode {
  if (catalogCache !== null && catalogCache.catalog === catalog) return catalogCache.byCode;
  const byCode: CatalogByCode = new Map();
  for (const listing of catalog) {
    if (listing.code === null || listing.code.trim() === "") continue;
    const key = normalized(listing.code);
    const list = byCode.get(key) ?? [];
    list.push(listing);
    byCode.set(key, list);
  }
  catalogCache = { catalog, byCode };
  return byCode;
}

/**
 * Find the code/name/unit problems the listing grid shows under its cells.
 *
 * Only hand-entered lines (`listingId == null`) create catalog rows at submit,
 * so only they are checked. Every code is unique across live listings, so a code
 * colliding with another new line or with an existing catalogue listing is
 * always hard — the unique index would reject the second row at submit anyway,
 * and it compares case-insensitively, which is also what a shopkeeper expects
 * (`ABC` and `abc` are the same barcode).
 *
 * `lines` must be in display order (newest first), which is also the order the
 * card numbers use.
 */
export function findLineIssues(
  lines: readonly DraftListing[],
  catalog: readonly Listing[],
  catalogByCode: CatalogByCode = buildCatalogByCode(catalog),
): Map<string, LineIssue> {
  const issues = new Map<string, LineIssue>();

  const manual = lines
    .map((line, index) => ({ line, number: lines.length - index }))
    .filter(
      ({ line }) => line.listingId == null && line.code.trim() !== "" && line.qty > 0,
    );

  const byCode = new Map<string, { number: number; name: string }[]>();
  for (const entry of manual) {
    const key = normalized(entry.line.code);
    const list = byCode.get(key) ?? [];
    list.push({ number: entry.number, name: entry.line.name });
    byCode.set(key, list);
  }

  for (const entry of manual) {
    const key = normalized(entry.line.code);
    const others = (byCode.get(key) ?? []).filter((other) => other.number !== entry.number);
    const matches = catalogByCode.get(key) ?? [];
    if (others.length === 0 && matches.length === 0) continue;

    const messages: CodeIssueMessage[] = [];
    let tone: CodeIssue["tone"] = "warning";

    if (others.length > 0) {
      tone = "error";
      messages.push({
        text: `Kode sama dengan listing #${others.map((other) => other.number).join(", #")}`,
      });
    }
    if (matches.length > 0) {
      tone = "error";
      const names = matches.map((match) => match.name).join(", ");
      messages.push({
        text: `Kode sudah dipakai oleh ${names}`,
        productIds: matches.map((match) => match.productId),
      });
    }

    const current = issues.get(entry.line.id) ?? {};
    current.code = { tone, messages };
    issues.set(entry.line.id, current);
  }

  for (const line of lines) {
    const current = issues.get(line.id) ?? {};
    if (line.listingId == null && line.qty > 0) {
      if (line.name.trim() === "") current.name = true;
      if (!Number.isInteger(line.unit) || line.unit < 1) current.unit = true;
    }
    // A mistyped discount is the expected mistake on a POS; show it on the line
    // the cart already highlights, rather than letting Bayar discover it.
    if (line.qty > 0 && discountsEatLine(line)) current.discount = true;
    if (
      current.name === true ||
      current.unit === true ||
      current.discount === true
    ) {
      issues.set(line.id, current);
    }
  }

  return issues;
}

/** Whether any shown issue must stop the sale. */
export function hasHardIssue(issues: Map<string, LineIssue>): boolean {
  for (const issue of issues.values()) {
    if (
      issue.name === true ||
      issue.unit === true ||
      issue.discount === true ||
      issue.code?.tone === "error"
    ) {
      return true;
    }
  }
  return false;
}
