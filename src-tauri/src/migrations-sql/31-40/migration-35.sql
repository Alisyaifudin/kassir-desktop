PRAGMA foreign_keys = 0;

ALTER TABLE additionals RENAME TO additionals_old;

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
    saved    INTEGER  NOT NULL
                      CHECK (saved IN (0, 1) ) 
                      DEFAULT 0
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
