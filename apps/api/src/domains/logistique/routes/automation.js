import { Router } from 'express';
import { logisticsPool, logisticsQuery } from '../../../db.js';
import { requireLogisticsPermission } from '../middleware/authorization.js';
import { automationRunSchema, validateBody } from '../schemas/validation.js';
import { writeAudit } from '../services/audit.js';
import { calculatePreventiveDue } from '../services/preventive.js';

const router = Router();

async function recalculatePreventive(client, actorUserId) {
  const rows=await client.query(`SELECT pa.*,a.current_mileage,a.current_operating_hours,a.fleet_number,p.operation_name,p.id AS maintenance_plan_id,
    COALESCE(json_agg(json_build_object('trigger_type',t.trigger_type,'interval_value',t.interval_value,'interval_unit',t.interval_unit,'warning_threshold',t.warning_threshold)) FILTER(WHERE t.id IS NOT NULL),'[]') AS triggers
    FROM logistics_maintenance_plan_assets pa JOIN logistics_maintenance_plans p ON p.id=pa.plan_id JOIN logistics_assets a ON a.id=pa.asset_id
    LEFT JOIN logistics_maintenance_plan_triggers t ON t.plan_id=p.id
    WHERE p.status='active' AND pa.active=true AND a.deleted_at IS NULL GROUP BY pa.id,a.id,p.id`);
  let alerts=0;
  for(const row of rows.rows){
    const due=calculatePreventiveDue({planAsset:row,asset:row,triggers:row.triggers});
    await client.query('UPDATE logistics_maintenance_plan_assets SET next_due_date=$1,next_due_mileage=$2,next_due_hours=$3,updated_at=NOW(),updated_by=$4 WHERE id=$5',[due.dueDate,due.dueMileage,due.dueHours,actorUserId,row.id]);
    const event=await client.query(`INSERT INTO logistics_maintenance_due_events(plan_asset_id,plan_id,asset_id,cycle_key,due_date,due_mileage,due_hours,status)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(plan_id,asset_id,cycle_key) DO UPDATE SET due_date=EXCLUDED.due_date,due_mileage=EXCLUDED.due_mileage,due_hours=EXCLUDED.due_hours,
      status=CASE WHEN logistics_maintenance_due_events.status IN ('created','completed','dismissed') THEN logistics_maintenance_due_events.status ELSE EXCLUDED.status END,calculated_at=NOW(),updated_at=NOW() RETURNING *`,[row.id,row.plan_id,row.asset_id,due.cycleKey,due.dueDate,due.dueMileage,due.dueHours,due.status]);
    const alertKey=`maintenance:${event.rows[0].id}`;
    if(['due','overdue'].includes(due.status)){
      await client.query(`INSERT INTO logistics_alerts(alert_type,asset_id,due_event_id,severity,title,message,deduplication_key) VALUES($1,$2,$3,$4,$5,$6,$7)
        ON CONFLICT(deduplication_key) DO UPDATE SET severity=EXCLUDED.severity,title=EXCLUDED.title,message=EXCLUDED.message,updated_at=NOW(),status=CASE WHEN logistics_alerts.status='resolved' THEN 'open' ELSE logistics_alerts.status END`,[due.status==='overdue'?'maintenance_overdue':'maintenance_due',row.asset_id,event.rows[0].id,due.status==='overdue'?'critical':'warning',`${row.operation_name} — ${row.fleet_number}`,due.reasons.join(' · ')||'Échéance de maintenance atteinte.',alertKey]);
      alerts+=1;
    } else await client.query("UPDATE logistics_alerts SET status='resolved',resolved_at=NOW(),resolved_by=$1,updated_at=NOW(),version=version+1 WHERE deduplication_key=$2 AND status!='resolved'",[actorUserId,alertKey]);
  }
  return { calculated:rows.rowCount, alerts };
}

router.get('/runs',requireLogisticsPermission('settings.admin'),async(_req,res,next)=>{try{const result=await logisticsQuery('SELECT * FROM logistics_job_runs ORDER BY started_at DESC LIMIT 50');res.json({data:result.rows});}catch(error){next(error);}});

router.post('/daily',requireLogisticsPermission('settings.admin'),validateBody(automationRunSchema),async(req,res,next)=>{
  const runKey=req.validated.runKey||new Date().toISOString().slice(0,10);
  let run;
  try{
    const inserted=await logisticsQuery(`INSERT INTO logistics_job_runs(job_name,run_key,triggered_by) VALUES('daily-logistics',$1,$2) ON CONFLICT(job_name,run_key) DO NOTHING RETURNING *`,[runKey,req.identity.id]);
    if(!inserted.rowCount){const existing=await logisticsQuery("SELECT * FROM logistics_job_runs WHERE job_name='daily-logistics' AND run_key=$1",[runKey]);return res.json({...existing.rows[0],replayed:true});}
    run=inserted.rows[0];
  }catch(error){return next(error);}
  const client=await logisticsPool.connect();
  try{
    await client.query('BEGIN');
    const preventive=await recalculatePreventive(client,req.identity.id);
    const downtime=await client.query(`INSERT INTO logistics_asset_downtime_periods(asset_id,intervention_id,started_at,ended_at,reason,created_by)
      SELECT asset_id,id,actual_start_at,actual_end_at,'Intervention '||reference,$1 FROM logistics_maintenance_interventions
      WHERE actual_start_at IS NOT NULL AND deleted_at IS NULL
      ON CONFLICT(intervention_id) DO UPDATE SET started_at=EXCLUDED.started_at,ended_at=EXCLUDED.ended_at,reason=EXCLUDED.reason,updated_at=NOW()`,[req.identity.id]);
    const delayed=await client.query(`INSERT INTO logistics_alerts(alert_type,asset_id,severity,title,message,deduplication_key)
      SELECT 'delayed_intervention',i.asset_id,CASE WHEN i.priority='critical' THEN 'critical' ELSE 'warning' END,'Intervention en retard — '||i.reference,
      'Échéance planifiée dépassée pour '||a.fleet_number,'delayed-intervention:'||i.id FROM logistics_maintenance_interventions i JOIN logistics_assets a ON a.id=i.asset_id
      WHERE i.planned_end_at<NOW() AND i.status NOT IN ('completed','invoiced','closed','rejected','cancelled') AND i.deleted_at IS NULL
      ON CONFLICT(deduplication_key) DO UPDATE SET severity=EXCLUDED.severity,title=EXCLUDED.title,message=EXCLUDED.message,status='open',resolved_at=NULL,resolved_by=NULL,updated_at=NOW()`);
    await client.query(`UPDATE logistics_alerts al SET status='resolved',resolved_at=NOW(),resolved_by=$1,updated_at=NOW(),version=version+1
      WHERE al.alert_type='delayed_intervention' AND al.status!='resolved' AND NOT EXISTS(SELECT 1 FROM logistics_maintenance_interventions i WHERE al.deduplication_key='delayed-intervention:'||i.id AND i.planned_end_at<NOW() AND i.status NOT IN ('completed','invoiced','closed','rejected','cancelled') AND i.deleted_at IS NULL)`,[req.identity.id]);
    const immobilized=await client.query(`INSERT INTO logistics_alerts(alert_type,asset_id,severity,title,message,deduplication_key)
      SELECT 'immobilized_asset',a.id,'critical','Actif immobilisé — '||a.fleet_number,a.brand||' '||a.model||' est déclaré immobilisé.','immobilized-asset:'||a.id
      FROM logistics_assets a WHERE a.status='immobilized' AND a.deleted_at IS NULL
      ON CONFLICT(deduplication_key) DO UPDATE SET title=EXCLUDED.title,message=EXCLUDED.message,status='open',resolved_at=NULL,resolved_by=NULL,updated_at=NOW()`);
    await client.query(`UPDATE logistics_alerts al SET status='resolved',resolved_at=NOW(),resolved_by=$1,updated_at=NOW(),version=version+1
      WHERE al.alert_type='immobilized_asset' AND al.status!='resolved' AND NOT EXISTS(SELECT 1 FROM logistics_assets a WHERE al.asset_id=a.id AND a.status='immobilized' AND a.deleted_at IS NULL)`,[req.identity.id]);
    const result={preventive,downtimePeriodsSynchronized:downtime.rowCount,delayedAlerts:delayed.rowCount,immobilizedAlerts:immobilized.rowCount};
    await writeAudit(client,req,'automation.daily_succeeded','job_run',run.id,null,result,{runKey});
    await client.query('COMMIT');
    const completed=await logisticsQuery("UPDATE logistics_job_runs SET status='succeeded',finished_at=NOW(),result=$1 WHERE id=$2 RETURNING *",[result,run.id]);
    res.status(201).json(completed.rows[0]);
  }catch(error){
    await client.query('ROLLBACK');
    await logisticsQuery("UPDATE logistics_job_runs SET status='failed',finished_at=NOW(),error_message=$1 WHERE id=$2",[String(error.message||'Erreur').slice(0,2000),run.id]).catch(()=>{});
    next(error);
  }finally{client.release();}
});

export default router;
