ALTER TABLE taxes RENAME TO taxes_old;

CREATE TABLE taxes (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  timestamp INTEGER NOT NULL REFERENCES records(timestamp) ON DELETE CASCADE,
  percent REAL NOT NULL,
  value INTEGER NOT NULL
) STRICT;

INSERT INTO taxes
SELECT 
  taxes_old.id,
  taxes_old.name,
  taxes_old.timestamp,
  taxes_old.value AS percent,
  ROUND(records.total * taxes_old.value / 100) AS value
FROM taxes_old
JOIN records ON taxes_old.timestamp = records.timestamp;

DROP TABLE taxes_old;