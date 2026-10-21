import { Router } from 'express';
import { logisticsQuery } from '../../../db.js';
import { appendAssetScope, requireLogisticsPermission } from '../middleware/authorization.js';
import { analyticsQuerySchema, validateQuery } from '../schemas/validation.js';
import { calculateAvailability, calculateTrackedOperatingCost, normalizeAnalyticsPeriod } from '../services/analytics.js';

const router = Router();

function scopedFilter(req, query) {
  const params = [query.from, query.to];
  const conditions = ['a.deleted_at IS NULL'];
  appendAssetScope(req, conditions, params);
  for (const [key,column] of [['siteId','a.site_id'],['categoryId','a.category_id'],['assetId','a.id']]) {
    if (query[key]) { params.push(query[key]); conditions.push(`${column}=$${params.length}`); }
  }
  return { params, where: conditions.join(' AND ') };
}

router.get('/overview', requireLogisticsPermission('reports.read'), validateQuery(analyticsQuerySchema), async (req,res,next) => {
  try {
    const period=normalizeAnalyticsPeriod(req.validatedQuery.from,req.validatedQuery.to);
    if(!period)return res.status(400).json({error:'Période invalide ou supérieure à trois ans.'});
    const {params,where}=scopedFilter(req,req.validatedQuery);
    const endExclusive=`($2::date + INTERVAL '1 day')`;
    const [assets,maintenance,fuel,tires,monthly,providers,topAssets]=await Promise.all([
      logisticsQuery(`SELECT COUNT(*)::int AS count FROM logistics_assets a WHERE ${where} AND a.status NOT IN ('sold','decommissioned')`,params),
      logisticsQuery(`SELECT COALESCE(SUM(i.actual_cost),0) AS cost,COALESCE(SUM(i.downtime_hours),0) AS downtime_hours,
        COUNT(*) FILTER(WHERE i.maintenance_kind='preventive')::int AS preventive,
        COUNT(*) FILTER(WHERE i.maintenance_kind='corrective')::int AS corrective
        FROM logistics_maintenance_interventions i JOIN logistics_assets a ON a.id=i.asset_id
        WHERE ${where} AND COALESCE(i.actual_end_at,i.reported_at)>=$1::date AND COALESCE(i.actual_end_at,i.reported_at)<${endExclusive} AND i.deleted_at IS NULL`,params),
      logisticsQuery(`SELECT COALESCE(SUM(ft.total_amount),0) AS cost FROM logistics_fuel_transactions ft JOIN logistics_assets a ON a.id=ft.asset_id
        WHERE ${where} AND ft.occurred_at>=$1::date AND ft.occurred_at<${endExclusive}`,params),
      logisticsQuery(`SELECT COALESCE(SUM(tm.cost),0) AS cost FROM logistics_tire_movements tm JOIN logistics_assets a ON a.id=COALESCE(tm.target_asset_id,tm.source_asset_id)
        WHERE ${where} AND tm.intervention_id IS NULL AND tm.occurred_at>=$1::date AND tm.occurred_at<${endExclusive}`,params),
      logisticsQuery(`WITH months AS (SELECT generate_series(date_trunc('month',$1::date),date_trunc('month',$2::date),INTERVAL '1 month') AS month),
        m AS (SELECT date_trunc('month',COALESCE(i.actual_end_at,i.reported_at)) month,SUM(i.actual_cost) cost FROM logistics_maintenance_interventions i JOIN logistics_assets a ON a.id=i.asset_id WHERE ${where} AND COALESCE(i.actual_end_at,i.reported_at)>=$1::date AND COALESCE(i.actual_end_at,i.reported_at)<${endExclusive} AND i.deleted_at IS NULL GROUP BY 1),
        f AS (SELECT date_trunc('month',ft.occurred_at) month,SUM(ft.total_amount) cost FROM logistics_fuel_transactions ft JOIN logistics_assets a ON a.id=ft.asset_id WHERE ${where} AND ft.occurred_at>=$1::date AND ft.occurred_at<${endExclusive} GROUP BY 1)
        SELECT TO_CHAR(months.month,'YYYY-MM') month,COALESCE(m.cost,0) maintenance_cost,COALESCE(f.cost,0) fuel_cost FROM months LEFT JOIN m USING(month) LEFT JOIN f USING(month) ORDER BY months.month`,params),
      logisticsQuery(`SELECT p.id,p.company_name,COUNT(i.id)::int AS intervention_count,COALESCE(SUM(i.actual_cost),0) AS total_cost,
        ROUND((AVG(EXTRACT(EPOCH FROM(i.actual_end_at-i.actual_start_at))/86400) FILTER(WHERE i.actual_start_at IS NOT NULL AND i.actual_end_at IS NOT NULL))::numeric,1) AS average_completion_days,
        CASE WHEN COUNT(*) FILTER(WHERE i.actual_end_at IS NOT NULL AND i.planned_end_at IS NOT NULL)>0 THEN ROUND(100.0*COUNT(*) FILTER(WHERE i.actual_end_at<=i.planned_end_at)/COUNT(*) FILTER(WHERE i.actual_end_at IS NOT NULL AND i.planned_end_at IS NOT NULL),1) ELSE NULL END AS on_time_rate
        FROM logistics_service_providers p JOIN logistics_maintenance_interventions i ON i.provider_id=p.id JOIN logistics_assets a ON a.id=i.asset_id
        WHERE ${where} AND COALESCE(i.actual_end_at,i.reported_at)>=$1::date AND COALESCE(i.actual_end_at,i.reported_at)<${endExclusive} AND i.deleted_at IS NULL AND p.deleted_at IS NULL
        GROUP BY p.id,p.company_name ORDER BY total_cost DESC LIMIT 10`,params),
      logisticsQuery(`SELECT a.id,a.fleet_number,a.brand,a.model,COALESCE(SUM(i.actual_cost),0) AS maintenance_cost
        FROM logistics_assets a JOIN logistics_maintenance_interventions i ON i.asset_id=a.id
        WHERE ${where} AND COALESCE(i.actual_end_at,i.reported_at)>=$1::date AND COALESCE(i.actual_end_at,i.reported_at)<${endExclusive} AND i.deleted_at IS NULL
        GROUP BY a.id ORDER BY maintenance_cost DESC LIMIT 10`,params),
    ]);
    const maintenanceCost=Number(maintenance.rows[0].cost),fuelCost=Number(fuel.rows[0].cost),tireCost=Number(tires.rows[0].cost);
    const assetCount=assets.rows[0].count,downtimeHours=Number(maintenance.rows[0].downtime_hours);
    res.json({period,methodology:{availabilityBasis:'calendar_24x7',costLabel:'Coût d’exploitation suivi',tcoAvailable:false,repeatRepairWindowDays:null},summary:{assetCount,maintenanceCost,fuelCost,tireCost,trackedOperatingCost:calculateTrackedOperatingCost({maintenance:maintenanceCost,fuel:fuelCost,tires:tireCost}),downtimeHours,availabilityRate:calculateAvailability(assetCount*period.hoursPerAsset,downtimeHours),preventive:maintenance.rows[0].preventive,corrective:maintenance.rows[0].corrective},monthly:monthly.rows.map(x=>({...x,maintenance_cost:Number(x.maintenance_cost),fuel_cost:Number(x.fuel_cost)})),providers:providers.rows.map(x=>({...x,total_cost:Number(x.total_cost),average_completion_days:x.average_completion_days===null?null:Number(x.average_completion_days),on_time_rate:x.on_time_rate===null?null:Number(x.on_time_rate),repeat_repair_rate:null})),topAssets:topAssets.rows.map(x=>({...x,maintenance_cost:Number(x.maintenance_cost)}))});
  } catch(error){next(error);}
});

export default router;
