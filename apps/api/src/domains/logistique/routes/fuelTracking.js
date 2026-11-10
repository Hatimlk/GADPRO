import { Router } from 'express';
import { logisticsPool,logisticsQuery } from '../../../db.js';
import { requireLogisticsPermission } from '../middleware/authorization.js';
import { fuelTrackingImportSchema,fuelTrackingListSchema,validateBody,validateQuery } from '../schemas/validation.js';
import { sendDatabaseError,writeAudit } from '../services/audit.js';
import { fuelTrackingControl,normalizeRegistration } from '../services/fuelTracking.js';

const router=Router();

router.get('/',requireLogisticsPermission('fuel.read'),validateQuery(fuelTrackingListSchema),async(req,res,next)=>{try{
  const monthsResult=await logisticsQuery('SELECT month,COUNT(*)::int AS entries FROM logistics_fuel_tracking_entries GROUP BY month ORDER BY month');
  const months=monthsResult.rows.map(row=>({month:Number(row.month),entries:row.entries}));
  const selectedMonth=req.validatedQuery.month??months.at(-1)?.month??new Date().getMonth()+1;
  const [summary,entries]=await Promise.all([
    logisticsQuery(`SELECT v.id,v.registration_number,v.vehicle_type,v.target_consumption,v.tank_capacity,
      COALESCE(SUM(e.distance_travelled),0) AS total_distance,COALESCE(SUM(e.quantity),0) AS total_quantity,
      CASE WHEN SUM(e.distance_travelled)>0 THEN SUM(e.quantity)/SUM(e.distance_travelled)*100 ELSE NULL END AS actual_consumption,
      COUNT(e.id)::int AS entry_count,COUNT(e.id) FILTER(WHERE e.tank_control='exceeded')::int AS exceeded_count
      FROM logistics_fuel_tracking_vehicles v LEFT JOIN logistics_fuel_tracking_entries e ON e.vehicle_id=v.id AND e.month=$1
      GROUP BY v.id ORDER BY v.registration_number`,[selectedMonth]),
    logisticsQuery(`SELECT e.*,v.registration_number,v.vehicle_type,v.tank_capacity,v.target_consumption
      FROM logistics_fuel_tracking_entries e JOIN logistics_fuel_tracking_vehicles v ON v.id=e.vehicle_id
      WHERE e.month=$1 ORDER BY e.occurred_on DESC,e.source_row DESC LIMIT $2`,[selectedMonth,req.validatedQuery.limit]),
  ]);
  const active=summary.rows.filter(row=>row.entry_count>0);const totals=active.reduce((value,row)=>{value.distance+=Number(row.total_distance);value.quantity+=Number(row.total_quantity);value.entries+=row.entry_count;value.exceeded+=row.exceeded_count;return value;},{distance:0,quantity:0,entries:0,exceeded:0});
  res.json({months,selectedMonth,summary:summary.rows,entries:entries.rows,totals:{...totals,consumption:totals.distance>0?totals.quantity/totals.distance*100:null}});
}catch(error){next(error);}});

router.post('/import',requireLogisticsPermission('fuel.create'),validateBody(fuelTrackingImportSchema),async(req,res)=>{const client=await logisticsPool.connect();try{
  await client.query('BEGIN');const {sourceName,vehicles,entries}=req.validated;const vehicleMap=new Map();let vehicleCount=0;let entryCount=0;
  for(const vehicle of vehicles){const normalized=normalizeRegistration(vehicle.registrationNumber);if(!normalized)continue;const result=await client.query(`INSERT INTO logistics_fuel_tracking_vehicles(registration_number,normalized_registration,vehicle_type,target_consumption,tank_capacity,source,created_by,updated_by)
    VALUES($1,$2,$3,$4,$5,$6,$7,$7) ON CONFLICT(normalized_registration) DO UPDATE SET registration_number=EXCLUDED.registration_number,vehicle_type=COALESCE(EXCLUDED.vehicle_type,logistics_fuel_tracking_vehicles.vehicle_type),target_consumption=COALESCE(EXCLUDED.target_consumption,logistics_fuel_tracking_vehicles.target_consumption),tank_capacity=COALESCE(EXCLUDED.tank_capacity,logistics_fuel_tracking_vehicles.tank_capacity),source=EXCLUDED.source,updated_at=NOW(),updated_by=EXCLUDED.updated_by,version=logistics_fuel_tracking_vehicles.version+1 RETURNING id`,[vehicle.registrationNumber.toUpperCase(),normalized,vehicle.vehicleType,vehicle.targetConsumption,vehicle.tankCapacity,sourceName,req.identity.id]);vehicleMap.set(normalized,result.rows[0].id);vehicleCount++;}
  for(const entry of entries){const normalized=normalizeRegistration(entry.registrationNumber);let vehicleId=vehicleMap.get(normalized);if(!vehicleId){const found=await client.query(`INSERT INTO logistics_fuel_tracking_vehicles(registration_number,normalized_registration,tank_capacity,source,created_by,updated_by) VALUES($1,$2,$3,$4,$5,$5) ON CONFLICT(normalized_registration) DO UPDATE SET tank_capacity=COALESCE(logistics_fuel_tracking_vehicles.tank_capacity,EXCLUDED.tank_capacity),updated_at=NOW(),updated_by=EXCLUDED.updated_by RETURNING id`,[entry.registrationNumber.toUpperCase(),normalized,entry.tankCapacity,sourceName,req.identity.id]);vehicleId=found.rows[0].id;vehicleMap.set(normalized,vehicleId);}
    const capacity=entry.tankCapacity??vehicles.find(vehicle=>normalizeRegistration(vehicle.registrationNumber)===normalized)?.tankCapacity??null;const control=fuelTrackingControl(entry.quantity,capacity);
    await client.query(`INSERT INTO logistics_fuel_tracking_entries(vehicle_id,occurred_on,month,fill_type,odometer,distance_travelled,quantity,tank_control,note,unit_price,source_name,source_row,created_by,updated_by)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$13)
      ON CONFLICT(source_name,source_row) DO UPDATE SET vehicle_id=EXCLUDED.vehicle_id,occurred_on=EXCLUDED.occurred_on,month=EXCLUDED.month,fill_type=EXCLUDED.fill_type,odometer=EXCLUDED.odometer,distance_travelled=EXCLUDED.distance_travelled,quantity=EXCLUDED.quantity,tank_control=EXCLUDED.tank_control,note=EXCLUDED.note,unit_price=EXCLUDED.unit_price,updated_at=NOW(),updated_by=EXCLUDED.updated_by`,[vehicleId,entry.occurredOn,entry.month,entry.fillType,entry.odometer,entry.distanceTravelled,entry.quantity,control,entry.note,entry.unitPrice,sourceName,entry.sourceRow,req.identity.id]);entryCount++;}
  await writeAudit(client,req,'fuel_tracking.imported','fuel_tracking_import',null,null,{sourceName,vehicleCount,entryCount},{sourceName});await client.query('COMMIT');res.status(201).json({sourceName,vehicleCount,entryCount});
}catch(error){await client.query('ROLLBACK');return sendDatabaseError(res,error);}finally{client.release();}});

export default router;
