\set ON_ERROR_STOP on
SELECT current_database() AS database;
DO $$
BEGIN
  IF current_database() <> 'study_nodejs' THEN
    RAISE EXCEPTION 'Transaction demos require study_nodejs, got %', current_database();
  END IF;
END;
$$;
