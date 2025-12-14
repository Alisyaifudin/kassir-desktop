ALTER TABLE others
RENAME TO additionals;

CREATE TABLE discounts (
  id INTEGER PRIMARY KEY,
  record_item_id INTEGER NOT NULL REFERENCES record_items(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('percent', 'number')) DEFAULT 'percent',
  value REAL NOT NULL
) STRICT;

INSERT INTO discounts (record_item_id, kind, value)
SELECT  
  id AS record_item_id,
  disc_type AS kind,
  disc_val AS value
FROM record_items
WHERE disc_val > 0;

ALTER TABLE record_items
DROP COLUMN disc_type;

ALTER TABLE record_items
DROP COLUMN disc_val;

ALTER TABLE cashiers 
ADD COLUMN role TEXT NOT NULL CHECK (role IN ('user', 'admin')) DEFAULT 'user';

UPDATE cashiers SET role = 'admin';