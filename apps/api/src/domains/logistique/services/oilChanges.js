export function oilChangeStatus({ currentMileage, nextServiceMileage, alertThresholdKm = 2000, manualStatus = null }) {
  if (manualStatus === 'accident' || manualStatus === 'inactive') return 'out_of_service';
  const remainingKm = Number(nextServiceMileage) - Number(currentMileage);
  if (remainingKm <= 0) return 'urgent';
  if (remainingKm <= Number(alertThresholdKm)) return 'planned';
  return 'ok';
}

export function nextOilChangeMileage(serviceMileage, intervalKm) {
  return Number(serviceMileage) + Number(intervalKm);
}
