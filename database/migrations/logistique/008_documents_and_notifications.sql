CREATE TABLE IF NOT EXISTS logistics_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(30) NOT NULL CHECK (entity_type IN ('asset','intervention','quotation','invoice','provider','driver')),
  entity_id UUID NOT NULL, category VARCHAR(50) NOT NULL,
  original_name VARCHAR(255) NOT NULL, storage_key VARCHAR(500) NOT NULL UNIQUE,
  mime_type VARCHAR(120) NOT NULL, extension VARCHAR(12) NOT NULL,
  size_bytes BIGINT NOT NULL CHECK (size_bytes > 0), sha256 CHAR(64) NOT NULL,
  scan_status VARCHAR(20) NOT NULL CHECK (scan_status IN ('clean','rejected','quarantined')),
  scan_engine VARCHAR(100) NOT NULL, expires_at DATE, notes TEXT,
  uploaded_by UUID NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ, deleted_by UUID,
  UNIQUE(entity_type,entity_id,category,sha256)
);
CREATE INDEX IF NOT EXISTS logistics_documents_entity_idx ON logistics_documents(entity_type,entity_id,created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS logistics_documents_expiry_idx ON logistics_documents(expires_at) WHERE expires_at IS NOT NULL AND deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS logistics_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), recipient_user_id UUID NOT NULL,
  category VARCHAR(40) NOT NULL CHECK (category IN ('approval','decision','maintenance','document','stock','fuel','system')),
  severity VARCHAR(20) NOT NULL DEFAULT 'info' CHECK (severity IN ('info','warning','critical')),
  title VARCHAR(255) NOT NULL, message TEXT NOT NULL,
  entity_type VARCHAR(40), entity_id UUID, action_url VARCHAR(500), deduplication_key VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'unread' CHECK (status IN ('unread','read','archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), read_at TIMESTAMPTZ, archived_at TIMESTAMPTZ,
  UNIQUE(recipient_user_id,deduplication_key)
);
CREATE INDEX IF NOT EXISTS logistics_notifications_recipient_idx ON logistics_notifications(recipient_user_id,status,created_at DESC);

COMMENT ON COLUMN logistics_documents.uploaded_by IS 'Référence logique vers la base centrale users.id';
COMMENT ON COLUMN logistics_notifications.recipient_user_id IS 'Référence logique vers la base centrale users.id';
COMMENT ON TABLE logistics_documents IS 'Métadonnées uniquement; les octets restent dans un stockage privé hors racine web.';
