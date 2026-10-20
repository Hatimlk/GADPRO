function addCalendarInterval(dateValue, amount, unit) {
  const normalized = dateValue instanceof Date ? dateValue.toISOString().slice(0,10) : String(dateValue).slice(0,10);
  const date = new Date(`${normalized}T00:00:00.000Z`);
  if (unit === 'days') date.setUTCDate(date.getUTCDate() + amount);
  if (unit === 'months') { const day=date.getUTCDate();date.setUTCDate(1);date.setUTCMonth(date.getUTCMonth()+amount);const lastDay=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,0)).getUTCDate();date.setUTCDate(Math.min(day,lastDay)); }
  if (unit === 'years') { const month=date.getUTCMonth();date.setUTCFullYear(date.getUTCFullYear()+amount);if(date.getUTCMonth()!==month)date.setUTCDate(0); }
  return date.toISOString().slice(0, 10);
}

export function calculatePreventiveDue({ planAsset, asset, triggers, today = new Date().toISOString().slice(0, 10) }) {
  let status = 'upcoming';
  let dueDate = null;
  let dueMileage = null;
  let dueHours = null;
  const reasons = [];
  const rank = { upcoming: 0, due: 1, overdue: 2 };
  const raise = (next) => { if (rank[next] > rank[status]) status = next; };

  for (const trigger of triggers) {
    const interval = Number(trigger.interval_value);
    const warning = Number(trigger.warning_threshold || 0);
    if (trigger.trigger_type === 'mileage') {
      dueMileage = Number(planAsset.last_completed_mileage || 0) + interval;
      const remaining = dueMileage - Number(asset.current_mileage || 0);
      if (remaining <= 0) { raise('overdue'); reasons.push(`Kilométrage dépassé de ${Math.abs(remaining)} km`); }
      else if (remaining <= warning) { raise('due'); reasons.push(`Échéance dans ${remaining} km`); }
    } else if (trigger.trigger_type === 'hours') {
      dueHours = Number(planAsset.last_completed_hours || 0) + interval;
      const remaining = dueHours - Number(asset.current_operating_hours || 0);
      if (remaining <= 0) { raise('overdue'); reasons.push(`Compteur dépassé de ${Math.abs(remaining)} h`); }
      else if (remaining <= warning) { raise('due'); reasons.push(`Échéance dans ${remaining} h`); }
    } else {
      const baseDate = planAsset.last_completed_at || planAsset.activated_at;
      dueDate = addCalendarInterval(baseDate, interval, trigger.interval_unit);
      const remainingDays = Math.ceil((new Date(`${dueDate}T00:00:00Z`) - new Date(`${today}T00:00:00Z`)) / 86400000);
      if (remainingDays < 0) { raise('overdue'); reasons.push(`Échéance dépassée de ${Math.abs(remainingDays)} jour(s)`); }
      else if (remainingDays <= warning) { raise('due'); reasons.push(`Échéance dans ${remainingDays} jour(s)`); }
    }
  }

  const baseValue = planAsset.last_completed_at || planAsset.activated_at;
  const baseKey = baseValue instanceof Date ? baseValue.toISOString() : String(baseValue);
  const cycleKey = [baseKey, dueDate || '-', dueMileage ?? '-', dueHours ?? '-'].join('|');
  return { status, dueDate, dueMileage, dueHours, cycleKey, reasons };
}
