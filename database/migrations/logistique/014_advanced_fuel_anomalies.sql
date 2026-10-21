ALTER TABLE logistics_fuel_anomaly_settings
  ADD COLUMN IF NOT EXISTS history_sample_size INTEGER NOT NULL DEFAULT 6 CHECK (history_sample_size BETWEEN 3 AND 24),
  ADD COLUMN IF NOT EXISTS history_min_samples INTEGER NOT NULL DEFAULT 3 CHECK (history_min_samples BETWEEN 3 AND 24),
  ADD COLUMN IF NOT EXISTS deviation_warning_ratio NUMERIC(6,3) NOT NULL DEFAULT 1.5 CHECK (deviation_warning_ratio > 1),
  ADD COLUMN IF NOT EXISTS deviation_critical_ratio NUMERIC(6,3) NOT NULL DEFAULT 2 CHECK (deviation_critical_ratio > deviation_warning_ratio),
  ADD COLUMN IF NOT EXISTS maximum_quantity NUMERIC(12,3) CHECK (maximum_quantity > 0);

DO $$ BEGIN
  ALTER TABLE logistics_fuel_anomaly_settings ADD CONSTRAINT logistics_fuel_anomaly_history_samples_check CHECK (history_min_samples <= history_sample_size);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON COLUMN logistics_fuel_anomaly_settings.maximum_quantity IS 'Quantité maximale facultative en litres ; NULL tant qu’aucune capacité métier n’est validée';
COMMENT ON COLUMN logistics_fuel_anomaly_settings.deviation_warning_ratio IS 'Rapport minimal entre la consommation courante et la moyenne historique pour créer un signal';
