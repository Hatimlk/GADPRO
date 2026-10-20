import { useEffect, useMemo, useState, type ComponentType } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  AlertTriangle, BarChart3, Bell, Boxes, ChevronDown, ClipboardCheck, ClipboardList, FileCheck2,
  FileText, Fuel, Gauge, History, LayoutDashboard, LogOut, Menu, PackageOpen, ReceiptText, Settings,
  ShieldCheck, Truck, UserRound, UsersRound, Warehouse, Wrench, X,
} from 'lucide-react';
import { useApp } from '../../lib/AppContext';

type NavItem = { to: string; label: string; icon: ComponentType<{ className?: string }>; permission: string };
type NavGroup = { label: string; items: NavItem[] };

const groups: NavGroup[] = [
  { label: 'Pilotage', items: [
    { to: '/logistique', label: 'Tableau de bord', icon: LayoutDashboard, permission: 'dashboard.read' },
    { to: '/logistique/rapports', label: 'Rapports & analyses', icon: BarChart3, permission: 'reports.read' },
  ] },
  { label: 'Gestion du parc', items: [
    { to: '/logistique/parc', label: 'Véhicules', icon: Truck, permission: 'assets.read' },
    { to: '/logistique/equipements', label: 'Engins & équipements', icon: Gauge, permission: 'assets.read' },
    { to: '/logistique/conducteurs', label: 'Conducteurs', icon: UserRound, permission: 'drivers.read' },
    { to: '/logistique/affectations', label: 'Affectations', icon: UsersRound, permission: 'assets.read' },
  ] },
  { label: 'Maintenance', items: [
    { to: '/logistique/interventions', label: 'Interventions', icon: Wrench, permission: 'interventions.read' },
    { to: '/logistique/preventif', label: 'Maintenance préventive', icon: ClipboardCheck, permission: 'plans.read' },
    { to: '/logistique/plans', label: 'Plans de maintenance', icon: ClipboardList, permission: 'plans.read' },
    { to: '/logistique/alertes', label: 'Alertes & échéances', icon: AlertTriangle, permission: 'alerts.read' },
  ] },
  { label: 'Exploitation', items: [
    { to: '/logistique/carburant', label: 'Carburant', icon: Fuel, permission: 'fuel.read' },
    { to: '/logistique/pneumatiques', label: 'Pneumatiques', icon: Truck, permission: 'tires.read' },
    { to: '/logistique/pieces', label: 'Pièces de rechange', icon: Boxes, permission: 'stock.read' },
    { to: '/logistique/stock', label: 'Mouvements de stock', icon: Warehouse, permission: 'stock.read' },
  ] },
  { label: 'Achats & prestataires', items: [
    { to: '/logistique/prestataires', label: 'Prestataires externes', icon: UsersRound, permission: 'providers.read' },
    { to: '/logistique/devis', label: 'Demandes & devis', icon: FileText, permission: 'quotations.read' },
    { to: '/logistique/commandes', label: 'Bons de commande', icon: FileCheck2, permission: 'purchase_orders.read' },
    { to: '/logistique/factures', label: 'Factures & coûts', icon: ReceiptText, permission: 'invoices.read' },
  ] },
  { label: 'Administration', items: [
    { to: '/logistique/parametres', label: 'Paramètres', icon: Settings, permission: 'settings.read' },
    { to: '/logistique/referentiels', label: 'Référentiels', icon: PackageOpen, permission: 'settings.read' },
    { to: '/logistique/audit', label: 'Historique & audit', icon: History, permission: 'audit.read' },
  ] },
];

const roleLabels: Record<string, string> = {
  logistics_admin: 'Administrateur Logistique', fleet_manager: 'Gestionnaire de parc',
  maintenance_manager: 'Responsable maintenance', logistics_operator: 'Opérateur logistique',
  finance: 'Finance', read_only: 'Lecture seule',
};

export function LogisticsLayout() {
  const { currentUser, logout } = useApp();
  const navigate = useNavigate();
  const access = currentUser?.accesses?.find((item) => item.module === 'logistique');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => Object.fromEntries(groups.map((group) => [group.label, true])));
  const permissions = access?.permissions || [];
  const can = (permission: string) => permissions.includes('*') || permissions.includes(permission);
  const visibleGroups = useMemo(() => groups.map((group) => ({ ...group, items: group.items.filter((item) => can(item.permission)) })).filter((group) => group.items.length), [permissions]);
  const initials = currentUser?.name?.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'GA';

  useEffect(() => {
    document.title = 'Logistique & GMAO · PROGAD';
    return () => { document.title = 'PROGAD · ERP interne GADIMAT'; };
  }, []);

  const handleLogout = async () => { await logout(); navigate('/login'); };

  return <div className="flex h-[100dvh] bg-[#f4f6f9] text-slate-900">
    {sidebarOpen && <button type="button" aria-label="Fermer la navigation" className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />}
    <aside className={`fixed inset-y-0 left-0 z-50 flex w-[278px] flex-col border-r border-slate-800 bg-[#0b172a] text-slate-300 transition-transform duration-200 lg:static ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
      <div className="flex min-h-24 items-center justify-between border-b border-slate-800 px-5">
        <Link to="/dashboard" className="min-w-0"><img src="/Asset%2010@4x.png" alt="PROGAD by GADIMAT" className="w-40 object-contain" /><p className="mt-1 text-xs font-semibold text-blue-200">Logistique & GMAO</p></Link>
        <button type="button" onClick={() => setSidebarOpen(false)} className="grid h-9 w-9 place-items-center rounded-lg text-slate-400 hover:bg-slate-800 lg:hidden"><X className="h-5 w-5" /></button>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Navigation Logistique">
        {visibleGroups.map((group) => <section key={group.label} className="mb-3">
          <button type="button" onClick={() => setExpanded((value) => ({ ...value, [group.label]: !value[group.label] }))} className="flex w-full items-center justify-between px-3 py-2 text-[10px] font-bold uppercase tracking-[0.13em] text-slate-500"><span>{group.label}</span><ChevronDown className={`h-3.5 w-3.5 transition ${expanded[group.label] ? '' : '-rotate-90'}`} /></button>
          {expanded[group.label] && <div className="space-y-1">{group.items.map((item) => <NavLink key={item.to} end={item.to === '/logistique'} to={item.to} onClick={() => setSidebarOpen(false)} className={({ isActive }) => `flex min-h-10 items-center gap-3 rounded-xl border px-3 py-2 text-[13px] font-medium transition ${isActive ? 'border-blue-500/50 bg-blue-600 text-white shadow-lg shadow-blue-950/25' : 'border-transparent text-slate-400 hover:border-slate-700 hover:bg-slate-800/70 hover:text-white'}`}><item.icon className="h-4 w-4 shrink-0" /><span className="truncate">{item.label}</span></NavLink>)}</div>}
        </section>)}
      </nav>
      <div className="border-t border-slate-800 p-4">
        <Link to="/dashboard" className="flex items-center justify-center rounded-xl border border-slate-700 px-3 py-2.5 text-xs font-bold text-slate-200 transition hover:bg-slate-800">Retour au cockpit</Link>
        <div className="mt-3 flex items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-600/20 text-xs font-black text-blue-300 ring-1 ring-blue-500/30">{initials}</span><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-white">{currentUser?.name}</p><p className="truncate text-[10px] text-slate-500">{roleLabels[access?.role || ''] || access?.role}</p></div><button type="button" title="Se déconnecter" aria-label="Se déconnecter" onClick={() => void handleLogout()} className="grid h-9 w-9 place-items-center rounded-lg text-slate-400 hover:bg-red-500/10 hover:text-red-400"><LogOut className="h-4 w-4" /></button></div>
      </div>
    </aside>
    <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">
        <div className="flex items-center gap-3"><button type="button" onClick={() => setSidebarOpen(true)} aria-label="Ouvrir la navigation" className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-slate-600 lg:hidden"><Menu className="h-5 w-5" /></button><div><p className="text-sm font-black text-slate-900">Logistique & GMAO</p><p className="hidden text-[11px] text-slate-500 sm:block">Parc, maintenance et coûts opérationnels</p></div></div>
        <div className="flex items-center gap-2"><span className="hidden items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-[11px] font-bold text-emerald-700 sm:flex"><ShieldCheck className="h-4 w-4" /> Session sécurisée</span><button type="button" disabled title="Notifications disponibles en phase 2" className="relative grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-slate-400 disabled:cursor-not-allowed"><Bell className="h-4 w-4" /></button></div>
      </header>
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8"><Outlet /></main>
    </div>
  </div>;
}
