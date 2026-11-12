export function normalizeInventoryReference(value) {
  return String(value ?? '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
}

export function inventoryBalance(openingQuantity, entries, exits) {
  return Number(openingQuantity || 0) + Number(entries || 0) - Number(exits || 0);
}
