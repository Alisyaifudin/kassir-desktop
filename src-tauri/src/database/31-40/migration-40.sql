CREATE TABLE product_event_enum (
  v TEXT PRIMARY KEY
) STRICT;

INSERT INTO product_event_enum (v) VALUES ('manual'), ('inc'), ('dec');

CREATE TABLE product_events (
  id         TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  sync_at    INTEGER,
  type       TEXT NOT NULL REFERENCES product_event_enum(v),
  value      INTEGER NOT NULL,
  product_id TEXT NOT NULL REFERENCES products(product_id) ON DELETE CASCADE
) STRICT;

INSERT INTO product_events (
  id, created_at, sync_at, type, value, product_id
)
SELECT 
  product_id, CAST(unixepoch('subsec') * 1000 AS INTEGER), null, 'manual', product_stock, product_id
FROM products;

