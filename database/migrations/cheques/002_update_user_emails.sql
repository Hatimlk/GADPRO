-- Chèques database only.
-- Apply explicitly after a backup; this file is never executed by the application.
-- psql "$CHEQUES_DATABASE_URL" -v ON_ERROR_STOP=1 \
--   -f database/migrations/cheques/002_update_user_emails.sql

BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM users AS source_user
    JOIN users AS target_user
      ON lower(target_user.email) = 'secretariat@gadimat.com'
     AND target_user.id <> source_user.id
    WHERE lower(source_user.email) = 'leila@gadimat.com'
  ) THEN
    RAISE EXCEPTION 'Cannot replace leila@gadimat.com: secretariat@gadimat.com is already assigned to another user';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM users AS source_user
    JOIN users AS target_user
      ON lower(target_user.email) = 'franck.guillet@gadimat.com'
     AND target_user.id <> source_user.id
    WHERE lower(source_user.email) = 'admin@gadimat.com'
  ) THEN
    RAISE EXCEPTION 'Cannot replace admin@gadimat.com: franck.guillet@gadimat.com is already assigned to another user';
  END IF;
END $$;

UPDATE users
SET email = 'secretariat@gadimat.com'
WHERE lower(email) = 'leila@gadimat.com';

UPDATE users
SET email = 'franck.guillet@gadimat.com'
WHERE lower(email) = 'admin@gadimat.com';

COMMIT;
