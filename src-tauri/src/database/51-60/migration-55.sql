-- ============================================================================
-- migration-55   The category tables become mergeable: no constraint a pull
--                page cannot satisfy.
-- ============================================================================
-- `migration-53` added `categories` and `product_category` with three
-- constraints that the wire can legitimately violate. Each one turns a legal
-- server frame into a failed page commit, and a failed page is not retried into
-- a different outcome: the bookmark does not move, the same rows come back, and
-- that group is stuck for good. `SYNC-V2.md` §7 and the product-group contract
-- ask the client to store such a row rather than fail, so the constraints go.
--
-- ## 1. `product_category.category_id` loses its foreign key
--
-- A category is a group-wide row with no `product_id`, so it is **outside** the
-- one-product scope (`docs/SYNC-V2-ONE-PRODUCT.md` §1.1): a scoped push skips it
-- by design, while the link that names it *is* in scope. A till that ticks a
-- category it created locally and presses "Sinkronkan produk" therefore lands a
-- link on the server whose category has never been pushed. Every other device
-- that pulls that link before a full cycle supplies the category gets a row it
-- cannot store — and `PRAGMA defer_foreign_keys = ON` does not help, because the
-- deferred check runs at COMMIT of *this* page and the category is not in it.
--
-- The same frame is legal in the full cycle too: §7.2 lists
-- `product_category.category_id` as a reference that may arrive first. §1.1
-- spells out what the client does with it — "store it, keep it, do not draw it"
-- — which a hard key makes impossible.
--
-- `product_category.product_id` keeps its key. The invariant other product
-- children rely on holds for it: a push sends the product before its children
-- (§7.1), so the parent's `seq` is never larger than the link's, and the scoped
-- snapshot carries the product row first. The key is local hygiene for the
-- cascade, not a sync rule.
--
-- ## 2. `product_category_pair_unique` goes
--
-- Two tills may tick the same box for the same product before either syncs. The
-- server keeps both rows — `kassir-server` migration `0019` states that plainly:
-- the second one is a legal insert there, and "the client's existing merge keeps
-- both". Here the second insert instead aborted the page, because the merge
-- upsert targets the primary key (`ON CONFLICT(product_category_id)`) and a
-- different unique index still raises.
--
-- Keeping both rows is harmless to the product form: it lists categories by
-- `category_id`, so one category is still drawn once, and `ProductService.set.
-- categories` compares *sets* — a save that leaves the category ticked leaves
-- both links alone, and un-ticking soft-deletes both.
--
-- ## 3. `categories.category_name_unique` goes
--
-- Same story, same server decision ("Same reasoning for the one-live-row-per-
-- name rule: `categories` has no unique index here"): two devices may each
-- create "Minuman" offline, and both rows are legal. The unique index made the
-- loser fail the page on both devices — permanently, since each refetches the
-- same rows.
--
-- The one-live-row-per-name rule is a **UI rule**, not a wire rule, so it moves
-- to `CategoryService`: `add` and `set.name` ask first and refuse a
-- case-insensitive duplicate with `CategoryDuplicateName`, exactly as the form
-- already expects. A duplicate that arrives from another device is kept and
-- shown — both rows are real, and dropping or tombstoning one would lose a
-- category another till is filing products under.
--
-- ## Why a rebuild, and what it costs
--
-- SQLite cannot drop a column constraint or a foreign key in place, so
-- `product_category` is copied into the shape it should have had. The copy
-- carries `product_category_sync_at` verbatim: no row becomes dirty, and no
-- device re-uploads its links because of this migration. Rows cannot conflict
-- while copying — the unique index that is going away guaranteed the copy is
-- clean.
--
-- `categories` needs no rebuild: dropping a unique *index* is an ordinary
-- `DROP INDEX`. Both tables keep a plain index over the column that used to be
-- unique, so the list queries and the new duplicate check stay a seek.
-- ============================================================================

PRAGMA foreign_keys = OFF;      -- no-op under sqlx; kept so the file also runs in the CLI
PRAGMA busy_timeout = 30000;


-- ----------------------------------------------------------------------------
-- 1. `categories` — one live row per name becomes a rule of the service.
--    The plain index answers the list's `ORDER BY category_name COLLATE NOCASE`
--    and the service's case-insensitive lookup with the same seek the unique one
--    used to.
-- ----------------------------------------------------------------------------
DROP INDEX category_name_unique;
CREATE INDEX category_name_idx ON categories (category_name COLLATE NOCASE);


-- ----------------------------------------------------------------------------
-- 2. `product_category` — no key to `categories`, no one-live-link-per-pair.
-- ----------------------------------------------------------------------------
CREATE TABLE product_category_new (
  product_category_id         TEXT PRIMARY KEY,
  product_id                  TEXT NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
  -- No FK: this row may reach the device before its category (§7.2), and the
  -- scoped route never carries categories at all (migration-53's §1).
  category_id                 TEXT NOT NULL,
  product_category_updated_at INTEGER NOT NULL,
  product_category_sync_at    INTEGER,
  product_category_deleted_at INTEGER
) STRICT;

INSERT INTO product_category_new (
  product_category_id, product_id, category_id, product_category_updated_at,
  product_category_sync_at, product_category_deleted_at
)
SELECT
  product_category_id, product_id, category_id, product_category_updated_at,
  product_category_sync_at, product_category_deleted_at
FROM product_category;

DROP TABLE product_category;
ALTER TABLE product_category_new RENAME TO product_category;

-- The old pair index had `product_id` leading, so it answered "the categories of
-- this product"; with it gone, that direction needs its own index.
CREATE INDEX product_category_product_idx  ON product_category (product_id);
CREATE INDEX product_category_category_idx ON product_category (category_id);


PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = 30;
