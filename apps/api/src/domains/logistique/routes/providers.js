import { Router } from 'express';
import { logisticsPool, logisticsQuery } from '../../../db.js';
import { requireLogisticsPermission } from '../middleware/authorization.js';
import { providerCreateSchema, providerListSchema, providerUpdateSchema, validateBody, validateQuery } from '../schemas/validation.js';
import { sendDatabaseError, writeAudit } from '../services/audit.js';

const router = Router();
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
router.param('id',(req,res,next,value)=>UUID.test(value)?next():res.status(400).json({error:'Identifiant invalide.'}));

const providerSelect = `SELECT p.*,COALESCE(json_agg(json_build_object('id',s.id,'code',s.code,'name',s.name)) FILTER (WHERE s.id IS NOT NULL),'[]') AS specialties
  FROM logistics_service_providers p LEFT JOIN logistics_provider_specialties ps ON ps.provider_id=p.id LEFT JOIN logistics_specialties s ON s.id=ps.specialty_id`;

router.get('/',requireLogisticsPermission('providers.read'),validateQuery(providerListSchema),async(req,res,next)=>{try{
  const {page,limit,search,status}=req.validatedQuery;const params=[];const conditions=['p.deleted_at IS NULL'];
  if(search){params.push(`%${search}%`);conditions.push(`(p.company_name ILIKE $${params.length} OR p.supplier_code ILIKE $${params.length})`);}if(status){params.push(status);conditions.push(`p.status=$${params.length}`);}
  const where=conditions.join(' AND ');const total=await logisticsQuery(`SELECT COUNT(*)::int AS count FROM logistics_service_providers p WHERE ${where}`,params);
  params.push(limit,(page-1)*limit);const rows=await logisticsQuery(`${providerSelect} WHERE ${where} GROUP BY p.id ORDER BY p.company_name LIMIT $${params.length-1} OFFSET $${params.length}`,params);
  res.json({data:rows.rows,page,limit,total:total.rows[0].count,totalPages:Math.ceil(total.rows[0].count/limit)});
}catch(error){next(error);}});

router.post('/',requireLogisticsPermission('providers.create'),validateBody(providerCreateSchema),async(req,res)=>{const v=req.validated;const client=await logisticsPool.connect();try{
  await client.query('BEGIN');
  const result=await client.query(`INSERT INTO logistics_service_providers(supplier_code,company_name,contact_name,phone,email,address,contract_reference,contract_starts_at,contract_ends_at,payment_terms,status,notes,created_by,updated_by)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$13) RETURNING *`,[v.supplierCode,v.companyName,v.contactName,v.phone,v.email,v.address,v.contractReference,v.contractStartsAt,v.contractEndsAt,v.paymentTerms,v.status,v.notes,req.identity.id]);
  for(const specialtyId of v.specialtyIds)await client.query('INSERT INTO logistics_provider_specialties(provider_id,specialty_id,created_by) VALUES($1,$2,$3)',[result.rows[0].id,specialtyId,req.identity.id]);
  await writeAudit(client,req,'provider.created','provider',result.rows[0].id,null,result.rows[0]);await client.query('COMMIT');res.status(201).json(result.rows[0]);
}catch(error){await client.query('ROLLBACK');return sendDatabaseError(res,error);}finally{client.release();}});

router.get('/reference/specialties',requireLogisticsPermission('providers.read'),async(_req,res,next)=>{try{const result=await logisticsQuery('SELECT id,code,name FROM logistics_specialties WHERE active=true ORDER BY name');res.json({data:result.rows});}catch(error){next(error);}});

router.get('/:id',requireLogisticsPermission('providers.read'),async(req,res,next)=>{try{
  const provider=await logisticsQuery(`${providerSelect} WHERE p.id=$1 AND p.deleted_at IS NULL GROUP BY p.id`,[req.params.id]);if(!provider.rows[0])return res.status(404).json({error:'Prestataire introuvable.'});
  const performance=await logisticsQuery(`SELECT COUNT(*)::int AS intervention_count,COALESCE(SUM(actual_cost),0) AS total_cost,
    AVG(EXTRACT(EPOCH FROM(actual_end_at-actual_start_at))/86400) FILTER(WHERE actual_start_at IS NOT NULL AND actual_end_at IS NOT NULL) AS average_completion_days,
    CASE WHEN COUNT(*) FILTER(WHERE actual_end_at IS NOT NULL AND planned_end_at IS NOT NULL)>0 THEN
      ROUND(100.0*COUNT(*) FILTER(WHERE actual_end_at<=planned_end_at)/COUNT(*) FILTER(WHERE actual_end_at IS NOT NULL AND planned_end_at IS NOT NULL),1) ELSE NULL END AS on_time_rate
    FROM logistics_maintenance_interventions WHERE provider_id=$1 AND deleted_at IS NULL`,[req.params.id]);
  res.json({...provider.rows[0],performance:performance.rows[0]});
}catch(error){next(error);}});

router.patch('/:id',requireLogisticsPermission('providers.update'),validateBody(providerUpdateSchema),async(req,res)=>{const mapping={supplierCode:'supplier_code',companyName:'company_name',contactName:'contact_name',phone:'phone',email:'email',address:'address',contractReference:'contract_reference',contractStartsAt:'contract_starts_at',contractEndsAt:'contract_ends_at',paymentTerms:'payment_terms',status:'status',notes:'notes'};const client=await logisticsPool.connect();try{
  await client.query('BEGIN');const before=await client.query('SELECT * FROM logistics_service_providers WHERE id=$1 AND deleted_at IS NULL FOR UPDATE',[req.params.id]);if(!before.rows[0]){await client.query('ROLLBACK');return res.status(404).json({error:'Prestataire introuvable.'});}
  const sets=[];const params=[];for(const[key,column]of Object.entries(mapping))if(Object.hasOwn(req.validated,key)){params.push(req.validated[key]);sets.push(`${column}=$${params.length}`);}if(!sets.length&&!Object.hasOwn(req.validated,'specialtyIds')){await client.query('ROLLBACK');return res.status(400).json({error:'Aucune modification fournie.'});}
  let after=before.rows[0];if(sets.length){params.push(req.identity.id,req.params.id,req.validated.version);const result=await client.query(`UPDATE logistics_service_providers SET ${sets.join(',')},updated_by=$${params.length-2},updated_at=NOW(),version=version+1 WHERE id=$${params.length-1} AND version=$${params.length} RETURNING *`,params);if(!result.rows[0]){await client.query('ROLLBACK');return res.status(409).json({error:'La fiche a été modifiée.',code:'VERSION_CONFLICT'});}after=result.rows[0];}
  else {const result=await client.query('UPDATE logistics_service_providers SET updated_by=$1,updated_at=NOW(),version=version+1 WHERE id=$2 AND version=$3 RETURNING *',[req.identity.id,req.params.id,req.validated.version]);if(!result.rows[0]){await client.query('ROLLBACK');return res.status(409).json({error:'La fiche a été modifiée.',code:'VERSION_CONFLICT'});}after=result.rows[0];}
  if(Object.hasOwn(req.validated,'specialtyIds')){await client.query('DELETE FROM logistics_provider_specialties WHERE provider_id=$1',[req.params.id]);for(const specialtyId of req.validated.specialtyIds)await client.query('INSERT INTO logistics_provider_specialties(provider_id,specialty_id,created_by) VALUES($1,$2,$3)',[req.params.id,specialtyId,req.identity.id]);}
  await writeAudit(client,req,'provider.updated','provider',req.params.id,before.rows[0],after);await client.query('COMMIT');res.json(after);
}catch(error){await client.query('ROLLBACK');return sendDatabaseError(res,error);}finally{client.release();}});

export default router;
