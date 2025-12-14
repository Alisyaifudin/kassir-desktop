ALTER TABLE money RENAME TO money_old;

CREATE TABLE money (
  timestamp INTEGER PRIMARY KEY,
  value REAL NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('debt', 'saving')) DEFAULT 'saving'
) STRICT;

INSERT INTO money
SELECT 
  timestamp,
  value,
  'saving' AS kind
FROM money_old;

DROP TABLE money_old;
