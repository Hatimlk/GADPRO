import { useEffect, useState } from 'react';
import { Activity, CircleDollarSign, Database, FileText, KeyRound, MapPinned, RefreshCw, Shapes, ShieldCheck, Truck, Wrench } from 'lucide-react';
import { logisticsApi } from '../services/api';

type Bootstrap = {
  role: string;
  permissions: string[];
  dataScope: Record<string, unknown>;
  foundation: { sites: number; assetCategories: number; schemaVersion: string | null; migratedAt: string | null };
  kpis: { assetsTotal: number; assetsAvailable: number; assetsUnavailable: number; openInterventions: number; criticalInterventions: number; monthlyMaintenanceCost: number; overdueMaintenance: number; openAlerts: number; monthlyFuelCost: number; openFuelAnomalies: number; installedTires: number; lowStockParts: number; inventoryValue: number; pendingProcurementApprovals:number; monthlyInvoicedCost:number };
};

const roleLabels: Record<string, string> = {
  logistics_admin: 'Administrateur Logistique', fleet_manager: 'Gestionnaire de parc',
  maintenance_manager: 'Responsable maintenance', logistics_operator: 'Opérateur logistique',
  finance: 'Finance', read_only: 'Lecture seule',
};

export default function DashboardPage() {
  const [data, setData] = useState<Bootstrap | null>(null);
  const [error, setError] = useState('');

  const load = async () => {
    setError('');
    try { setData(await logisticsApi.get<Bootstrap>('/bootstrap')); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Chargement impossible.'); }
  };

  useEffect(() => { void load(); }, []);

  return <div className="mx-auto w-full max-w-7xl">
    <header><p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Pilotage</p><h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">Tableau de bord Logistique & GMAO</h1><p className="mt-2 max-w-3xl text-sm text-slate-500">Vue opérationnelle du parc et des interventions, limitée à votre périmètre d’accès.</p></header>
    {error && <div role="alert" className="mt-6 flex items-center justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"><span>{error}</span><button onClick={() => void load()} className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-bold">Réessayer</button></div>}
    {!data && !error && <div className="mt-8 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500"><RefreshCw className="h-5 w-5 animate-spin text-blue-600" /> Vérification du socle Logistique…</div>}
    {data && <>
      <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Indicateurs opérationnels">
        <FoundationCard icon={Truck} label="Actifs du parc" value={String(data.kpis.assetsTotal)} />
        <FoundationCard icon={Activity} label="Actifs disponibles" value={String(data.kpis.assetsAvailable)} />
        <FoundationCard icon={Wrench} label="Actifs indisponibles" value={String(data.kpis.assetsUnavailable)} />
        <FoundationCard icon={Wrench} label="Interventions ouvertes" value={String(data.kpis.openInterventions)} />
        <FoundationCard icon={Activity} label="Urgences critiques" value={String(data.kpis.criticalInterventions)} />
        <FoundationCard icon={CircleDollarSign} label="Coût maintenance du mois" value={`${data.kpis.monthlyMaintenanceCost.toLocaleString('fr-FR')} DH`} />
        <FoundationCard icon={Wrench} label="Préventifs en retard" value={String(data.kpis.overdueMaintenance)} />
        <FoundationCard icon={Activity} label="Alertes ouvertes" value={String(data.kpis.openAlerts)} />
        <FoundationCard icon={CircleDollarSign} label="Carburant du mois" value={`${data.kpis.monthlyFuelCost.toLocaleString('fr-FR')} DH`} />
        <FoundationCard icon={Activity} label="Signaux carburant" value={String(data.kpis.openFuelAnomalies)} />
        <FoundationCard icon={Truck} label="Pneus installés" value={String(data.kpis.installedTires)} />
        <FoundationCard icon={Shapes} label="Pièces en stock bas" value={String(data.kpis.lowStockParts)} />
        <FoundationCard icon={CircleDollarSign} label="Valeur du stock" value={`${data.kpis.inventoryValue.toLocaleString('fr-FR')} DH`} />
        <FoundationCard icon={FileText} label="Approbations achats en attente" value={String(data.kpis.pendingProcurementApprovals)} />
        <FoundationCard icon={CircleDollarSign} label="Factures validées du mois" value={`${data.kpis.monthlyInvoicedCost.toLocaleString('fr-FR')} DH`} />
      </section>
      <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="État de la fondation">
        <FoundationCard icon={Database} label="Version du schéma" value={data.foundation.schemaVersion || '—'} />
        <FoundationCard icon={MapPinned} label="Sites configurés" value={String(data.foundation.sites)} />
        <FoundationCard icon={Shapes} label="Catégories d’actifs" value={String(data.foundation.assetCategories)} />
        <FoundationCard icon={KeyRound} label="Permissions accordées" value={data.permissions.includes('*') ? 'Toutes' : String(data.permissions.length)} />
      </section>
      <section className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 sm:p-6">
        <div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-600 text-white"><ShieldCheck className="h-5 w-5" /></span><div><h2 className="font-black text-emerald-950">Accès sécurisé opérationnel</h2><p className="mt-1 text-sm text-emerald-800">Rôle : {roleLabels[data.role] || data.role}. L’identité PROGAD centrale est utilisée, sans compte Logistique distinct.</p></div></div>
      </section>
    </>}
  </div>;
}

function FoundationCard({ icon: Icon, label, value }: { icon: typeof Database; label: string; value: string }) {
  return <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-700"><Icon className="h-5 w-5" /></span><span className="text-2xl font-black text-slate-950">{value}</span></div><p className="mt-4 text-xs font-semibold text-slate-500">{label}</p></article>;
}
