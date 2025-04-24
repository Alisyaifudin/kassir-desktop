CREATE TABLE products (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  stock INTEGER NOT NULL,
  barcode INTEGER UNIQUE
) STRICT;

CREATE TABLE records (
  timestamp INTEGER PRIMARY KEY,
  total INTEGER NOT NULL,
  pay INTEGER NOT NULL,
  disc_val INTEGER NOT NULL,
  disc_type TEXT NOT NULL CHECK (disc_type IN ('number', 'percent')),
  change INTEGER,
  variant TEXT CHECK (variant IN ('sell', 'buy'))
) STRICT;

CREATE INDEX idx_records_variant ON records(variant);

CREATE TABLE taxes (
  id INTEGER PRIMARY KEY,
  timestamp INTEGER NOT NULL REFERENCES records(timestamp) ON DELETE CASCADE,
  name TEXT NOT NULL,
  value INTEGER NOT NULL -- in percentage
) STRICT;

CREATE TABLE record_items (
  id INTEGER PRIMARY KEY,
  timestamp INTEGER NOT NULL REFERENCES records(timestamp) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price INTEGER NOT NULL,
  qty INTEGER NOT NULL,
  subtotal INTEGER NOT NULL,
  disc_val INTEGER NOT NULL,
  disc_type TEXT NOT NULL CHECK (disc_type IN ('number', 'percent')),
  capital INTEGER
) STRICT;
