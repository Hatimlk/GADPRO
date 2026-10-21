import crypto from 'node:crypto';

export function fuelTotal(quantity, unitPrice) { return Math.round((Number(quantity) * Number(unitPrice) + Number.EPSILON) * 100) / 100; }
export function fuelFingerprint({ assetId, occurredAt, stationId, quantity, totalAmount }) {
  return crypto.createHash('sha256').update([assetId,new Date(occurredAt).toISOString(),stationId||'-',Number(quantity).toFixed(3),Number(totalAmount).toFixed(2)].join('|')).digest('hex');
}
export function calculateConsumption({ quantity, meterReading, meterType, previousReading }) {
  const delta=Number(meterReading)-Number(previousReading);if(!Number.isFinite(delta)||delta<=0)return null;
  return meterType==='odometer' ? Number(quantity)/delta*100 : Number(quantity)/delta;
}
export function detectFuelAnomalies({ consumptionRate, meterType, meterDelta = null, settings = null }) {
  if(consumptionRate===null)return[];
  const warning=Number(settings?.warning_threshold??(meterType==='odometer'?50:20));
  const critical=Number(settings?.critical_threshold??warning*1.5);
  const minimumDelta=Number(settings?.minimum_delta??0);
  if(settings?.active===false||(meterDelta!==null&&Number(meterDelta)<minimumDelta)||Number(consumptionRate)<=warning)return[];
  return[{ruleCode:'high_consumption',severity:Number(consumptionRate)>critical?'critical':'warning',observedValue:consumptionRate,expectedValue:warning,description:meterType==='odometer'?'Consommation supérieure au seuil configuré en L/100 km.':'Consommation supérieure au seuil configuré en L/h.'}];
}
