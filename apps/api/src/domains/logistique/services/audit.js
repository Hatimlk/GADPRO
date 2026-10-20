export async function writeAudit(client, req, action, entityType, entityId, beforeData = null, afterData = null, details = {}) {
  await client.query(
    `INSERT INTO logistics_audit_logs(actor_user_id,action,entity_type,entity_id,before_data,after_data,details,ip_address,user_agent)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [req.identity.id, action, entityType, entityId, beforeData, afterData, details, req.ip || null, req.get?.('user-agent') || null],
  );
}

export function sendDatabaseError(res, error) {
  if (error.code === '23505') return res.status(409).json({ error: 'Une fiche portant cette référence existe déjà.', code: 'DUPLICATE_RECORD' });
  if (['23503', '23514', '22P02'].includes(error.code)) return res.status(400).json({ error: 'Référence ou valeur métier invalide.', code: 'INVALID_REFERENCE' });
  console.error(error);
  return res.status(500).json({ error: 'Erreur serveur Logistique.', code: 'LOGISTICS_SERVER_ERROR' });
}
