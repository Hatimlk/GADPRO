import crypto from 'node:crypto';

export function fuelTotal(quantity, unitPrice) { return Math.round((Number(quantity) * Number(unitPrice) + Number.EPSILON) * 100) / 100; }
export function fuelFingerprint({ assetId, occurredAt, stationId, quantity, totalAmount }) {
  return crypto.createHash('sha256').update([assetId,new Date(occurredAt).toISOString(),stationId||'-',Number(quantity).toFixed(3),Number(totalAmount).toFixed(2)].join('|')).digest('hex');
}
export function calculateConsumption({ quantity, meterReading, meterType, previousReading }) {
  const delta=Number(meterReading)-Number(previousReading);if(!Number.isFinite(delta)||delta<=0)return null;
  return meterType==='odometer' ? Number(quantity)/delta*100 : Number(quantity)/delta;
}
export function detectFuelAnomalies({ consumptionRate, meterType }) {
  if(consumptionRate===null)return[];const threshold=meterType==='odometer'?50:20;
  return consumptionRate>threshold?[{ruleCode:'high_consumption',severity:consumptionRate>threshold*1.5?'critical':'warning',observedValue:consumptionRate,expectedValue:threshold,description:meterType==='odometer'?'Consommation supérieure au seuil indicatif en L/100 km.':'Consommation supérieure au seuil indicatif en L/h.'}]:[];
}
