CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version VARCHAR(20) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  checksum CHAR(64) NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS logistics_sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(40) NOT NULL UNIQUE,
  name VARCHAR(160) NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID
);

CREATE TABLE IF NOT EXISTS logistics_asset_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(40) NOT NULL UNIQUE,
  name VARCHAR(160) NOT NULL,
  meter_type VARCHAR(20) NOT NULL DEFAULT 'odometer'
    CHECK (meter_type IN ('odometer', 'hours', 'both', 'none')),
  requires_registration BOOLEAN NOT NULL DEFAULT true,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID
);

CREATE TABLE IF NOT EXISTS logistics_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID,
  action VARCHAR(120) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id UUID,
  before_data JSONB,
  after_data JSONB,
  details JSONB NOT NULL DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  correlation_id UUID NOT NULL DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS logistics_sites_active_idx
  ON logistics_sites(active) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS logistics_asset_categories_active_idx
  ON logistics_asset_categories(active) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS logistics_audit_logs_entity_idx
  ON logistics_audit_logs(entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS logistics_audit_logs_actor_idx
  ON logistics_audit_logs(actor_user_id, created_at DESC);

COMMENT ON COLUMN logistics_sites.created_by IS 'Référence logique vers la base centrale users.id';
COMMENT ON COLUMN logistics_audit_logs.actor_user_id IS 'Référence logique vers la base centrale users.id';
