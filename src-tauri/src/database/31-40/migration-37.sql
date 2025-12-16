DROP TABLE discounts_old;
DROP TABLE record_extras_old;
DROP TABLE record_products_old;
DROP TABLE records_old;
DROP TABLE customers_old;
DROP TABLE cashiers_old;
DROP TABLE extras_old;
DROP TABLE images_old;
DROP TABLE methods_old;
DROP TABLE socials_old;
DROP TABLE products_old;

ALTER TABLE customers RENAME TO customers_old;

CREATE TABLE customers (
  customer_id INTEGER PRIMARY KEY,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL
) STRICT;

INSERT INTO customers (customer_name, customer_phone)
SELECT customer_name, customer_phone FROM customers_old;

DROP TABLE customers_old;