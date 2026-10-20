CREATE TABLE IF NOT EXISTS logistics_specialties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(160) NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS logistics_service_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_code VARCHAR(80) NOT NULL UNIQUE,
  company_name VARCHAR(200) NOT NULL,
  contact_name VARCHAR(200),
  phone VARCHAR(40),
  email VARCHAR(255),
  address TEXT,
  contract_reference VARCHAR(120),
  contract_starts_at DATE,
  contract_ends_at DATE,
  payment_terms VARCHAR(255),
  status VARCHAR(30) NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','inactive')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID NOT NULL,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID,
  CHECK (contract_ends_at IS NULL OR contract_starts_at IS NULL OR contract_ends_at >= contract_starts_at)
);
CREATE UNIQUE INDEX IF NOT EXISTS logistics_providers_name_unique
  ON logistics_service_providers(LOWER(company_name)) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS logistics_providers_status_idx
  ON logistics_service_providers(status) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS logistics_provider_specialties (
  provider_id UUID NOT NULL REFERENCES logistics_service_providers(id) ON DELETE RESTRICT,
  specialty_id UUID NOT NULL REFERENCES logistics_specialties(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL,
  PRIMARY KEY(provider_id, specialty_id)
);

CREATE SEQUENCE IF NOT EXISTS logistics_intervention_reference_seq;

CREATE TABLE IF NOT EXISTS logistics_maintenance_interventions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference VARCHAR(40) NOT NULL UNIQUE,
  asset_id UUID NOT NULL REFERENCES logistics_assets(id) ON DELETE RESTRICT,
  maintenance_kind VARCHAR(20) NOT NULL DEFAULT 'corrective' CHECK (maintenance_kind IN ('corrective','preventive')),
  category VARCHAR(40) NOT NULL CHECK (category IN ('mechanical','electrical','tire','bodywork','oil_change','inspection','breakdown','preventive_service','other')),
  issue_description TEXT NOT NULL,
  priority VARCHAR(20) NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','critical')),
  requester_user_id UUID NOT NULL,
  assigned_user_id UUID,
  provider_id UUID REFERENCES logistics_service_providers(id) ON DELETE RESTRICT,
  reported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  planned_start_at TIMESTAMPTZ,
  planned_end_at TIMESTAMPTZ,
  actual_start_at TIMESTAMPTZ,
  actual_end_at TIMESTAMPTZ,
  mileage NUMERIC(14,1) CHECK (mileage >= 0),
  operating_hours NUMERIC(14,1) CHECK (operating_hours >= 0),
  estimated_cost NUMERIC(14,2) CHECK (estimated_cost >= 0),
  actual_cost NUMERIC(14,2) CHECK (actual_cost >= 0),
  currency CHAR(3) NOT NULL DEFAULT 'MAD' CHECK (currency = 'MAD'),
  downtime_hours NUMERIC(12,2) CHECK (downtime_hours >= 0),
  status VARCHAR(30) NOT NULL DEFAULT 'requested'
    CHECK (status IN ('requested','validated','planned','in_progress','completed','invoiced','closed','rejected','cancelled','waiting_parts','waiting_quote')),
  rejection_reason TEXT,
  cancellation_reason TEXT,
  completion_notes TEXT,
  origin VARCHAR(20) NOT NULL DEFAULT 'manual' CHECK (origin IN ('manual','plan','alert','import')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID NOT NULL,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID,
  CHECK (planned_end_at IS NULL OR planned_start_at IS NULL OR planned_end_at >= planned_start_at),
  CHECK (actual_end_at IS NULL OR actual_start_at IS NULL OR actual_end_at >= actual_start_at)
);
CREATE INDEX IF NOT EXISTS logistics_interventions_asset_idx
  ON logistics_maintenance_interventions(asset_id, reported_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS logistics_interventions_status_idx
  ON logistics_maintenance_interventions(status, priority, reported_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS logistics_interventions_provider_idx
  ON logistics_maintenance_interventions(provider_id, actual_end_at DESC) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS logistics_intervention_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intervention_id UUID NOT NULL REFERENCES logistics_maintenance_interventions(id) ON DELETE RESTRICT,
  from_status VARCHAR(30),
  to_status VARCHAR(30) NOT NULL,
  changed_by UUID NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS logistics_intervention_history_idx
  ON logistics_intervention_status_history(intervention_id, changed_at);

CREATE TABLE IF NOT EXISTS logistics_intervention_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intervention_id UUID NOT NULL REFERENCES logistics_maintenance_interventions(id) ON DELETE RESTRICT,
  author_user_id UUID NOT NULL,
  comment TEXT NOT NULL,
  visibility VARCHAR(20) NOT NULL DEFAULT 'internal' CHECK (visibility IN ('internal','provider')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO logistics_specialties(code,name) VALUES
  ('mechanics','Mécanique'),('electricity','Électricité'),('tires','Pneumatiques'),('bodywork','Carrosserie'),
  ('oil_changes','Vidanges'),('breakdown','Dépannage'),('equipment_maintenance','Maintenance des équipements')
ON CONFLICT(code) DO NOTHING;

COMMENT ON COLUMN logistics_maintenance_interventions.requester_user_id IS 'Référence logique vers la base centrale users.id';
COMMENT ON COLUMN logistics_intervention_status_history.changed_by IS 'Référence logique vers la base centrale users.id';
