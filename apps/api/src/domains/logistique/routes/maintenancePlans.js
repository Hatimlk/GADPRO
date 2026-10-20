import { Router } from 'express';
import { logisticsPool, logisticsQuery } from '../../../db.js';
import { appendAssetScope, isSiteAllowed, requireLogisticsPermission } from '../middleware/authorization.js';
import { maintenancePlanCreateSchema, maintenancePlanUpdateSchema, validateBody } from '../schemas/validation.js';
import { sendDatabaseError, writeAudit } from '../services/audit.js';
import { calculatePreventiveDue } from '../services/preventive.js';

const router = Router();
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
router.param('id', (req,res,next,value) => UUID.test(value) ? next() : res.status(400).json({ error: 'Identifiant invalide.' }));

const planColumns = `p.*,c.name AS category_name,
  COALESCE((SELECT json_agg(json_build_object('id',t.id,'triggerType',t.trigger_type,'intervalValue',t.interval_value,'intervalUnit',t.interval_unit,'warningThreshold',t.warning_threshold) ORDER BY t.trigger_type) FROM logistics_maintenance_plan_triggers t WHERE t.plan_id=p.id),'[]') AS triggers`;
const planFrom = 'FROM logistics_maintenance_plans p LEFT JOIN logistics_asset_categories c ON c.id=p.category_id';

router.get('/', requireLogisticsPermission('plans.read'), async (req,res,next) => { try {
  const params=[]; const scope=['a.deleted_at IS NULL']; appendAssetScope(req,scope,params);
  const result=await logisticsQuery(`SELECT ${planColumns},(SELECT COUNT(*)::int FROM logistics_maintenance_plan_assets pa3 JOIN logistics_assets a ON a.id=pa3.asset_id WHERE pa3.plan_id=p.id AND pa3.active=true AND ${scope.join(' AND ')}) AS asset_count ${planFrom} WHERE p.deleted_at IS NULL AND EXISTS(SELECT 1 FROM logistics_maintenance_plan_assets pa2 JOIN logistics_assets a ON a.id=pa2.asset_id WHERE pa2.plan_id=p.id AND pa2.active=true AND ${scope.join(' AND ')}) ORDER BY p.operation_name`,params);
  res.json({ data:result.rows });
} catch(error){next(error);} });

router.get('/:id', requireLogisticsPermission('plans.read'), async(req,res,next)=>{try{
  const params=[req.params.id];const scope=['p.id=$1','p.deleted_at IS NULL','a.deleted_at IS NULL'];appendAssetScope(req,scope,params);
  const plan=await logisticsQuery(`SELECT ${planColumns} ${planFrom} WHERE p.id=$1 AND p.deleted_at IS NULL`,[req.params.id]);
  if(!plan.rows[0])return res.status(404).json({error:'Plan introuvable.'});
  const assets=await logisticsQuery(`SELECT pa.*,a.fleet_number,a.brand,a.model,a.current_mileage,a.current_operating_hours FROM logistics_maintenance_plan_assets pa JOIN logistics_assets a ON a.id=pa.asset_id JOIN logistics_maintenance_plans p ON p.id=pa.plan_id WHERE ${scope.join(' AND ')} ORDER BY a.fleet_number`,params);
  if(!assets.rowCount)return res.status(404).json({error:'Plan introuvable dans votre périmètre.'});res.json({...plan.rows[0],assets:assets.rows});
}catch(error){next(error);}});

router.post('/',requireLogisticsPermission('plans.create'),validateBody(maintenancePlanCreateSchema),async(req,res)=>{const v=req.validated;const client=await logisticsPool.connect();try{
  await client.query('BEGIN');const scopeParams=[v.assetIds];const scope=['a.id=ANY($1::uuid[])','a.deleted_at IS NULL'];appendAssetScope(req,scope,scopeParams);const assets=await client.query(`SELECT a.* FROM logistics_assets a WHERE ${scope.join(' AND ')} FOR SHARE`,scopeParams);
  if(assets.rowCount!==v.assetIds.length){await client.query('ROLLBACK');return res.status(403).json({error:'Un ou plusieurs actifs sont introuvables ou hors périmètre.'});}
  if(v.categoryId&&assets.rows.some(a=>a.category_id!==v.categoryId)){await client.query('ROLLBACK');return res.status(400).json({error:'Tous les actifs doivent appartenir à la catégorie du plan.'});}
  const inserted=await client.query(`INSERT INTO logistics_maintenance_plans(code,operation_name,description,category_id,responsible_user_id,estimated_duration_hours,estimated_cost,status,created_by,updated_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$9) RETURNING *`,[v.code,v.operationName,v.description,v.categoryId,v.responsibleUserId,v.estimatedDurationHours,v.estimatedCost,v.status,req.identity.id]);const plan=inserted.rows[0];
  const triggerRows=[];for(const t of v.triggers){const row=await client.query(`INSERT INTO logistics_maintenance_plan_triggers(plan_id,trigger_type,interval_value,interval_unit,warning_threshold,created_by) VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,[plan.id,t.triggerType,t.intervalValue,t.intervalUnit,t.warningThreshold,req.identity.id]);triggerRows.push(row.rows[0]);}
  for(const asset of assets.rows){const pa=await client.query(`INSERT INTO logistics_maintenance_plan_assets(plan_id,asset_id,last_completed_mileage,last_completed_hours,created_by,updated_by) VALUES($1,$2,$3,$4,$5,$5) RETURNING *`,[plan.id,asset.id,asset.current_mileage,asset.current_operating_hours,req.identity.id]);const due=calculatePreventiveDue({planAsset:pa.rows[0],asset,triggers:triggerRows});await client.query('UPDATE logistics_maintenance_plan_assets SET next_due_date=$1,next_due_mileage=$2,next_due_hours=$3 WHERE id=$4',[due.dueDate,due.dueMileage,due.dueHours,pa.rows[0].id]);}
  await writeAudit(client,req,'maintenance_plan.created','maintenance_plan',plan.id,null,plan,{assetCount:assets.rowCount});await client.query('COMMIT');res.status(201).json(plan);
}catch(error){await client.query('ROLLBACK');return sendDatabaseError(res,error);}finally{client.release();}});

router.patch('/:id',requireLogisticsPermission('plans.update'),validateBody(maintenancePlanUpdateSchema),async(req,res)=>{const mapping={operationName:'operation_name',description:'description',responsibleUserId:'responsible_user_id',estimatedDurationHours:'estimated_duration_hours',estimatedCost:'estimated_cost',status:'status'};const client=await logisticsPool.connect();try{
  await client.query('BEGIN');const scopeParams=[req.params.id];const assetScope=['a.deleted_at IS NULL'];appendAssetScope(req,assetScope,scopeParams);const before=await client.query(`SELECT p.* FROM logistics_maintenance_plans p WHERE p.id=$1 AND p.deleted_at IS NULL AND EXISTS(SELECT 1 FROM logistics_maintenance_plan_assets pa JOIN logistics_assets a ON a.id=pa.asset_id WHERE pa.plan_id=p.id AND pa.active=true AND ${assetScope.join(' AND ')}) FOR UPDATE`,scopeParams);if(!before.rows[0]){await client.query('ROLLBACK');return res.status(404).json({error:'Plan introuvable.'});}const targets=await client.query('SELECT a.site_id,a.department_id FROM logistics_maintenance_plan_assets pa JOIN logistics_assets a ON a.id=pa.asset_id WHERE pa.plan_id=$1 AND pa.active=true',[req.params.id]);if(targets.rows.some(asset=>!isSiteAllowed(req,asset.site_id,asset.department_id))){await client.query('ROLLBACK');return res.status(403).json({error:'Ce plan couvre également des actifs hors de votre périmètre et ne peut pas être modifié.'});}const sets=[];const params=[];for(const[key,column]of Object.entries(mapping))if(Object.hasOwn(req.validated,key)){params.push(req.validated[key]);sets.push(`${column}=$${params.length}`);}if(!sets.length){await client.query('ROLLBACK');return res.status(400).json({error:'Aucune modification fournie.'});}params.push(req.identity.id,req.params.id,req.validated.version);const updated=await client.query(`UPDATE logistics_maintenance_plans SET ${sets.join(',')},updated_by=$${params.length-2},updated_at=NOW(),version=version+1 WHERE id=$${params.length-1} AND version=$${params.length} RETURNING *`,params);if(!updated.rows[0]){await client.query('ROLLBACK');return res.status(409).json({error:'Le plan a été modifié.',code:'VERSION_CONFLICT'});}await writeAudit(client,req,'maintenance_plan.updated','maintenance_plan',req.params.id,before.rows[0],updated.rows[0]);await client.query('COMMIT');res.json(updated.rows[0]);
}catch(error){await client.query('ROLLBACK');return sendDatabaseError(res,error);}finally{client.release();}});

export default router;
