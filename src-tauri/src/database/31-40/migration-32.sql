CREATE TABLE role_enum(
  v TEXT PRIMARY KEY
) STRICT;

INSERT INTO role_enum VALUES ('user'), ('admin');

ALTER TABLE cashiers RENAME TO cahsiers_old;

CREATE TABLE cashiers (
  name TEXT PRIMARY KEY,
  hash TEXT NOT NULL,
  role TEXT NOT NULL REFERENCES role_enum(v)
) STRICT;

DROP TABLE cahsiers_old;