-- ============================================================================
-- migration-54   Give the sales back the cost they were charged.
-- ============================================================================
-- Every gross-margin figure in the app — the Profit page, a product's own
-- performance, the record's Modal column on a purchase — reads
-- `record_listings.record_listing_capital`. For the majority of this shop's
-- sales that number is not a cost: it is the price the line was sold for.
--
-- Why
-- ---
-- The v1 app kept two columns per line: `record_product_capital` (what the goods
-- cost) and `record_product_capital_raw`. From about 2026-01 the second one was
-- written as the selling price; the first stayed right. `migration-44` copied
-- `_raw` into both `record_listings.record_listing_capital` and the journal it
-- rebuilt from the records, so the new schema inherited the wrong column — and
-- because those events are what the cost lots were built from, every sale the
-- till rang up afterwards took that same price as its cost. On this database:
--
--   152,174 sale lines, 105,299 of them with capital >= price
--   98% of 2026 revenue sits on lines whose "cost" is exactly their price
--   the few hundred lines that kept a real cost read a 13.8% margin —
--   v1's untouched `record_product_capital` implies 13.5% for the same weeks
--
-- The old tables are gone (`migration-48` dropped the parked `_old` copies), so
-- `_raw` cannot be swapped back for its sibling here. What is still in the
-- database is the purchase side, and a purchase line's capital *is* a cost: it
-- is the number the operator paid and the number `allocateCapital` split across
-- the goods. So the repair reconstructs a sale line's cost from the last
-- purchase of the same product at or before that sale — the same lot a FIFO
-- drain would have taken it from.
--
-- What it does
-- ------------
--   1. `_cost_repair` collects a replacement capital per polluted sale line: an
--      `incoming` line whose stored capital is at or above its own price. A
--      genuine loss (cost above price by accident of trade) is indistinguishable
--      from the copy, so it is repaired too; a line whose product was never
--      purchased is left alone and the Profit page estimates it instead.
--   2. Each line's capital is replaced, and so is the journal event the line
--      points at — `product_events.product_event_capital` is the same snapshot
--      for the same movement, and leaving it wrong would re-pollute the lot the
--      next sale drains from.
--   3. `stocks.stock_capital` is re-folded from the journal with the rule the
--      sync projection already uses (§8.7): the newest event that carries a
--      non-zero capital. That is what makes the *next* sale inherit a real cost
--      instead of the price again.
--
-- Idempotent: after the repair no line has capital >= price (the replacement is
-- a purchase cost, and a purchase cost is what it is), so a second run finds an
-- empty `_cost_repair` and writes nothing.
-- ============================================================================

CREATE TABLE _cost_repair (
  record_listing_id TEXT PRIMARY KEY,
  capital           REAL NOT NULL
);

-- 1. The replacement capital, from the product's last purchase before the sale.
INSERT INTO _cost_repair (record_listing_id, capital)
SELECT id, capital FROM (
  SELECT
    l.record_listing_id AS id,
    (
      SELECT p.record_listing_capital
      FROM record_listings p
      JOIN records pr ON pr.record_id = p.record_id
      WHERE p.product_id = l.product_id
        AND pr.record_mode = 'outcoming'
        AND pr.record_deleted_at IS NULL
        AND p.record_listing_capital > 0
        AND COALESCE(pr.record_paid_at, pr.record_credit_at, pr.record_created_at)
            <= COALESCE(r.record_paid_at, r.record_credit_at, r.record_created_at)
      ORDER BY COALESCE(pr.record_paid_at, pr.record_credit_at, pr.record_created_at) DESC,
               p.record_listing_id DESC
      LIMIT 1
    ) AS capital
  FROM record_listings l
  JOIN records r ON r.record_id = l.record_id
  WHERE r.record_mode = 'incoming'
    AND l.product_id IS NOT NULL
    -- A line with no cost at all is not claiming to have one: the page treats it
    -- as "not recorded" and estimates it. Only the copy is repaired here.
    AND l.record_listing_capital > 0
    AND l.record_listing_capital >= l.record_listing_price
) WHERE capital IS NOT NULL;

-- 2a. The journal event behind each repaired line. Taken before 2b only for
--     readability — the capital comes from `_cost_repair`, not from the line.
UPDATE product_events
SET product_event_capital = (
  SELECT c.capital
  FROM _cost_repair c
  JOIN record_listings l ON l.record_listing_id = c.record_listing_id
  WHERE l.product_event_id = product_events.product_event_id
  LIMIT 1
)
WHERE product_event_id IN (
  SELECT l.product_event_id
  FROM _cost_repair c
  JOIN record_listings l ON l.record_listing_id = c.record_listing_id
  WHERE l.product_event_id IS NOT NULL
);

-- 2b. The lines themselves.
UPDATE record_listings
SET record_listing_capital = (
  SELECT c.capital FROM _cost_repair c
  WHERE c.record_listing_id = record_listings.record_listing_id
)
WHERE record_listing_id IN (SELECT record_listing_id FROM _cost_repair);

-- 3. The lots, folded back from the journal. Same rule as `rebuildStockStatements`
--    in `src/services/sync/sql.ts`: the newest event with a non-zero capital is
--    the lot's current cost, and `0` means "nothing to say", never "free".
UPDATE stocks
SET stock_capital = (
  SELECT c.product_event_capital
  FROM product_events c
  WHERE c.stock_id = stocks.stock_id
    AND c.product_event_capital <> 0
  ORDER BY c.product_event_created_at DESC, c.product_event_id DESC
  LIMIT 1
)
WHERE stock_id IN (
  SELECT stock_id FROM product_events WHERE product_event_capital <> 0
);

DROP TABLE _cost_repair;
