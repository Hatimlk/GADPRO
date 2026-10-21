CREATE TABLE IF NOT EXISTS logistics_import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_type VARCHAR(30) NOT NULL CHECK (import_type IN ('assets','fuel','spare_parts')),
  original_filename VARCHAR(255) NOT NULL,
  mime_type VARCHAR(120) NOT NULL,
  file_sha256 CHAR(64) NOT NULL,
  mapping_sha256 CHAR(64) NOT NULL,
  headers JSONB NOT NULL DEFAULT '[]',
  mapping JSONB NOT NULL DEFAULT '{}',
  scope_snapshot JSONB NOT NULL DEFAULT '{}',
  status VARCHAR(30) NOT NULL DEFAULT 'preview' CHECK (status IN ('preview','processing','completed','partially_completed','failed','cancelled')),
  total_rows INTEGER NOT NULL DEFAULT 0 CHECK (total_rows >= 0),
  valid_rows INTEGER NOT NULL DEFAULT 0 CHECK (valid_rows >= 0),
  invalid_rows INTEGER NOT NULL DEFAULT 0 CHECK (invalid_rows >= 0),
  duplicate_rows INTEGER NOT NULL DEFAULT 0 CHECK (duplicate_rows >= 0),
  imported_rows INTEGER NOT NULL DEFAULT 0 CHECK (imported_rows >= 0),
  updated_rows INTEGER NOT NULL DEFAULT 0 CHECK (updated_rows >= 0),
  skipped_rows INTEGER NOT NULL DEFAULT 0 CHECK (skipped_rows >= 0),
  failed_rows INTEGER NOT NULL DEFAULT 0 CHECK (failed_rows >= 0),
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmed_by UUID,
  confirmed_at TIMESTAMPTZ,
  UNIQUE(created_by,import_type,file_sha256,mapping_sha256)
);

CREATE TABLE IF NOT EXISTS logistics_import_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES logistics_import_jobs(id) ON DELETE RESTRICT,
  row_number INTEGER NOT NULL CHECK (row_number >= 2),
  source_data JSONB NOT NULL,
  normalized_data JSONB NOT NULL DEFAULT '{}',
  status VARCHAR(20) NOT NULL CHECK (status IN ('valid','invalid','duplicate','imported','updated','skipped','failed')),
  errors JSONB NOT NULL DEFAULT '[]',
  duplicate_entity_id UUID,
  selected_action VARCHAR(20) CHECK (selected_action IN ('create','update','skip')),
  target_entity_id UUID,
  processed_at TIMESTAMPTZ,
  UNIQUE(job_id,row_number)
);

CREATE INDEX IF NOT EXISTS logistics_import_jobs_creator_idx ON logistics_import_jobs(created_by,created_at DESC);
CREATE INDEX IF NOT EXISTS logistics_import_rows_job_status_idx ON logistics_import_rows(job_id,status,row_number);

COMMENT ON TABLE logistics_import_jobs IS 'Aperçus et confirmations d’import dans la base Logistique dédiée';
COMMENT ON COLUMN logistics_import_jobs.scope_snapshot IS 'Trace informative du périmètre à la prévisualisation; les droits sont revérifiés à la confirmation';
