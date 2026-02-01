-- Example migration: add a user icon path to users.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS suspension_end_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS suspension_start_at TIMESTAMP WITH TIME ZONE;

UPDATE users
SET suspension_start_at = NULL, suspension_end_at = NULL;
