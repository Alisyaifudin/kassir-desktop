import type { Listing } from "~/services/listing";
import type { DraftListing } from "~/services/transaction";

/** One reason a line's code is suspect; `productIds` are catalog links. */
export type CodeIssueMessage = { text: string; productIds?: string[] };

/** A hard (`error`) issue blocks Bayar; a `warning` (a QR collision) does not. */
export type CodeIssue = { tone: "warning" | "error"; messages: CodeIssueMessage[] };

/** The inline problems a single listing card can show. */
export type LineIssue = {
  code?: CodeIssue;
  /** A hand-entered line with no name. */
  name?: boolean;
  /** A hand-entered line whose unit is not a positive integer. */
  unit?: boolean;
};

function normalized(code: string): string {
  return code.trim().toLowerCase();
}

/**
 * Find the code/name/unit problems the listing grid shows under its cells.
 *
 * Only hand-entered lines (`listingId == null`) create catalog rows at submit,
 * so only they are checked. A code colliding with another new line is always
 * hard; a code colliding with an existing **barcode** is hard, while one
 * colliding with an existing **QR** is a warning (the new row is a barcode, and
 * the unique index allows the pair). Comparison is case-insensitive because a
 * shopkeeper does not think `ABC` and `abc` are different products.
 *
 * `lines` must be in display order (newest first), which is also the order the
 * card numbers use.
 */
export function findLineIssues(
  lines: readonly DraftListing[],
  catalog: readonly Listing[],
): Map<string, LineIssue> {
  const issues = new Map<string, LineIssue>();

  const catalogByCode = new Map<string, Listing[]>();
  for (const listing of catalog) {
    if (listing.code === null || listing.code.trim() === "") continue;
    const key = normalized(listing.code);
    const list = catalogByCode.get(key) ?? [];
    list.push(listing);
    catalogByCode.set(key, list);
  }

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
      const hasBarcode = matches.some((match) => match.codeKind !== "qr");
      if (hasBarcode) tone = "error";
      const names = matches.map((match) => match.name).join(", ");
      messages.push({
        text: hasBarcode
          ? `Kode sudah dipakai oleh ${names}`
          : `Kode juga dipakai oleh ${names} (QR)`,
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
    if (current.name === true || current.unit === true) issues.set(line.id, current);
  }

  return issues;
}

/** Whether any shown issue must stop the sale. */
export function hasHardIssue(issues: Map<string, LineIssue>): boolean {
  for (const issue of issues.values()) {
    if (issue.name === true || issue.unit === true || issue.code?.tone === "error") return true;
  }
  return false;
}
