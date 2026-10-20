export function requireLogisticsPermission(permission) {
  return (req, res, next) => {
    const permissions = req.moduleAccess?.permissions || [];
    if (!permissions.includes('*') && !permissions.includes(permission)) {
      return res.status(403).json({ error: 'Permission Logistique insuffisante.', code: 'LOGISTICS_PERMISSION_DENIED' });
    }
    next();
  };
}

export function appendAssetScope(req, conditions, params, alias = 'a') {
  if (req.moduleAccess?.permissions?.includes('*')) return;
  const scope = req.moduleAccess?.data_scope || {};
  if (scope.allSites === false) {
    const siteIds = Array.isArray(scope.siteIds) ? scope.siteIds : [];
    if (!siteIds.length) conditions.push('FALSE');
    else {
      params.push(siteIds);
      conditions.push(`${alias}.site_id = ANY($${params.length}::uuid[])`);
    }
  }
  if (Array.isArray(scope.departmentIds)) {
    if (!scope.departmentIds.length) conditions.push('FALSE');
    else {
      params.push(scope.departmentIds);
      conditions.push(`${alias}.department_id = ANY($${params.length}::uuid[])`);
    }
  }
}

export function isSiteAllowed(req, siteId, departmentId = null) {
  if (req.moduleAccess?.permissions?.includes('*')) return true;
  const scope = req.moduleAccess?.data_scope || {};
  if (scope.allSites === false && (!Array.isArray(scope.siteIds) || !scope.siteIds.includes(siteId))) return false;
  if (Array.isArray(scope.departmentIds) && (!departmentId || !scope.departmentIds.includes(departmentId))) return false;
  return true;
}
