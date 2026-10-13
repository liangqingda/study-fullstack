\set ON_ERROR_STOP on
SELECT current_database() AS database;
DO $$
BEGIN
  IF current_database() <> 'study_lab' THEN
    RAISE EXCEPTION 'Transaction demos require study_lab, got %', current_database();
  END IF;
END;
$$;
