PRAGMA foreign_keys = 0;

CREATE TABLE customers (
  phone TEXT PRIMARY KEY,
  name TEXT NOT NULL
) STRICT;

ALTER TABLE discounts RENAME TO discounts_old;
ALTER TABLE record_items RENAME TO record_items_old;
ALTER TABLE additionals RENAME TO additionals_old;
ALTER TABLE records RENAME TO records_old;

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
                      DEFAULT (0),
    customer_name TEXT NOT NULL DEFAULT (''),
    customer_phone TEXT NOT NULL DEFAULT ('')
) STRICT;

CREATE TABLE record_items (
    id         INTEGER PRIMARY KEY,
    product_id INTEGER REFERENCES products (id) ON DELETE SET NULL,
    timestamp  INTEGER NOT NULL
                       REFERENCES records (timestamp) ON DELETE CASCADE
                                                      ON UPDATE CASCADE,
    name       TEXT    NOT NULL,
    price      REAL    NOT NULL,
    qty        INTEGER NOT NULL,
    capital    REAL    NOT NULL
)
STRICT;

CREATE TABLE additionals (
    id        INTEGER PRIMARY KEY,
    name      TEXT    NOT NULL,
    timestamp INTEGER NOT NULL
                      REFERENCES records (timestamp) ON DELETE CASCADE
                                                     ON UPDATE CASCADE,
    kind      TEXT    NOT NULL
                      REFERENCES value_kind_enum (v) 
                      DEFAULT 'percent',
    value     REAL    NOT NULL
)
STRICT;


CREATE TABLE discounts (
    id             INTEGER PRIMARY KEY,
    record_item_id INTEGER NOT NULL
                           REFERENCES record_items (id) ON DELETE CASCADE,
    kind           TEXT    NOT NULL
                           REFERENCES value_kind_enum (v) 
                           DEFAULT 'percent',
    value          REAL    NOT NULL
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
    method_id,
    fix
)
SELECT * FROM records_old;

INSERT INTO additionals
SELECT * FROM additionals_old;

INSERT INTO record_items
SELECT * FROM record_items_old;

INSERT INTO discounts
SELECT * FROM discounts_old;

DROP TABLE discounts_old;
DROP TABLE record_items_old;
DROP TABLE additionals_old;
DROP TABLE records_old;

PRAGMA foreign_keys = 0;
