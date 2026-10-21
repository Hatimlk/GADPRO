export const logisticsSettingDefinitions = Object.freeze({
  'alerts.document_expiry_days': { type: 'integer', minimum: 1, maximum: 365 },
  'alerts.driver_license_expiry_days': { type: 'integer', minimum: 1, maximum: 365 },
  'alerts.low_stock_enabled': { type: 'boolean' },
  'alerts.fuel_anomaly_enabled': { type: 'boolean' },
  'alerts.pending_quotation_enabled': { type: 'boolean' },
});

export function validateLogisticsSetting(key, value) {
  const definition = logisticsSettingDefinitions[key];
  if (!definition) return { success: false, error: 'Paramètre inconnu.' };
  if (definition.type === 'boolean') {
    return typeof value === 'boolean'
      ? { success: true, value }
      : { success: false, error: 'Une valeur booléenne est requise.' };
  }
  if (!Number.isInteger(value) || value < definition.minimum || value > definition.maximum) {
    return { success: false, error: `Une valeur entière entre ${definition.minimum} et ${definition.maximum} est requise.` };
  }
  return { success: true, value };
}

export function settingsMap(rows) {
  return Object.fromEntries(rows.map((row) => [row.key, row.value]));
}
