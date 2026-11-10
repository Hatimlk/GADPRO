export function normalizeRegistration(value) {
  return String(value || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function fuelTrackingRate(quantity, distance) {
  const km=Number(distance);const liters=Number(quantity);
  return Number.isFinite(km)&&km>0&&Number.isFinite(liters) ? liters/km*100 : null;
}

export function fuelTrackingControl(quantity, capacity) {
  if(capacity===null||capacity===undefined||!Number.isFinite(Number(capacity)))return'unknown';
  return Number(quantity)>Number(capacity)?'exceeded':'ok';
}
