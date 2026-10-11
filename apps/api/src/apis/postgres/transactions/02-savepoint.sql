\ir guard.sql
\echo '02: rollback to savepoint discards all work after the marker'
CREATE TEMP TABLE demo_transactions_orders (id integer PRIMARY KEY);
CREATE TEMP TABLE demo_transactions_order_items (
  order_id integer NOT NULL REFERENCES demo_transactions_orders(id),
  product_id integer NOT NULL,
  PRIMARY KEY (order_id, product_id)
);

BEGIN;
INSERT INTO demo_transactions_orders VALUES (1);
SAVEPOINT before_items;
INSERT INTO demo_transactions_order_items VALUES (1, 10);
\set ON_ERROR_STOP off
INSERT INTO demo_transactions_order_items VALUES (1, 10);
\set ON_ERROR_STOP on
ROLLBACK TO SAVEPOINT before_items;
INSERT INTO demo_transactions_order_items VALUES (1, 11);
RELEASE SAVEPOINT before_items;
COMMIT;
SELECT * FROM demo_transactions_orders;
SELECT * FROM demo_transactions_order_items;
