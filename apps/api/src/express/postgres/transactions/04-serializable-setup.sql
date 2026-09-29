\ir guard.sql
\echo '04: reset the dedicated on-call rows before each isolation experiment'
CREATE TABLE IF NOT EXISTS demo_transactions_on_call (
  doctor text PRIMARY KEY,
  active boolean NOT NULL
);
INSERT INTO demo_transactions_on_call VALUES ('A', true), ('B', true)
ON CONFLICT (doctor) DO UPDATE SET active = EXCLUDED.active;
SELECT * FROM demo_transactions_on_call ORDER BY doctor;
