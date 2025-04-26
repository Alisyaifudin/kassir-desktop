PRAGMA foreign_keys = OFF;

CREATE INDEX idx_records_variant ON records(mode);

ALTER TABLE taxes RENAME TO taxes_old;
CREATE TABLE taxes (
  id INTEGER PRIMARY KEY,
  timestamp INTEGER NOT NULL REFERENCES records(timestamp) ON DELETE CASCADE,
  name TEXT NOT NULL,
  value INTEGER NOT NULL -- in percentage
) STRICT;

INSERT INTO taxes
SELECT * FROM taxes_old;

DROP TABLE taxes_old;


PRAGMA foreign_keys = ON;