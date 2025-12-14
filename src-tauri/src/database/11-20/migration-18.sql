CREATE TABLE others (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  timestamp INTEGER NOT NULL REFERENCES records(timestamp) ON DELETE CASCADE,
  value REAL NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('percent', 'number')) DEFAULT 'percent'
) STRICT;

INSERT INTO others 
SELECT  
  id,
  name,
  timestamp,
  percent AS value,
  'percent' AS kind
FROM taxes;

DROP TABLE taxes;