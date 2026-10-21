import { lazy, Suspense, type ReactNode } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes, useParams } from 'react-router-dom';
import { AppProvider, useApp } from './lib/AppContext';
import { Layout } from './components/layout/Layout';
import { AuthProvider as ImpayesAuthProvider } from './impayes/contexts/AuthContext';
import { AppLayout as ImpayesLayout } from './impayes/layouts/AppLayout';
import { LogisticsLayout } from './logistique/layouts/LogisticsLayout';
import { ModuleDashboard, ForbiddenPage, NotFoundPage, AdministrationPage } from './pages/PlatformPages';

const LoginPage = lazy(() => import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const ChequesDashboard = lazy(() => import('./pages/Dashboard').then((m) => ({ default: m.Dashboard })));
const BankAccounts = lazy(() => import('./pages/BankAccounts').then((m) => ({ default: m.BankAccounts })));
const RegleChecks = lazy(() => import('./pages/RegleChecks').then((m) => ({ default: m.RegleChecks })));
const Instances = lazy(() => import('./pages/Instances').then((m) => ({ default: m.Instances })));
const PrintModule = lazy(() => import('./pages/PrintModule').then((m) => ({ default: m.PrintModule })));
const Virements = lazy(() => import('./pages/Virements').then((m) => ({ default: m.Virements })));
const Roles = lazy(() => import('./pages/Roles').then((m) => ({ default: m.Roles })));
const Calendar = lazy(() => import('./pages/Calendar').then((m) => ({ default: m.Calendar })));
const Partners = lazy(() => import('./pages/Partners').then((m) => ({ default: m.Partners })));
const Consumptions = lazy(() => import('./pages/Consumptions').then((m) => ({ default: m.Consumptions })));
const ConsumptionBranch = lazy(() => import('./pages/ConsumptionBranch').then((m) => ({ default: m.ConsumptionBranch })));
const Guide = lazy(() => import('./pages/Guide').then((m) => ({ default: m.Guide })));
const ImpayesDashboard = lazy(() => import('./impayes/pages/DashboardPage'));
const Dossiers = lazy(() => import('./impayes/pages/DossiersPage'));
const DossierDetail = lazy(() => import('./impayes/pages/DossierDetailPage'));
const Commercial = lazy(() => import('./impayes/pages/CommercialPage'));
const Alerts = lazy(() => import('./impayes/pages/AlertsPage'));
const Derogation = lazy(() => import('./impayes/pages/DerogationPage'));
const ImpayesAdmin = lazy(() => import('./impayes/pages/AdminPage'));
const LogisticsDashboard = lazy(() => import('./logistique/pages/DashboardPage'));
const LogisticsAssets = lazy(() => import('./logistique/pages/AssetsPage'));
const LogisticsAssetDetail = lazy(() => import('./logistique/pages/AssetDetailPage'));
const LogisticsDrivers = lazy(() => import('./logistique/pages/DriversPage'));
const LogisticsAssignments = lazy(() => import('./logistique/pages/AssignmentsPage'));
const LogisticsReferences = lazy(() => import('./logistique/pages/ReferencesPage'));
const LogisticsProviders = lazy(() => import('./logistique/pages/ProvidersPage'));
const LogisticsInterventions = lazy(() => import('./logistique/pages/InterventionsPage'));
const LogisticsInterventionDetail = lazy(() => import('./logistique/pages/InterventionDetailPage'));
const LogisticsPlans = lazy(() => import('./logistique/pages/MaintenancePlansPage'));
const LogisticsPreventive = lazy(() => import('./logistique/pages/PreventivePage'));
const LogisticsAlerts = lazy(() => import('./logistique/pages/LogisticsAlertsPage'));
const LogisticsReports = lazy(() => import('./logistique/pages/LogisticsReportsPage'));
const LogisticsFuel = lazy(() => import('./logistique/pages/FuelPage'));
const LogisticsTires = lazy(() => import('./logistique/pages/TiresPage'));
const LogisticsSpareParts = lazy(() => import('./logistique/pages/SparePartsPage'));
const LogisticsStock = lazy(() => import('./logistique/pages/StockPage'));
const LogisticsQuotations = lazy(() => import('./logistique/pages/QuotationsPage'));
const LogisticsPurchaseOrders = lazy(() => import('./logistique/pages/PurchaseOrdersPage'));
const LogisticsInvoices = lazy(() => import('./logistique/pages/InvoicesPage'));
const LogisticsImports = lazy(() => import('./logistique/pages/ImportsPage'));
const LogisticsSettings = lazy(() => import('./logistique/pages/SettingsPage'));
const LogisticsAudit = lazy(() => import('./logistique/pages/AuditPage'));

function Protected({ module, children }: { module?: string; children: ReactNode }) {
  const { currentUser, initialized } = useApp();
  if (!initialized) return <Loading />;
  if (!currentUser) return <Navigate to="/login" replace />;
  if (module && !currentUser.accesses?.some((access) => access.module === module)) return <Navigate to="/403" replace />;
  return <>{children}</>;
}
function ImpayesGate() { return <Protected module="impayes"><ImpayesAuthProvider><Outlet /></ImpayesAuthProvider></Protected>; }
function ChequesGate() { return <Protected module="cheques"><Outlet /></Protected>; }
function LogisticsGate() { return <Protected module="logistique"><Outlet /></Protected>; }
function LegacyConsumptionBranchRedirect() {
  const { code } = useParams();
  return <Navigate to={`/cheques/consommations/branches/${encodeURIComponent(code || '')}`} replace />;
}
function ChequesAdmin({ children }: { children: ReactNode }) {
  const { currentUser } = useApp();
  const role = currentUser?.accesses?.find((access) => access.module === 'cheques')?.role;
  return role === 'Administrateur' ? <>{children}</> : <Navigate to="/403" replace />;
}

export default function App() {
  return <BrowserRouter><AppProvider><Suspense fallback={<Loading />}><Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/dashboard" element={<Protected><ModuleDashboard /></Protected>} />
    <Route path="/administration" element={<Protected><AdministrationPage /></Protected>} />
    <Route path="/cheques" element={<Protected><Layout /></Protected>}>
      <Route element={<ChequesGate />}>
        <Route index element={<ChequesDashboard />} />
        <Route path="comptes" element={<BankAccounts />} /><Route path="regles" element={<RegleChecks />} />
        <Route path="instances" element={<Instances />} /><Route path="impression" element={<PrintModule />} />
        <Route path="virements" element={<Virements />} /><Route path="roles" element={<ChequesAdmin><Roles /></ChequesAdmin>} />
        <Route path="calendrier" element={<Calendar />} /><Route path="partenaires" element={<Partners />} /><Route path="guide" element={<Guide />} />
      </Route>
      <Route path="consommations" element={<Protected module="consommations"><Consumptions /></Protected>} />
      <Route path="consommations/branches/:code" element={<Protected module="consommations"><ConsumptionBranch /></Protected>} />
    </Route>
    <Route element={<ImpayesGate />}><Route path="/impayes" element={<ImpayesLayout />}>
      <Route index element={<Navigate to="dashboard" replace />} /><Route path="dashboard" element={<ImpayesDashboard />} />
      <Route path="dossiers" element={<Dossiers />} /><Route path="dossiers/:id" element={<DossierDetail />} />
      <Route path="mes-dossiers" element={<Commercial />} /><Route path="alertes" element={<Alerts />} />
      <Route path="derogation" element={<Derogation />} /><Route path="admin" element={<ImpayesAdmin />} />
    </Route></Route>
    <Route element={<LogisticsGate />}><Route path="/logistique" element={<LogisticsLayout />}>
      <Route index element={<LogisticsDashboard />} />
      <Route path="rapports" element={<LogisticsReports />} />
      <Route path="parc" element={<LogisticsAssets group="vehicles" />} />
      <Route path="parc/:id" element={<LogisticsAssetDetail />} />
      <Route path="equipements" element={<LogisticsAssets group="equipment" />} />
      <Route path="equipements/:id" element={<LogisticsAssetDetail />} />
      <Route path="conducteurs" element={<LogisticsDrivers />} />
      <Route path="affectations" element={<LogisticsAssignments />} />
      <Route path="interventions" element={<LogisticsInterventions />} />
      <Route path="interventions/:id" element={<LogisticsInterventionDetail />} />
      <Route path="preventif" element={<LogisticsPreventive />} />
      <Route path="plans" element={<LogisticsPlans />} />
      <Route path="alertes" element={<LogisticsAlerts />} />
      <Route path="carburant" element={<LogisticsFuel />} />
      <Route path="pneumatiques" element={<LogisticsTires />} />
      <Route path="pieces" element={<LogisticsSpareParts />} />
      <Route path="stock" element={<LogisticsStock />} />
      <Route path="prestataires" element={<LogisticsProviders />} />
      <Route path="devis" element={<LogisticsQuotations />} />
      <Route path="commandes" element={<LogisticsPurchaseOrders />} />
      <Route path="factures" element={<LogisticsInvoices />} />
      <Route path="imports" element={<LogisticsImports />} />
      <Route path="parametres" element={<LogisticsSettings />} />
      <Route path="referentiels" element={<LogisticsReferences />} />
      <Route path="audit" element={<LogisticsAudit />} />
    </Route></Route>
    <Route path="/consommations" element={<Navigate to="/cheques/consommations" replace />} />
    <Route path="/impayes/consommations" element={<Navigate to="/cheques/consommations" replace />} />
    <Route path="/impayes/consommations/branches/:code" element={<LegacyConsumptionBranchRedirect />} />
    <Route path="/403" element={<ForbiddenPage />} /><Route path="/404" element={<NotFoundPage />} />
    <Route path="/" element={<Navigate to="/dashboard" replace />} /><Route path="*" element={<NotFoundPage />} />
  </Routes></Suspense></AppProvider></BrowserRouter>;
}
function Loading() { return <div className="flex min-h-screen items-center justify-center bg-slate-50"><div className="h-9 w-9 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" /></div>; }
