PRAGMA foreign_keys = 0;

ALTER TABLE additionals RENAME TO additionals_old;

CREATE TABLE additional_items(
    id        INTEGER PRIMARY KEY,
    name      TEXT    UNIQUE NOT NULL,
    kind      TEXT    NOT NULL
                      REFERENCES value_kind_enum (v) 
                      DEFAULT 'percent',
    value     REAL    NOT NULL
) STRICT;

CREATE TABLE additionals (
    id        INTEGER PRIMARY KEY,
    name      TEXT    NOT NULL,
    timestamp INTEGER NOT NULL
                      REFERENCES records (timestamp) ON DELETE CASCADE
                                                     ON UPDATE CASCADE,
    kind      TEXT    NOT NULL
                      REFERENCES value_kind_enum (v) 
                      DEFAULT 'percent',
    value     REAL    NOT NULL,
    item_id   INTEGER REFERENCES additional_items(id) ON DELETE SET NULL
                                                      ON UPDATE CASCADE
)
STRICT;

INSERT INTO additionals (
    id,
    name, 
    timestamp,
    kind,
    value
)
SELECT * FROM additionals_old;

DROP TABLE additionals_old;

PRAGMA foreign_keys = 1;
