-- ============================================================================
-- migration-56   The last three unique keys a pull page could not satisfy.
-- ============================================================================
-- `migration-43` gave three product children a partial unique index each:
--
--   listings     (listing_code COLLATE NOCASE)          where live
--   properties   (product_id, property_key)             where live
--   product_names(product_id, product_name_value)       where live
--
-- All three are rules of the *shop*, and all three are wrong as a constraint on
-- a synced table. Two tills that were offline at the same time may assign the
-- same barcode, add the same property key or record the same alias; the server
-- keeps both rows (it has no such index), and a pull page that carries the
-- second one has to store it — `SYNC-V2.md` §7.2, "a page must not fail because
-- another row lags". With the index in place the merge's upsert targets the
-- primary key only (`ON CONFLICT(<pk>) DO UPDATE`, `sql.ts`), so the second
-- insert raised `UNIQUE constraint failed`, the page's transaction rolled back,
-- the bookmark never moved, and the product group was stuck for good: the same
-- page comes back on every attempt.
--
-- This is exactly the failure `migration-55` removed from `categories` and
-- `product_category`; these are the three that were left, and the fix is the
-- same shape. Each index goes; each rule stays, asked by `ProductService`
-- before it writes a row (`listing.add/update`, `product.add`,
-- `property.add/update`, `productName.add/update`), which is where the operator
-- can act on the answer. A duplicate that arrives through the merge is stored,
-- not refused.
--
-- Each table keeps a plain index that still answers its lookups:
--
--   listing_code_idx        (listing_code)                  exact-match scan
--   property_product_idx    (product_id)                    the product's rows
--   product_name_product_idx / product_name_value_idx       per product, per alias
--
-- Nothing is rebuilt and no row is touched: unlike 55 there is no foreign key to
-- remove, and `*_sync_at` keeps whatever the device already owed.
-- ============================================================================

PRAGMA foreign_keys = OFF;      -- no-op under sqlx; kept so the file also runs in the CLI
PRAGMA busy_timeout = 30000;


-- One live listing per code becomes `ProductService`'s rule. A code another till
-- assigned is stored; the form refuses a code already on this device.
DROP INDEX listing_code_unique;


-- One live property per key per product becomes `ProductService`'s rule.
DROP INDEX property_product_key_unique;


-- One live alias per product becomes `ProductService`'s rule.
DROP INDEX product_name_product_value_unique;


PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = 30;
