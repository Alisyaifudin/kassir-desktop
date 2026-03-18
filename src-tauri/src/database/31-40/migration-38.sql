ALTER TABLE money RENAME TO money_old;

CREATE TABLE money_kind (
  money_kind_id   INTEGER PRIMARY KEY,
  money_kind_name TEXT NOT NULL,
  money_kind_type TEXT NOT NULL DEFAULT 'absolute' CHECK (money_kind_type IN ('absolute', 'change'))
) STRICT;

INSERT INTO money_kind (money_kind_id, money_kind_name, money_kind_type) 
VALUES (0, 'Simpanan', 'absolute'), (1, 'Utang', 'change'), (2, 'Selisih', 'absolute');

CREATE TABLE money (
  timestamp     INTEGER PRIMARY KEY,
  money_value   REAL NOT NULL,
  money_kind_id INTEGER NOT NULL REFERENCES money_kind(money_kind_id) ON DELETE CASCADE,
  money_note    TEXT NOT NULL DEFAULT ('')
) STRICT;

INSERT INTO money (
  timestamp, money_value, money_kind_id, money_note
)
SELECT 
  timestamp, money_value, 0, note
FROM money_old WHERE money_kind = 'saving';

INSERT INTO money (
  timestamp, money_value, money_kind_id, money_note
)
SELECT 
  timestamp, money_value, 1, note
FROM money_old WHERE money_kind = 'debt';

INSERT INTO money (
  timestamp, money_value, money_kind_id, money_note
)
SELECT 
  timestamp, money_value, 2, note
FROM money_old WHERE money_kind = 'diff';

DROP TABLE money_old;
DROP TABLE money_enum;