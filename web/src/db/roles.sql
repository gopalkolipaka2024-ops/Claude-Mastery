-- Least-privilege roles. Run once per database as the owner (Neon: SQL editor),
-- replacing the passwords. The public site uses site_read; sync jobs and the admin use site_write.
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'site_read') THEN CREATE ROLE site_read LOGIN PASSWORD 'change-me-read'; END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'site_write') THEN CREATE ROLE site_write LOGIN PASSWORD 'change-me-write'; END IF;
END $$;
GRANT USAGE ON SCHEMA public TO site_read, site_write;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO site_read;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO site_read;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO site_write;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO site_write;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO site_write;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO site_write;
-- The site role must never see stock counts through anything but the badge; it only reads through the API layer,
-- and the public API never selects stock.quantity directly (see src/lib/repo/pg.ts).
