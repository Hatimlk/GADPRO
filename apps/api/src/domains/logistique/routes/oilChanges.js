import { Router } from 'express';
import { logisticsPool, logisticsQuery } from '../../../db.js';
import { appendAssetScope, requireLogisticsPermission } from '../middleware/authorization.js';
import { oilChangeCompleteSchema, oilChangeListSchema, oilChangeMileageSchema, validateBody, validateQuery } from '../schemas/validation.js';
import { sendDatabaseError, writeAudit } from '../services/audit.js';
import { nextOilChangeMileage } from '../services/oilChanges.js';

const router = Router();
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
router.param('id', (req,res,next,value) => UUID.test(value) ? next() : res.status(400).json({ error:'Identifiant invalide.' }));

const statusSql = `CASE WHEN o.manual_status IS NOT NULL THEN 'out_of_service' WHEN o.next_service_mileage-o.current_mileage<=0 THEN 'urgent' WHEN o.next_service_mileage-o.current_mileage<=o.alert_threshold_km THEN 'planned' ELSE 'ok' END`;
const columns = `o.*,o.next_service_mileage-o.current_mileage AS remaining_km,${statusSql} AS status,a.site_id,a.department_id`;

function scopedConditions(req, params) {
  const conditions = [];
  const scope = req.moduleAccess?.data_scope || {};
  const hasRestrictedScope = scope.allSites === false || Array.isArray(scope.departmentIds);
  if (!req.moduleAccess?.permissions?.includes('*') && hasRestrictedScope) {
    conditions.push('o.asset_id IS NOT NULL');
    appendAssetScope(req, conditions, params);
  }
  return conditions;
}

router.get('/',requireLogisticsPermission('plans.read'),validateQuery(oilChangeListSchema),async(req,res,next)=>{try{
  const {search,status}=req.validatedQuery;const params=[];const conditions=scopedConditions(req,params);
  if(search){params.push(`%${search}%`);conditions.push(`(o.registration_number ILIKE $${params.length} OR o.driver_name ILIKE $${params.length} OR o.vehicle_name ILIKE $${params.length})`);}
  if(status){params.push(status);conditions.push(`${statusSql}=$${params.length}`);}
  const where=conditions.length?`WHERE ${conditions.join(' AND ')}`:'';
  const rows=await logisticsQuery(`SELECT ${columns} FROM logistics_oil_change_tracking o LEFT JOIN logistics_assets a ON a.id=o.asset_id ${where} ORDER BY CASE ${statusSql} WHEN 'urgent' THEN 1 WHEN 'planned' THEN 2 WHEN 'out_of_service' THEN 3 ELSE 4 END,remaining_km,registration_number`,params);
  const summary=rows.rows.reduce((value,row)=>{value.total++;value[row.status]=(value[row.status]||0)+1;return value;},{total:0,urgent:0,planned:0,ok:0,out_of_service:0});
  res.json({data:rows.rows,summary});
}catch(error){next(error);}});

router.get('/:id/history',requireLogisticsPermission('plans.read'),async(req,res,next)=>{try{
  const params=[req.params.id];const conditions=['o.id=$1',...scopedConditions(req,params)];
  const tracking=await logisticsQuery(`SELECT 1 FROM logistics_oil_change_tracking o LEFT JOIN logistics_assets a ON a.id=o.asset_id WHERE ${conditions.join(' AND ')}`,params);
  if(!tracking.rowCount)return res.status(404).json({error:'Suivi de vidange introuvable.'});
  const history=await logisticsQuery('SELECT * FROM logistics_oil_change_history WHERE tracking_id=$1 ORDER BY service_date DESC,created_at DESC',[req.params.id]);res.json({data:history.rows});
}catch(error){next(error);}});

router.patch('/:id/mileage',requireLogisticsPermission('plans.update'),validateBody(oilChangeMileageSchema),async(req,res)=>{const client=await logisticsPool.connect();try{
  await client.query('BEGIN');const params=[req.params.id];const conditions=['o.id=$1',...scopedConditions(req,params)];const before=await client.query(`SELECT o.* FROM logistics_oil_change_tracking o LEFT JOIN logistics_assets a ON a.id=o.asset_id WHERE ${conditions.join(' AND ')} FOR UPDATE OF o`,params);
  if(!before.rows[0]){await client.query('ROLLBACK');return res.status(404).json({error:'Suivi de vidange introuvable.'});}
  if(req.validated.mileage<Number(before.rows[0].current_mileage)){await client.query('ROLLBACK');return res.status(409).json({error:'Le kilométrage ne peut pas diminuer.',code:'METER_DECREASE'});}
  const updated=await client.query('UPDATE logistics_oil_change_tracking SET current_mileage=$1,mileage_updated_at=$2,updated_at=NOW(),updated_by=$3,version=version+1 WHERE id=$4 AND version=$5 RETURNING *',[req.validated.mileage,req.validated.recordedAt,req.identity.id,req.params.id,req.validated.version]);
  if(!updated.rows[0]){await client.query('ROLLBACK');return res.status(409).json({error:'Cette fiche a déjà été modifiée.',code:'VERSION_CONFLICT'});}
  if(updated.rows[0].asset_id)await client.query('UPDATE logistics_assets SET current_mileage=GREATEST(current_mileage,$1),updated_at=NOW(),updated_by=$2,version=version+1 WHERE id=$3',[req.validated.mileage,req.identity.id,updated.rows[0].asset_id]);
  await writeAudit(client,req,'oil_change.mileage_updated','oil_change_tracking',req.params.id,before.rows[0],updated.rows[0]);await client.query('COMMIT');res.json(updated.rows[0]);
}catch(error){await client.query('ROLLBACK');return sendDatabaseError(res,error);}finally{client.release();}});

router.post('/:id/complete',requireLogisticsPermission('plans.update'),validateBody(oilChangeCompleteSchema),async(req,res)=>{const client=await logisticsPool.connect();try{
  await client.query('BEGIN');const params=[req.params.id];const conditions=['o.id=$1',...scopedConditions(req,params)];const before=await client.query(`SELECT o.* FROM logistics_oil_change_tracking o LEFT JOIN logistics_assets a ON a.id=o.asset_id WHERE ${conditions.join(' AND ')} FOR UPDATE OF o`,params);
  const row=before.rows[0];if(!row){await client.query('ROLLBACK');return res.status(404).json({error:'Suivi de vidange introuvable.'});}
  if(req.validated.mileage<Number(row.current_mileage)){await client.query('ROLLBACK');return res.status(409).json({error:'Le kilométrage de la vidange ne peut pas être inférieur au compteur actuel.',code:'METER_DECREASE'});}
  const nextMileage=nextOilChangeMileage(req.validated.mileage,row.service_interval_km);
  const updated=await client.query('UPDATE logistics_oil_change_tracking SET current_mileage=$1,last_service_mileage=$1,next_service_mileage=$2,last_service_date=$3,mileage_updated_at=$3,manual_status=NULL,notes=COALESCE($4,notes),updated_at=NOW(),updated_by=$5,version=version+1 WHERE id=$6 AND version=$7 RETURNING *',[req.validated.mileage,nextMileage,req.validated.serviceDate,req.validated.notes,req.identity.id,req.params.id,req.validated.version]);
  if(!updated.rows[0]){await client.query('ROLLBACK');return res.status(409).json({error:'Cette fiche a déjà été modifiée.',code:'VERSION_CONFLICT'});}
  await client.query('INSERT INTO logistics_oil_change_history(tracking_id,service_date,service_mileage,operation_label,previous_service_mileage,next_service_mileage,notes,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[row.id,req.validated.serviceDate,req.validated.mileage,req.validated.operationLabel||row.operation_label,row.last_service_mileage,nextMileage,req.validated.notes,req.identity.id]);
  if(row.asset_id)await client.query('UPDATE logistics_assets SET current_mileage=GREATEST(current_mileage,$1),updated_at=NOW(),updated_by=$2,version=version+1 WHERE id=$3',[req.validated.mileage,req.identity.id,row.asset_id]);
  await writeAudit(client,req,'oil_change.completed','oil_change_tracking',req.params.id,row,updated.rows[0],{nextServiceMileage:nextMileage});await client.query('COMMIT');res.json(updated.rows[0]);
}catch(error){await client.query('ROLLBACK');return sendDatabaseError(res,error);}finally{client.release();}});

export default router;
