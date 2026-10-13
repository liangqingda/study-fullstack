\ir guard.sql
\echo '01: a failed ledger insert aborts the whole transfer'
CREATE TEMP TABLE demo_transactions_accounts (
  id integer PRIMARY KEY,
  balance integer NOT NULL CHECK (balance >= 0)
);
CREATE TEMP TABLE demo_transactions_transfer_log (
  id integer PRIMARY KEY,
  from_id integer NOT NULL REFERENCES demo_transactions_accounts(id),
  to_id integer NOT NULL REFERENCES demo_transactions_accounts(id),
  amount integer NOT NULL CHECK (amount > 0)
);
INSERT INTO demo_transactions_accounts VALUES (1, 500), (2, 200);
INSERT INTO demo_transactions_transfer_log VALUES (1, 1, 2, 1);

BEGIN;
UPDATE demo_transactions_accounts SET balance = balance - 100 WHERE id = 1;
UPDATE demo_transactions_accounts SET balance = balance + 100 WHERE id = 2;
\set ON_ERROR_STOP off
INSERT INTO demo_transactions_transfer_log VALUES (1, 1, 2, 100);
SELECT balance FROM demo_transactions_accounts WHERE id = 1;
\set ON_ERROR_STOP on
ROLLBACK;
SELECT id, balance FROM demo_transactions_accounts ORDER BY id;
SELECT count(*) AS ledger_rows FROM demo_transactions_transfer_log;
