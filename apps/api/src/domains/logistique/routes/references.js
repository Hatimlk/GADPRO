import { Router } from 'express';
import { logisticsPool } from '../../../db.js';
import { requireLogisticsPermission } from '../middleware/authorization.js';
import { assetCategorySchema, departmentSchema, referenceStatusSchema, siteSchema, validateBody } from '../schemas/validation.js';
import { sendDatabaseError, writeAudit } from '../services/audit.js';

const router = Router();
const definitions = {
  sites: { table: 'logistics_sites', schema: siteSchema, entity: 'site' },
  departments: { table: 'logistics_departments', schema: departmentSchema, entity: 'department' },
  categories: { table: 'logistics_asset_categories', schema: assetCategorySchema, entity: 'asset_category' },
};

for (const [path, definition] of Object.entries(definitions)) {
  router.post(`/${path}`, requireLogisticsPermission('settings.admin'), validateBody(definition.schema), async (req, res) => {
    const client = await logisticsPool.connect();
    try {
      await client.query('BEGIN');
      const value = req.validated;
      const result = path === 'categories'
        ? await client.query(`INSERT INTO ${definition.table}(code,name,meter_type,requires_registration,created_by,updated_by) VALUES($1,$2,$3,$4,$5,$5) RETURNING *`, [value.code.toLowerCase(), value.name, value.meterType, value.requiresRegistration, req.identity.id])
        : await client.query(`INSERT INTO ${definition.table}(code,name,created_by,updated_by) VALUES($1,$2,$3,$3) RETURNING *`, [value.code.toUpperCase(), value.name, req.identity.id]);
      await writeAudit(client, req, `${definition.entity}.created`, definition.entity, result.rows[0].id, null, result.rows[0]);
      await client.query('COMMIT');
      res.status(201).json(result.rows[0]);
    } catch (error) { await client.query('ROLLBACK'); return sendDatabaseError(res, error); }
    finally { client.release(); }
  });

  router.patch(`/${path}/:id/status`, requireLogisticsPermission('settings.admin'), validateBody(referenceStatusSchema), async (req, res) => {
    const client = await logisticsPool.connect();
    try {
      await client.query('BEGIN');
      const before = await client.query(`SELECT * FROM ${definition.table} WHERE id=$1 AND deleted_at IS NULL FOR UPDATE`, [req.params.id]);
      if (!before.rows[0]) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Référentiel introuvable.' }); }
      const result = await client.query(`UPDATE ${definition.table} SET active=$1,updated_by=$2,updated_at=NOW(),version=version+1 WHERE id=$3 RETURNING *`, [req.validated.active, req.identity.id, req.params.id]);
      await writeAudit(client, req, `${definition.entity}.status_changed`, definition.entity, req.params.id, before.rows[0], result.rows[0]);
      await client.query('COMMIT');
      res.json(result.rows[0]);
    } catch (error) { await client.query('ROLLBACK'); return sendDatabaseError(res, error); }
    finally { client.release(); }
  });
}

export default router;
