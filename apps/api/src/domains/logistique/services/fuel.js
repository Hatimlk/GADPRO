import crypto from 'node:crypto';

export function fuelTotal(quantity, unitPrice) { return Math.round((Number(quantity) * Number(unitPrice) + Number.EPSILON) * 100) / 100; }
export function fuelFingerprint({ assetId, occurredAt, stationId, quantity, totalAmount }) {
  return crypto.createHash('sha256').update([assetId,new Date(occurredAt).toISOString(),stationId||'-',Number(quantity).toFixed(3),Number(totalAmount).toFixed(2)].join('|')).digest('hex');
}
export function calculateConsumption({ quantity, meterReading, meterType, previousReading }) {
  const delta=Number(meterReading)-Number(previousReading);if(!Number.isFinite(delta)||delta<=0)return null;
  return meterType==='odometer' ? Number(quantity)/delta*100 : Number(quantity)/delta;
}
export function historicalAverage(values) {
  const valid=values.map(Number).filter(value=>Number.isFinite(value)&&value>0);
  return valid.length?valid.reduce((sum,value)=>sum+value,0)/valid.length:null;
}
export function detectFuelAnomalies({ consumptionRate, meterType, meterDelta = null, quantity = null, historicalRates = [], settings = null }) {
  if(settings?.active===false)return[];
  const anomalies=[];
  const warning=Number(settings?.warning_threshold??(meterType==='odometer'?50:20));
  const critical=Number(settings?.critical_threshold??warning*1.5);
  const minimumDelta=Number(settings?.minimum_delta??0);
  const maximumQuantity=settings?.maximum_quantity==null?null:Number(settings.maximum_quantity);
  if(maximumQuantity!==null&&Number.isFinite(Number(quantity))&&Number(quantity)>maximumQuantity)anomalies.push({ruleCode:'unreasonable_quantity',severity:Number(quantity)>maximumQuantity*1.5?'critical':'warning',observedValue:Number(quantity),expectedValue:maximumQuantity,description:'Quantité de carburant supérieure au maximum configuré ; contrôle requis.'});
  if(consumptionRate===null||(meterDelta!==null&&Number(meterDelta)<minimumDelta))return anomalies;
  if(Number(consumptionRate)>warning)anomalies.push({ruleCode:'high_consumption',severity:Number(consumptionRate)>critical?'critical':'warning',observedValue:consumptionRate,expectedValue:warning,description:meterType==='odometer'?'Consommation supérieure au seuil configuré en L/100 km.':'Consommation supérieure au seuil configuré en L/h.'});
  const minimumSamples=Number(settings?.history_min_samples??3);
  const sample=historicalRates.map(Number).filter(value=>Number.isFinite(value)&&value>0);
  if(sample.length>=minimumSamples){const average=historicalAverage(sample);const warningRatio=Number(settings?.deviation_warning_ratio??1.5);const criticalRatio=Number(settings?.deviation_critical_ratio??2);const ratio=Number(consumptionRate)/average;if(ratio>warningRatio)anomalies.push({ruleCode:'historical_deviation',severity:ratio>criticalRatio?'critical':'warning',observedValue:consumptionRate,expectedValue:average,description:`Consommation supérieure à la moyenne des ${sample.length} relevés historiques retenus.`});}
  return anomalies;
}

export async function loadFuelDetectionContext(client,{assetId,meterType,occurredAt}) {
  const setting=(await client.query('SELECT * FROM logistics_fuel_anomaly_settings WHERE meter_type=$1',[meterType])).rows[0];
  const sampleSize=Math.max(3,Math.min(24,Number(setting?.history_sample_size??6)));
  const history=await client.query(`SELECT consumption_rate FROM logistics_fuel_transactions
    WHERE asset_id=$1 AND meter_type=$2 AND occurred_at<$3 AND consumption_rate IS NOT NULL AND review_status IN ('clear','reviewed')
    ORDER BY occurred_at DESC LIMIT $4`,[assetId,meterType,occurredAt,sampleSize]);
  return{setting,historicalRates:history.rows.map(row=>Number(row.consumption_rate))};
}
