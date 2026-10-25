/**
 * What a committed line teaches the catalogue, as pure statement builders.
 *
 * A line's name and price are snapshots on the record (`record_listing_name`,
 * `record_listing_price`) — that is what makes a reprint show what was actually
 * rung up. But two of them are also the operator's latest word on the goods, and
 * a grid that lets them be edited has to mean it: otherwise the edit dies with
 * the record and the next trip to the till rings up the old name again.
 *
 * What is written back, and why only this much:
 *
 *  * **name** — both directions. "Aqua 240ml" is the same goods coming in as
 *    going out, so a purchase is as good a place to fix a mis-typed listing as a
 *    sale. When the product carries exactly **one** live listing, the product's
 *    own name follows it: with a single listing, the operator renaming the line is
 *    renaming the thing, not one of its variants.
 *  * **price** — sales only. On a purchase the line price is what the supplier
 *    charged, so writing it into `listing_price` would drop the shelf price to the
 *    buying price. It is also skipped when the line's unit was edited, since a
 *    price is only "the price" in the unit it was quoted in.
 *  * **code and unit** — never. A code is unique across live listings and the
 *    till already refuses a duplicate, and unit is what a quantity is counted in:
 *    buying a dozen where you usually buy one piece is not a rename.
 *
 * Everything here is a no-op when nothing changed, so a line rung up exactly as
 * the catalogue has it writes no catalogue rows at all.
 */
import type { RecordMode } from "..";
import type { Statement } from "../../db";

/** The catalogue row a committed line points at, plus how many siblings it has. */
export type CatalogueLink = {
  listingId: string;
  productId: string;
  listingName: string;
  listingPrice: number;
  listingUnit: number;
  /** Live listings of the same product, this one included. */
  siblings: number;
};

/** The parts of a committed line the catalogue learns from. */
export type CatalogueLine = {
  name: string;
  price: number;
  unit: number;
};

export function catalogueStatements(
  link: CatalogueLink,
  line: CatalogueLine,
  mode: RecordMode,
  now: number,
): Statement[] {
  const statements: Statement[] = [];

  const name = line.name.trim();
  const renamed = name !== "" && name !== link.listingName;
  if (renamed) {
    statements.push({
      sql: `UPDATE listings SET
          listing_name = $1, listing_updated_at = $2, listing_sync_at = NULL
        WHERE listing_id = $3`,
      bindings: [name, now, link.listingId],
    });
    // The product's name is the operator's word for the goods only while it has
    // one listing to be the word for; a variant rename leaves it alone.
    statements.push(
      link.siblings === 1
        ? {
            sql: `UPDATE products SET
                product_name = $1, product_updated_at = $2, product_sync_at = NULL
              WHERE product_id = $3`,
            bindings: [name, now, link.productId],
          }
        : {
            sql: `UPDATE products SET
                product_updated_at = $1, product_sync_at = NULL
              WHERE product_id = $2`,
            bindings: [now, link.productId],
          },
    );
  }

  const repriced =
    mode === "incoming" &&
    line.unit === link.listingUnit &&
    Number.isFinite(line.price) &&
    line.price >= 0 &&
    line.price !== link.listingPrice;
  if (repriced) {
    statements.push({
      sql: `UPDATE listings SET
          listing_price = $1, listing_updated_at = $2, listing_sync_at = NULL
        WHERE listing_id = $3`,
      bindings: [line.price, now, link.listingId],
    });
    // A renamed listing already touched the product; a repriced one has to.
    if (!renamed) {
      statements.push({
        sql: `UPDATE products SET
            product_updated_at = $1, product_sync_at = NULL
          WHERE product_id = $2`,
        bindings: [now, link.productId],
      });
    }
  }

  return statements;
}
