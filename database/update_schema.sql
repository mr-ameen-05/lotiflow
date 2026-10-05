USE lotl_dfms;

-- Add columns for machine onboarding if they don't exist
-- Note: 'IF NOT EXISTS' for columns is not standard MySQL 8.0 syntax without procedure, 
-- but we can just try to run it. If it fails it might mean it exists.
-- However, since I know the state is clean (from previous steps), ALTER TABLE is safe.

ALTER TABLE lotl_host 
ADD COLUMN machine_user VARCHAR(100) NULL AFTER status,
ADD COLUMN machine_credential TEXT NULL AFTER machine_user;
