ALTER TABLE logistics_import_jobs DROP CONSTRAINT IF EXISTS logistics_import_jobs_import_type_check;
ALTER TABLE logistics_import_jobs ADD CONSTRAINT logistics_import_jobs_import_type_check CHECK (
  import_type IN ('assets','fuel','spare_parts','drivers','providers','maintenance_history')
);

COMMENT ON CONSTRAINT logistics_import_jobs_import_type_check ON logistics_import_jobs
  IS 'Imports guidés pris en charge exclusivement dans gadimat_logistique';
