\ir guard.sql
\echo '03: reset the dedicated stock row before each two-session experiment'
CREATE TABLE IF NOT EXISTS demo_transactions_stock (
  id integer PRIMARY KEY,
  stock integer NOT NULL CHECK (stock >= 0)
);
INSERT INTO demo_transactions_stock VALUES (1, 10)
ON CONFLICT (id) DO UPDATE SET stock = EXCLUDED.stock;
SELECT * FROM demo_transactions_stock;
