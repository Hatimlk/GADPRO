CREATE TABLE IF NOT EXISTS logistics_maintenance_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(80) NOT NULL UNIQUE,
  operation_name VARCHAR(200) NOT NULL,
  description TEXT,
  category_id UUID REFERENCES logistics_asset_categories(id) ON DELETE RESTRICT,
  responsible_user_id UUID,
  estimated_duration_hours NUMERIC(10,2) CHECK (estimated_duration_hours >= 0),
  estimated_cost NUMERIC(14,2) CHECK (estimated_cost >= 0),
  combination_rule VARCHAR(20) NOT NULL DEFAULT 'first_due' CHECK (combination_rule = 'first_due'),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('draft','active','inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID NOT NULL,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID
);

CREATE TABLE IF NOT EXISTS logistics_maintenance_plan_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES logistics_maintenance_plans(id) ON DELETE RESTRICT,
  trigger_type VARCHAR(20) NOT NULL CHECK (trigger_type IN ('mileage','hours','calendar')),
  interval_value NUMERIC(12,2) NOT NULL CHECK (interval_value > 0),
  interval_unit VARCHAR(20) NOT NULL CHECK (
    (trigger_type='mileage' AND interval_unit='km') OR
    (trigger_type='hours' AND interval_unit='hours') OR
    (trigger_type='calendar' AND interval_unit IN ('days','months','years'))
  ),
  warning_threshold NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (warning_threshold >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL,
  UNIQUE(plan_id,trigger_type)
);

CREATE TABLE IF NOT EXISTS logistics_maintenance_plan_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES logistics_maintenance_plans(id) ON DELETE RESTRICT,
  asset_id UUID NOT NULL REFERENCES logistics_assets(id) ON DELETE RESTRICT,
  activated_at DATE NOT NULL DEFAULT CURRENT_DATE,
  last_completed_at TIMESTAMPTZ,
  last_completed_mileage NUMERIC(14,1) CHECK (last_completed_mileage >= 0),
  last_completed_hours NUMERIC(14,1) CHECK (last_completed_hours >= 0),
  next_due_date DATE,
  next_due_mileage NUMERIC(14,1) CHECK (next_due_mileage >= 0),
  next_due_hours NUMERIC(14,1) CHECK (next_due_hours >= 0),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID NOT NULL,
  UNIQUE(plan_id,asset_id)
);

CREATE TABLE IF NOT EXISTS logistics_maintenance_due_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_asset_id UUID NOT NULL REFERENCES logistics_maintenance_plan_assets(id) ON DELETE RESTRICT,
  plan_id UUID NOT NULL REFERENCES logistics_maintenance_plans(id) ON DELETE RESTRICT,
  asset_id UUID NOT NULL REFERENCES logistics_assets(id) ON DELETE RESTRICT,
  cycle_key VARCHAR(255) NOT NULL,
  due_date DATE,
  due_mileage NUMERIC(14,1),
  due_hours NUMERIC(14,1),
  status VARCHAR(20) NOT NULL CHECK (status IN ('upcoming','due','overdue','created','completed','dismissed')),
  intervention_id UUID REFERENCES logistics_maintenance_interventions(id) ON DELETE RESTRICT,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(plan_id,asset_id,cycle_key)
);

CREATE TABLE IF NOT EXISTS logistics_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type VARCHAR(40) NOT NULL CHECK (alert_type IN ('maintenance_due','maintenance_overdue')),
  asset_id UUID REFERENCES logistics_assets(id) ON DELETE RESTRICT,
  due_event_id UUID REFERENCES logistics_maintenance_due_events(id) ON DELETE RESTRICT,
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('info','warning','critical')),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  deduplication_key VARCHAR(255) NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open','acknowledged','resolved')),
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0)
);

ALTER TABLE logistics_maintenance_interventions
  ADD COLUMN IF NOT EXISTS maintenance_due_event_id UUID REFERENCES logistics_maintenance_due_events(id) ON DELETE RESTRICT;

CREATE UNIQUE INDEX IF NOT EXISTS logistics_interventions_due_event_unique
  ON logistics_maintenance_interventions(maintenance_due_event_id) WHERE maintenance_due_event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS logistics_plan_assets_asset_idx ON logistics_maintenance_plan_assets(asset_id) WHERE active=true;
CREATE INDEX IF NOT EXISTS logistics_due_events_status_idx ON logistics_maintenance_due_events(status,calculated_at DESC);
CREATE INDEX IF NOT EXISTS logistics_alerts_status_idx ON logistics_alerts(status,severity,created_at DESC);

COMMENT ON COLUMN logistics_maintenance_plans.responsible_user_id IS 'Référence logique vers la base centrale users.id';
