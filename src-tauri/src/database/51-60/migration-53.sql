-- ============================================================================
-- migration-53   Categories, and the many-to-many link to products.
-- ============================================================================
-- Two tables, because a product belongs to zero or more categories and a
-- category holds zero or more products:
--
--   categories         one row per category — a name and the sync trio.
--   product_category   one row per (product, category) pair.
--
-- Both are catalogue rows in the **product** group: they are meant to travel as
-- ordinary LWW rows next to `products`, `listings` and `properties` (§8.7),
-- rather than as a group of their own. A ninth group would buy nothing — the
-- catalogue is already one bookmark over independently merged rows, and a
-- second bookmark would only add a way for a product and its category to be
-- half-arrived, with §7.2's dangling references on top. Nothing here is wired
-- into the wire dictionaries yet (`src/services/sync/schema.ts`); until the
-- server's product group knows the two entity names, a frame for either is
-- `unknown entity` (§2.9), so both sides have to learn them together.
--
-- ## Why `product_category` carries an id of its own
--
-- The obvious key is the pair itself — `PRIMARY KEY (product_id, category_id)` —
-- and it is the wrong one for this database:
--
--   * The v2 wire keys a row by exactly one `row_id`, and merges per row on that
--     row's own clock (§2.1, §5.2). A composite key has no single value to put
--     in that field.
--   * A link must be able to disappear and come back. Un-ticking a category and
--     re-ticking it is a delete and an insert in the UI; the merge is per-row
--     LWW, so the second tick is a *different* row with a *new* id and the first
--     one stays behind as a tombstone (§6). A composite key has one row's worth
--     of identity for two row lifetimes.
--   * Two devices may create the same link concurrently. With unique ids the
--     pair arrives twice and the unique index below keeps the second out; the
--     loser is an orphan tombstone, never a category shown twice on a product.
--
-- ## Foreign keys
--
-- Both references are hard FKs to rows in the same group, exactly like
-- `listings.product_id` and `properties.product_id` (migration-43): the merge
-- applies one page's entities in dependency order, parent before child (§7.1),
-- so a page carrying both lands in the right order. A link that arrives in an
-- earlier page than its product or category is the known §7.4 caveat and is
-- handled exactly as it is for the other product children — the page transaction
-- is the one place that may defer the check. Nothing here changes that story.
--
-- `ON DELETE CASCADE` is local hygiene, not sync behaviour: a *synced* row is
-- never hard-deleted, it gets `*_deleted_at` (§6). The cascade only fires for
-- rows that were never synced or for an explicit local purge.
--
-- ## What is deliberately not here
--
--   * No nesting (`parent_category_id`). A tree is a different feature; adding
--     the column later is a new migration, not a rewrite of this one.
--   * No colour, icon, sort order or description. A category is a name today,
--     and each of those is one nullable column away.
--   * No `CHECK` on the name, matching `products.product_name` and
--     `product_names.product_name_value`: the app trims and refuses an empty
--     name, and a DB check would mean nothing until the wire carries the same
--     rule on the server.
-- ============================================================================

PRAGMA foreign_keys = OFF;      -- no-op under sqlx; kept so the file also runs in the CLI
PRAGMA busy_timeout = 30000;


-- ----------------------------------------------------------------------------
-- 1. `categories` — the parent.
--    Syncable mutable row: the full trio, like `listings` and `properties`.
-- ----------------------------------------------------------------------------
CREATE TABLE categories (
  category_id         TEXT PRIMARY KEY,
  category_name       TEXT NOT NULL,
  category_updated_at INTEGER NOT NULL,
  category_sync_at    INTEGER,
  category_deleted_at INTEGER
) STRICT;

-- One live category per name. NOCASE for the reason `listing_code_unique` is
-- NOCASE: the UI treats "Minuman" and "minuman" as the same label, so the second
-- one is a duplicate the user cannot see, not a distinct category. Comparison is
-- exact otherwise — trim and normalise whitespace in app code before insert.
-- Partial-on-live so a deleted category frees its name for reuse.
--
-- This index also serves the catalogue's own list query
-- (`WHERE category_deleted_at IS NULL ORDER BY category_name COLLATE NOCASE`),
-- so the list needs no second index.
CREATE UNIQUE INDEX category_name_unique ON categories (category_name COLLATE NOCASE)
  WHERE category_deleted_at IS NULL;


-- ----------------------------------------------------------------------------
-- 2. `product_category` — the link.
-- ----------------------------------------------------------------------------
CREATE TABLE product_category (
  product_category_id         TEXT PRIMARY KEY,
  product_id                  TEXT NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
  category_id                 TEXT NOT NULL REFERENCES categories(category_id) ON DELETE CASCADE,
  product_category_updated_at INTEGER NOT NULL,
  product_category_sync_at    INTEGER,
  product_category_deleted_at INTEGER
) STRICT;

-- At most one *live* link per pair: two devices ticking the same box, or one
-- device ticking it twice, must not put the same category on a product twice.
-- The partial predicate still lets a soft-deleted link be re-created (a re-tick
-- is a new row with a new id — see the header) while refusing a live duplicate.
CREATE UNIQUE INDEX product_category_pair_unique
  ON product_category (product_id, category_id) WHERE product_category_deleted_at IS NULL;

-- The pair index above already answers "the categories of this product" (its
-- leading column is `product_id`). This one answers the other direction — "the
-- products in this category", which is the whole of the category screen's query
-- — and backs the cascade from `categories`.
CREATE INDEX product_category_category_idx ON product_category (category_id);


PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = 30;
