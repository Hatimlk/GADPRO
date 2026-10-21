import { Router } from 'express';
import { logisticsPool, logisticsQuery } from '../../../db.js';
import { requireLogisticsPermission } from '../middleware/authorization.js';
import { moduleSettingUpdateSchema, validateBody } from '../schemas/validation.js';
import { sendDatabaseError, writeAudit } from '../services/audit.js';
import { logisticsSettingDefinitions, validateLogisticsSetting } from '../services/settings.js';

const router = Router();

router.get('/', requireLogisticsPermission('settings.read'), async (_req, res, next) => {
  try {
    const result = await logisticsQuery('SELECT key,setting_group,label,description,value,updated_at,updated_by,version FROM logistics_module_settings ORDER BY setting_group,label');
    res.json({ data: result.rows.map((row) => ({ ...row, definition: logisticsSettingDefinitions[row.key] || null })) });
  } catch (error) { next(error); }
});

router.patch('/:key', requireLogisticsPermission('settings.admin'), validateBody(moduleSettingUpdateSchema), async (req, res) => {
  const checked = validateLogisticsSetting(req.params.key, req.validated.value);
  if (!checked.success) return res.status(400).json({ error: checked.error, code: 'INVALID_SETTING' });
  const client = await logisticsPool.connect();
  try {
    await client.query('BEGIN');
    const before = await client.query('SELECT * FROM logistics_module_settings WHERE key=$1 FOR UPDATE', [req.params.key]);
    if (!before.rows[0]) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Paramètre introuvable.' }); }
    const updated = await client.query(`UPDATE logistics_module_settings SET value=$1::jsonb,updated_at=NOW(),updated_by=$2,version=version+1
      WHERE key=$3 AND version=$4 RETURNING key,setting_group,label,description,value,updated_at,updated_by,version`,
    [JSON.stringify(checked.value), req.identity.id, req.params.key, req.validated.version]);
    if (!updated.rows[0]) { await client.query('ROLLBACK'); return res.status(409).json({ error: 'Le paramètre a déjà été modifié.', code: 'VERSION_CONFLICT' }); }
    await writeAudit(client, req, 'setting.updated', 'module_setting', null, before.rows[0], updated.rows[0], { key: req.params.key });
    await client.query('COMMIT');
    res.json({ ...updated.rows[0], definition: logisticsSettingDefinitions[req.params.key] });
  } catch (error) { await client.query('ROLLBACK'); return sendDatabaseError(res, error); } finally { client.release(); }
});

export default router;
