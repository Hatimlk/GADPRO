CREATE TABLE IF NOT EXISTS logistics_module_settings (
  key VARCHAR(120) PRIMARY KEY,
  setting_group VARCHAR(60) NOT NULL,
  label VARCHAR(180) NOT NULL,
  description TEXT NOT NULL,
  value JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0)
);

INSERT INTO logistics_module_settings(key,setting_group,label,description,value) VALUES
  ('alerts.document_expiry_days','alerts','Préavis documents','Nombre de jours avant expiration d’un document pour ouvrir une alerte.','30'::jsonb),
  ('alerts.driver_license_expiry_days','alerts','Préavis permis','Nombre de jours avant expiration d’un permis de conduire pour ouvrir une alerte.','30'::jsonb),
  ('alerts.low_stock_enabled','alerts','Alertes stock critique','Ouvre une alerte lorsqu’une pièce active atteint son stock minimum.','true'::jsonb),
  ('alerts.fuel_anomaly_enabled','alerts','Alertes carburant','Reporte les anomalies carburant ouvertes dans le centre d’alertes.','true'::jsonb),
  ('alerts.pending_quotation_enabled','alerts','Alertes devis en attente','Reporte les devis en attente d’approbation dans le centre d’alertes.','true'::jsonb)
ON CONFLICT(key) DO NOTHING;

ALTER TABLE logistics_alerts DROP CONSTRAINT IF EXISTS logistics_alerts_alert_type_check;
ALTER TABLE logistics_alerts ADD CONSTRAINT logistics_alerts_alert_type_check CHECK (
  alert_type IN (
    'maintenance_due','maintenance_overdue','delayed_intervention','immobilized_asset',
    'insurance_expiry','technical_inspection_expiry','document_expiry','driver_license_expiry',
    'critical_stock','abnormal_fuel_consumption','pending_quotation_approval'
  )
);

ALTER TABLE logistics_alerts
  ADD COLUMN IF NOT EXISTS related_entity_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS related_entity_id UUID,
  ADD COLUMN IF NOT EXISTS deadline DATE,
  ADD COLUMN IF NOT EXISTS responsible_user_id UUID;

CREATE INDEX IF NOT EXISTS logistics_alerts_related_entity_idx
  ON logistics_alerts(related_entity_type,related_entity_id,created_at DESC);
CREATE INDEX IF NOT EXISTS logistics_alerts_deadline_idx
  ON logistics_alerts(status,deadline) WHERE deadline IS NOT NULL;

COMMENT ON TABLE logistics_module_settings IS 'Paramètres fonctionnels propres à gadimat_logistique; aucune dépendance ERP.';
COMMENT ON COLUMN logistics_module_settings.updated_by IS 'Référence logique vers la base centrale users.id';
COMMENT ON COLUMN logistics_alerts.responsible_user_id IS 'Référence logique vers la base centrale users.id';
