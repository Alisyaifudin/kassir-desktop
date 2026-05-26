ALTER TABLE discounts RENAME TO discounts_old;

CREATE TABLE discounts (
  disc_order INTEGER PRIMARY KEY, 
  disc_id TEXT NOT NULL UNIQUE,
  product_id TEXT NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
  disc_value REAL NOT NULL DEFAULT 0,
  disc_kind TEXT NOT NULL DEFAULT 'percent' CHECK (disc_kind IN ('percent', 'number', 'pcs'))
) STRICT;

INSERT INTO discounts (disc_id, product_id, disc_value, disc_kind)
SELECT disc_id, product_id, disc_value, disc_kind
FROM discounts_old;

DROP TABLE discounts_old;