export function calculateAvailability(periodHours, downtimeHours) {
  const denominator = Number(periodHours);
  const downtime = Math.max(0, Number(downtimeHours) || 0);
  if (!Number.isFinite(denominator) || denominator <= 0) return null;
  return Math.round(Math.max(0, Math.min(100, ((denominator - downtime) / denominator) * 100)) * 10) / 10;
}

export function calculateTrackedOperatingCost({ maintenance = 0, fuel = 0, tires = 0 } = {}) {
  return [maintenance, fuel, tires].reduce((total, value) => total + (Number(value) || 0), 0);
}

export function calculateCostPerUnit(totalCost, meterDelta) {
  const delta = Number(meterDelta);
  if (!Number.isFinite(delta) || delta <= 0) return null;
  return Math.round((Number(totalCost || 0) / delta) * 100) / 100;
}

export function normalizeAnalyticsPeriod(from, to) {
  const start = new Date(`${from}T00:00:00.000Z`);
  const end = new Date(`${to}T00:00:00.000Z`);
  if (Number.isNaN(start.valueOf()) || Number.isNaN(end.valueOf()) || end < start) return null;
  const days = Math.floor((end - start) / 86400000) + 1;
  if (days > 1096) return null;
  return { from, to, days, hoursPerAsset: days * 24 };
}
