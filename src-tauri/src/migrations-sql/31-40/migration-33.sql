PRAGMA foreign_keys = 0;

CREATE TABLE temp_table AS SELECT * FROM records;

DROP TABLE records;

CREATE TABLE records (
    timestamp INTEGER PRIMARY KEY,
    paid_at   INTEGER NOT NULL,
    disc_val  REAL    NOT NULL,
    disc_kind TEXT    NOT NULL
                      REFERENCES value_kind_enum (v) 
                      DEFAULT 'percent',
    rounding  REAL    NOT NULL
                      DEFAULT 0,
    credit    INTEGER NOT NULL
                      CHECK (credit IN (0, 1) ) 
                      DEFAULT 0,
    cashier   TEXT    NOT NULL,
    mode      TEXT    NOT NULL
                      REFERENCES mode_enum (v),
    pay       REAL    NOT NULL,
    note      TEXT    NOT NULL
                      DEFAULT '',
    method_id INTEGER NOT NULL
                      DEFAULT 1000
                      REFERENCES methods (id) ON DELETE SET DEFAULT,
    fix       INTEGER NOT NULL
                      DEFAULT (0) 
)
STRICT;

INSERT INTO records (
    timestamp,
    paid_at,
    disc_val,
    disc_kind,
    rounding,
    credit,
    cashier,
    mode,
    pay,
    note,
    method_id
)
SELECT timestamp,
        paid_at,
        disc_val,
        disc_kind,
        rounding,
        credit,
        cashier,
        mode,
        pay,
        note,
        method_id
FROM temp_table;

DROP TABLE temp_table;

PRAGMA foreign_keys = 1;
