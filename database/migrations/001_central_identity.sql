CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  email_normalized VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  platform_admin BOOLEAN NOT NULL DEFAULT false,
  session_version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS migration_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_fingerprint VARCHAR(128) NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL,
  report JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS module_access (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  module_code VARCHAR(40) NOT NULL CHECK (module_code IN ('cheques','impayes','consommations','administration','logistique')),
  role VARCHAR(80) NOT NULL,
  permissions JSONB NOT NULL DEFAULT '[]',
  data_scope JSONB NOT NULL DEFAULT '{}',
  active BOOLEAN NOT NULL DEFAULT true,
  PRIMARY KEY (user_id, module_code)
);

CREATE TABLE IF NOT EXISTS legacy_identities (
  central_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source VARCHAR(40) NOT NULL CHECK (source IN ('cheques','impayes')),
  legacy_user_id VARCHAR(100) NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  migration_run_id UUID REFERENCES migration_runs(id) ON DELETE RESTRICT,
  PRIMARY KEY (central_user_id, source),
  UNIQUE (source, legacy_user_id)
);

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token_hash CHAR(64) NOT NULL UNIQUE,
  user_agent TEXT,
  ip_address INET,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  rotated_from UUID REFERENCES sessions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS sessions_active_idx ON sessions(user_id, expires_at) WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  event VARCHAR(80) NOT NULL,
  details JSONB NOT NULL DEFAULT '{}',
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION revoke_user_sessions() RETURNS trigger AS $$
BEGIN
  IF OLD.active IS DISTINCT FROM NEW.active OR OLD.session_version IS DISTINCT FROM NEW.session_version THEN
    UPDATE sessions SET revoked_at = NOW() WHERE user_id = NEW.id AND revoked_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS users_revoke_sessions ON users;
CREATE TRIGGER users_revoke_sessions AFTER UPDATE ON users FOR EACH ROW EXECUTE FUNCTION revoke_user_sessions();
