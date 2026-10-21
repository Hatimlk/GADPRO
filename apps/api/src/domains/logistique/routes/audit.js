import { Router } from 'express';
import { logisticsQuery } from '../../../db.js';
import { requireLogisticsPermission } from '../middleware/authorization.js';
import { auditListSchema, validateQuery } from '../schemas/validation.js';

const router = Router();

router.get('/', requireLogisticsPermission('audit.read'), validateQuery(auditListSchema), async (req, res, next) => {
  try {
    const { page, limit, action, entityType, actorUserId, from, to } = req.validatedQuery;
    const params = []; const conditions = [];
    if (action) { params.push(`%${action}%`); conditions.push(`action ILIKE $${params.length}`); }
    if (entityType) { params.push(entityType); conditions.push(`entity_type=$${params.length}`); }
    if (actorUserId) { params.push(actorUserId); conditions.push(`actor_user_id=$${params.length}`); }
    if (from) { params.push(from); conditions.push(`created_at>=$${params.length}::date`); }
    if (to) { params.push(to); conditions.push(`created_at<$${params.length}::date+INTERVAL '1 day'`); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const total = await logisticsQuery(`SELECT COUNT(*)::int AS count FROM logistics_audit_logs ${where}`, params);
    params.push(limit, (page - 1) * limit);
    const result = await logisticsQuery(`SELECT id,actor_user_id,action,entity_type,entity_id,before_data,after_data,details,ip_address,user_agent,correlation_id,created_at
      FROM logistics_audit_logs ${where} ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`, params);
    res.json({ data: result.rows, page, limit, total: total.rows[0].count, totalPages: Math.ceil(total.rows[0].count / limit) });
  } catch (error) { next(error); }
});

router.get('/filters', requireLogisticsPermission('audit.read'), async (_req, res, next) => {
  try {
    const [actions, entityTypes] = await Promise.all([
      logisticsQuery('SELECT DISTINCT action FROM logistics_audit_logs ORDER BY action'),
      logisticsQuery('SELECT DISTINCT entity_type FROM logistics_audit_logs ORDER BY entity_type'),
    ]);
    res.json({ actions: actions.rows.map((row) => row.action), entityTypes: entityTypes.rows.map((row) => row.entity_type) });
  } catch (error) { next(error); }
});

export default router;
