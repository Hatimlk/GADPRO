import { Router } from 'express';
import { logisticsQuery } from '../../../db.js';
import { appendAssetScope, requireLogisticsPermission } from '../middleware/authorization.js';
import assets from './assets.js';
import drivers from './drivers.js';
import assignments from './assignments.js';
import references from './references.js';
import providers from './providers.js';
import interventions from './interventions.js';
import maintenancePlans from './maintenancePlans.js';
import maintenanceDue from './maintenanceDue.js';
import alerts from './alerts.js';
import reports from './reports.js';
import fuel from './fuel.js';
import tires from './tires.js';
import spareParts from './spareParts.js';
import stock from './stock.js';
import quotations from './quotations.js';
import purchaseOrders from './purchaseOrders.js';
import invoices from './invoices.js';
import documents from './documents.js';
import notifications from './notifications.js';

const router = Router();

router.get('/bootstrap', requireLogisticsPermission('dashboard.read'), async (req, res, next) => {
  try {
    const assetConditions = ['a.deleted_at IS NULL'];
    const assetParams = [];
    appendAssetScope(req, assetConditions, assetParams);
    const interventionConditions = ['i.deleted_at IS NULL'];
    const interventionParams = [];
    appendAssetScope(req, interventionConditions, interventionParams);
    const preventiveConditions = [];
    const preventiveParams = [];
    appendAssetScope(req, preventiveConditions, preventiveParams);
    const operationsConditions = [];
    const operationsParams = [];
    appendAssetScope(req, operationsConditions, operationsParams);

    const [sites, categories, migration, assetKpis, interventionKpis, preventiveKpis, fuelKpis, tireKpis, stockKpis, procurementKpis] = await Promise.all([
      logisticsQuery('SELECT COUNT(*)::int AS count FROM logistics_sites WHERE active=true AND deleted_at IS NULL'),
      logisticsQuery('SELECT COUNT(*)::int AS count FROM logistics_asset_categories WHERE active=true AND deleted_at IS NULL'),
      logisticsQuery('SELECT version,applied_at FROM schema_migrations ORDER BY version DESC LIMIT 1'),
      logisticsQuery(`SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE a.status = 'available')::int AS available,
        COUNT(*) FILTER (WHERE a.status IN ('under_maintenance','immobilized'))::int AS unavailable
        FROM logistics_assets a WHERE ${assetConditions.join(' AND ')}`, assetParams),
      logisticsQuery(`SELECT
        COUNT(*) FILTER (WHERE i.status NOT IN ('closed','rejected','cancelled'))::int AS open,
        COUNT(*) FILTER (WHERE i.priority = 'critical' AND i.status NOT IN ('closed','rejected','cancelled'))::int AS critical,
        COALESCE(SUM(i.actual_cost) FILTER (WHERE i.actual_end_at >= date_trunc('month', CURRENT_DATE)), 0) AS monthly_cost
        FROM logistics_maintenance_interventions i
        JOIN logistics_assets a ON a.id = i.asset_id
        WHERE ${interventionConditions.join(' AND ')}`, interventionParams),
      logisticsQuery(`SELECT
        COUNT(DISTINCT de.id) FILTER (WHERE de.status = 'overdue')::int AS overdue,
        COUNT(DISTINCT al.id) FILTER (WHERE al.status = 'open')::int AS open_alerts
        FROM logistics_assets a
        LEFT JOIN logistics_maintenance_due_events de ON de.asset_id=a.id
        LEFT JOIN logistics_alerts al ON al.asset_id=a.id
        ${preventiveConditions.length ? `WHERE ${preventiveConditions.join(' AND ')}` : ''}`, preventiveParams),
      logisticsQuery(`SELECT
        (SELECT COALESCE(SUM(ft.total_amount),0) FROM logistics_fuel_transactions ft JOIN logistics_assets a ON a.id=ft.asset_id WHERE ft.occurred_at>=date_trunc('month',CURRENT_DATE)${operationsConditions.length ? ` AND ${operationsConditions.join(' AND ')}` : ''}) AS monthly_cost,
        (SELECT COUNT(*)::int FROM logistics_fuel_anomalies fa JOIN logistics_fuel_transactions ft ON ft.id=fa.transaction_id JOIN logistics_assets a ON a.id=ft.asset_id WHERE fa.status='open'${operationsConditions.length ? ` AND ${operationsConditions.join(' AND ')}` : ''}) AS open_anomalies`, operationsParams),
      logisticsQuery(`SELECT COUNT(*)::int AS installed FROM logistics_tires t JOIN logistics_assets a ON a.id=t.current_asset_id
        WHERE t.status='installed' AND t.deleted_at IS NULL${operationsConditions.length ? ` AND ${operationsConditions.join(' AND ')}` : ''}`, operationsParams),
      logisticsQuery(`SELECT COUNT(*) FILTER(WHERE quantity_on_hand<=minimum_quantity)::int AS low_stock,
        COALESCE(SUM(quantity_on_hand*average_cost),0) AS inventory_value FROM logistics_spare_parts WHERE status='active' AND deleted_at IS NULL`),
      logisticsQuery(`SELECT
        (SELECT COUNT(*) FROM logistics_quotations q JOIN logistics_maintenance_interventions i ON i.id=q.intervention_id JOIN logistics_assets a ON a.id=i.asset_id WHERE q.status='pending_approval'${operationsConditions.length ? ` AND ${operationsConditions.join(' AND ')}` : ''})
        +(SELECT COUNT(*) FROM logistics_purchase_orders po JOIN logistics_maintenance_interventions i ON i.id=po.intervention_id JOIN logistics_assets a ON a.id=i.asset_id WHERE po.status='pending_approval'${operationsConditions.length ? ` AND ${operationsConditions.join(' AND ')}` : ''})
        +(SELECT COUNT(*) FROM logistics_invoices inv JOIN logistics_maintenance_interventions i ON i.id=inv.intervention_id JOIN logistics_assets a ON a.id=i.asset_id WHERE inv.status='pending_validation'${operationsConditions.length ? ` AND ${operationsConditions.join(' AND ')}` : ''}) AS pending_approvals,
        (SELECT COALESCE(SUM(inv.total_amount),0) FROM logistics_invoices inv JOIN logistics_maintenance_interventions i ON i.id=inv.intervention_id JOIN logistics_assets a ON a.id=i.asset_id WHERE inv.status='validated' AND inv.validated_at>=date_trunc('month',CURRENT_DATE)${operationsConditions.length ? ` AND ${operationsConditions.join(' AND ')}` : ''}) AS monthly_invoiced_cost`,operationsParams),
    ]);
    res.json({
      module: 'logistique',
      role: req.moduleAccess.role,
      permissions: req.moduleAccess.permissions,
      dataScope: req.moduleAccess.data_scope,
      foundation: {
        sites: sites.rows[0].count,
        assetCategories: categories.rows[0].count,
        schemaVersion: migration.rows[0]?.version || null,
        migratedAt: migration.rows[0]?.applied_at || null,
      },
      kpis: {
        assetsTotal: assetKpis.rows[0].total,
        assetsAvailable: assetKpis.rows[0].available,
        assetsUnavailable: assetKpis.rows[0].unavailable,
        openInterventions: interventionKpis.rows[0].open,
        criticalInterventions: interventionKpis.rows[0].critical,
        monthlyMaintenanceCost: Number(interventionKpis.rows[0].monthly_cost),
        overdueMaintenance: preventiveKpis.rows[0].overdue,
        openAlerts: preventiveKpis.rows[0].open_alerts,
        monthlyFuelCost: Number(fuelKpis.rows[0].monthly_cost),
        openFuelAnomalies: fuelKpis.rows[0].open_anomalies,
        installedTires: tireKpis.rows[0].installed,
        lowStockParts: stockKpis.rows[0].low_stock,
        inventoryValue: Number(stockKpis.rows[0].inventory_value),
        pendingProcurementApprovals: Number(procurementKpis.rows[0].pending_approvals),
        monthlyInvoicedCost: Number(procurementKpis.rows[0].monthly_invoiced_cost),
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/reference-data', async (req, res, next) => {
  try {
    const [sites, departments, categories] = await Promise.all([
      logisticsQuery('SELECT id,code,name FROM logistics_sites WHERE active=true AND deleted_at IS NULL ORDER BY code'),
      logisticsQuery('SELECT id,code,name FROM logistics_departments WHERE active=true AND deleted_at IS NULL ORDER BY code'),
      logisticsQuery('SELECT id,code,name,meter_type,requires_registration FROM logistics_asset_categories WHERE active=true AND deleted_at IS NULL ORDER BY name'),
    ]);
    const scope = req.moduleAccess?.data_scope || {};
    const visibleSites = scope.allSites === false && Array.isArray(scope.siteIds)
      ? sites.rows.filter((site) => scope.siteIds.includes(site.id)) : sites.rows;
    const visibleDepartments = Array.isArray(scope.departmentIds)
      ? departments.rows.filter((department) => scope.departmentIds.includes(department.id)) : departments.rows;
    res.json({ sites: visibleSites, departments: visibleDepartments, assetCategories: categories.rows });
  } catch (error) { next(error); }
});

router.use('/assets', assets);
router.use('/drivers', drivers);
router.use('/assignments', assignments);
router.use('/references', references);
router.use('/providers', providers);
router.use('/interventions', interventions);
router.use('/maintenance-plans', maintenancePlans);
router.use('/maintenance-due', maintenanceDue);
router.use('/alerts', alerts);
router.use('/reports', reports);
router.use('/fuel', fuel);
router.use('/tires', tires);
router.use('/spare-parts', spareParts);
router.use('/stock-movements', stock);
router.use('/quotations', quotations);
router.use('/purchase-orders', purchaseOrders);
router.use('/invoices', invoices);
router.use('/documents', documents);
router.use('/notifications', notifications);

export default router;
