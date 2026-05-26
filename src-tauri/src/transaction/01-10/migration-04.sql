ALTER TABLE extras RENAME TO extras_old;

CREATE TABLE extras (
  extra_order INTEGER PRIMARY KEY,
  extra_id TEXT NOT NULL UNIQUE,
  tab INTEGER NOT NULL REFERENCES transactions(tab) ON DELETE CASCADE,
  db_extra_id INTEGER,
  extra_kind TEXT NOT NULL CHECK (extra_kind IN ('percent', 'number')),
  extra_name TEXT NOT NULL,
  extra_value REAL NOT NULL,
  extra_is_saved INTEGER NOT NULL CHECK (extra_is_saved IN (0, 1))
) STRICT;

INSERT INTO extras (
  extra_id, tab, db_extra_id, extra_kind, extra_name, extra_value, extra_is_saved
)
SELECT 
  extra_id, tab, db_extra_id, extra_kind, extra_name, extra_value, extra_is_saved
FROM extras_old;

DROP TABLE extras_old;