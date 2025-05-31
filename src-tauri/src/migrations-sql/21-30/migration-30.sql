ALTER TABLE money RENAME TO money_old;

CREATE TABLE money_type (
  kind TEXT PRIMARY KEY
) STRICT;

INSERT INTO money_type VALUES ('saving'), ('debt'), ('diff');

CREATE TABLE money (
  timestamp INTEGER PRIMARY KEY,
  value REAL NOT NULL,
  kind TEXT NOT NULL REFERENCES money_type(kind)
) STRICT;

INSERT INTO money
SELECT 
  timestamp,
  value,
  kind
FROM money_old;

DROP TABLE money_old;
