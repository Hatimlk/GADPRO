CREATE TABLE IF NOT EXISTS logistics_fuel_anomaly_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meter_type VARCHAR(20) NOT NULL UNIQUE CHECK (meter_type IN ('odometer','hours')),
  warning_threshold NUMERIC(12,3) NOT NULL CHECK (warning_threshold > 0),
  critical_threshold NUMERIC(12,3) NOT NULL CHECK (critical_threshold > warning_threshold),
  minimum_delta NUMERIC(12,3) NOT NULL DEFAULT 0 CHECK (minimum_delta >= 0),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0)
);

INSERT INTO logistics_fuel_anomaly_settings(meter_type,warning_threshold,critical_threshold,minimum_delta)
VALUES ('odometer',50,75,10),('hours',20,30,1)
ON CONFLICT(meter_type) DO NOTHING;

COMMENT ON TABLE logistics_fuel_anomaly_settings IS 'Seuils GMAO configurables dans la base Logistique dédiée; valeurs initiales à valider par GADIMAT';
COMMENT ON COLUMN logistics_fuel_anomaly_settings.minimum_delta IS 'Écart compteur minimal avant évaluation de la consommation';
