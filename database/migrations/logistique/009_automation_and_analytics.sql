CREATE TABLE IF NOT EXISTS logistics_job_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name VARCHAR(80) NOT NULL,
  run_key VARCHAR(160) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'running' CHECK (status IN ('running','succeeded','failed')),
  triggered_by UUID NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  result JSONB NOT NULL DEFAULT '{}',
  error_message TEXT,
  UNIQUE(job_name,run_key)
);

CREATE INDEX IF NOT EXISTS logistics_job_runs_status_idx
  ON logistics_job_runs(job_name,status,started_at DESC);

CREATE TABLE IF NOT EXISTS logistics_asset_downtime_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES logistics_assets(id) ON DELETE RESTRICT,
  intervention_id UUID UNIQUE REFERENCES logistics_maintenance_interventions(id) ON DELETE RESTRICT,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  source VARCHAR(20) NOT NULL DEFAULT 'intervention' CHECK (source IN ('intervention','manual','import')),
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL,
  CHECK (ended_at IS NULL OR ended_at >= started_at)
);

CREATE INDEX IF NOT EXISTS logistics_downtime_asset_period_idx
  ON logistics_asset_downtime_periods(asset_id,started_at,ended_at);

ALTER TABLE logistics_alerts DROP CONSTRAINT IF EXISTS logistics_alerts_alert_type_check;
ALTER TABLE logistics_alerts ADD CONSTRAINT logistics_alerts_alert_type_check CHECK (
  alert_type IN ('maintenance_due','maintenance_overdue','delayed_intervention','immobilized_asset')
);

COMMENT ON TABLE logistics_job_runs IS 'Exécutions idempotentes des automatisations de la base Logistique dédiée';
COMMENT ON TABLE logistics_asset_downtime_periods IS 'Périodes techniques utilisées pour les calculs de disponibilité; aucune dépendance ERP';
