import { lazy, Suspense, type ReactNode } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { AppProvider, useApp } from './lib/AppContext';
import { Layout } from './components/layout/Layout';
import { AuthProvider as ImpayesAuthProvider } from './impayes/contexts/AuthContext';
import { AppLayout as ImpayesLayout } from './impayes/layouts/AppLayout';
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

function Protected({ module, children }: { module?: string; children: ReactNode }) {
  const { currentUser, initialized } = useApp();
  if (!initialized) return <Loading />;
  if (!currentUser) return <Navigate to="/login" replace />;
  if (module && !currentUser.accesses?.some((access) => access.module === module)) return <Navigate to="/403" replace />;
  return <>{children}</>;
}
function ImpayesGate() { return <Protected module="impayes"><ImpayesAuthProvider><Outlet /></ImpayesAuthProvider></Protected>; }
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
    <Route path="/cheques" element={<Protected module="cheques"><Layout /></Protected>}>
      <Route index element={<ChequesDashboard />} />
      <Route path="comptes" element={<BankAccounts />} /><Route path="regles" element={<RegleChecks />} />
      <Route path="instances" element={<Instances />} /><Route path="impression" element={<PrintModule />} />
      <Route path="virements" element={<Virements />} /><Route path="roles" element={<ChequesAdmin><Roles /></ChequesAdmin>} />
      <Route path="calendrier" element={<Calendar />} /><Route path="partenaires" element={<Partners />} /><Route path="guide" element={<Guide />} />
    </Route>
    <Route element={<ImpayesGate />}><Route path="/impayes" element={<ImpayesLayout />}>
      <Route index element={<Navigate to="dashboard" replace />} /><Route path="dashboard" element={<ImpayesDashboard />} />
      <Route path="dossiers" element={<Dossiers />} /><Route path="dossiers/:id" element={<DossierDetail />} />
      <Route path="mes-dossiers" element={<Commercial />} /><Route path="alertes" element={<Alerts />} />
      <Route path="derogation" element={<Derogation />} /><Route path="admin" element={<ImpayesAdmin />} />
      <Route path="consommations" element={<Protected module="consommations"><Consumptions /></Protected>} />
      <Route path="consommations/branches/:code" element={<Protected module="consommations"><ConsumptionBranch /></Protected>} />
    </Route></Route>
    <Route path="/consommations" element={<Navigate to="/impayes/consommations" replace />} />
    <Route path="/403" element={<ForbiddenPage />} /><Route path="/404" element={<NotFoundPage />} />
    <Route path="/" element={<Navigate to="/dashboard" replace />} /><Route path="*" element={<NotFoundPage />} />
  </Routes></Suspense></AppProvider></BrowserRouter>;
}
function Loading() { return <div className="flex min-h-screen items-center justify-center bg-slate-50"><div className="h-9 w-9 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" /></div>; }
