import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Activity, ArrowUpRight, Banknote, CheckCircle2, ChevronLeft, FileWarning, Grid2X2, KeyRound, LogOut, Search, Settings, ShieldCheck, ShieldX, Sparkles, Plus, Pencil, Power, RefreshCw, Save, Trash2, Truck, UserCheck, UserCog, Users, UserX, X } from 'lucide-react';
import { ProgadBrand } from '../components/ProgadBrand';
import { useApp } from '../lib/AppContext';
import { api } from '../lib/api';

type ModuleCode = 'cheques' | 'impayes' | 'logistique';
type Access = { module: ModuleCode; role: string; permissions: string[]; dataScope: Record<string, unknown>; legacyUserId?: string };
type CentralUser = { id: string; name: string; email: string; active: boolean; platformAdmin: boolean; accesses: Access[] };
type LegacyUser = { id: string; name: string; email: string; role: string; active: boolean };
type LegacyOptions = { cheques: LegacyUser[]; impayes: LegacyUser[] };
type AccessDraft = { enabled: boolean; role: string; legacyUserId: string };
type UserDraft = { id?: string; name: string; email: string; password: string; platformAdmin: boolean; accesses: Record<ModuleCode, AccessDraft> };

const modules = {
  cheques: {
    label: 'Suivi des Instances', eyebrow: 'Finance & exploitation', href: '/cheques', icon: Banknote,
    description: 'Pilotez les règlements, les échéances et les consommations de vos sites.',
    iconStyle: 'bg-blue-600 text-white shadow-blue-600/25', accent: 'from-blue-600 to-indigo-600', glow: 'bg-blue-400',
  },
  impayes: {
    label: 'Suivi des impayés', eyebrow: 'Recouvrement', href: '/impayes', icon: FileWarning,
    description: 'Priorisez les dossiers, les relances et les actions de recouvrement.',
    iconStyle: 'bg-amber-500 text-white shadow-amber-500/25', accent: 'from-amber-500 to-orange-500', glow: 'bg-amber-300',
  },
  logistique: {
    label: 'Logistique & GMAO', eyebrow: 'Parc & maintenance', href: '/logistique', icon: Truck,
    description: 'Supervisez le parc, la maintenance, les coûts et la disponibilité.',
    iconStyle: 'bg-cyan-600 text-white shadow-cyan-600/25', accent: 'from-cyan-500 to-teal-500', glow: 'bg-cyan-300',
  },
};

const accessConfig: Record<ModuleCode, { label: string; source?: keyof LegacyOptions; roles: string[] }> = {
  cheques: { label: 'Suivi des Instances', source: 'cheques', roles: ['Utilisateur', 'Administrateur'] },
  impayes: { label: 'Suivi des impayés', source: 'impayes', roles: ['commercial', 'responsable_recouvrement', 'lecture_seule', 'admin'] },
  logistique: {
    label: 'Logistique & GMAO',
    roles: ['logistics_admin', 'fleet_manager', 'maintenance_manager', 'logistics_operator', 'finance', 'read_only'],
  },
};

const logisticsRoleLabels: Record<string, string> = {
  logistics_admin: 'Administrateur Logistique',
  fleet_manager: 'Gestionnaire de parc',
  maintenance_manager: 'Responsable maintenance',
  logistics_operator: 'Opérateur logistique',
  finance: 'Finance',
  read_only: 'Lecture seule',
};
const roleLabel = (module: ModuleCode, role: string) => module === 'logistique'
  ? logisticsRoleLabels[role] || role
  : module === 'impayes' && role === 'responsable_recouvrement' ? 'Utilisateur' : role;

const blankDraft = (): UserDraft => ({
  name: '', email: '', password: '', platformAdmin: false,
  accesses: {
    cheques: { enabled: false, role: 'Utilisateur', legacyUserId: '' },
    impayes: { enabled: false, role: 'commercial', legacyUserId: '' },
    logistique: { enabled: false, role: 'read_only', legacyUserId: '' },
  },
});

export function ModuleDashboard() {
  const { currentUser, logout } = useApp();
  const allowed = Object.entries(modules).filter(([code]) => currentUser?.accesses?.some((access) => access.module === code));
  const firstName = currentUser?.name?.trim().split(/\s+/)[0] || 'Utilisateur';
  const initials = currentUser?.name?.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'GA';
  const today = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
  const profileLabel = currentUser?.platformAdmin ? 'Administrateur' : 'Collaborateur';

  return <main className="relative min-h-screen overflow-hidden bg-[#f3f6fb] text-[#111827]">
    <div className="pointer-events-none absolute -right-48 top-20 h-[32rem] w-[32rem] rounded-full bg-blue-200/30 blur-3xl" />
    <div className="pointer-events-none absolute -left-40 top-[28rem] h-96 w-96 rounded-full bg-cyan-100/50 blur-3xl" />
    <header className="sticky top-0 z-30 border-b border-white/70 bg-white/85 backdrop-blur-2xl">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-10">
        <ProgadBrand className="w-40 sm:w-44" />
        <div className="flex items-center gap-3 sm:gap-4">
          {currentUser?.platformAdmin && <Link to="/administration" className="hidden h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:text-blue-700 sm:inline-flex"><Settings className="h-4 w-4" /> Utilisateurs</Link>}
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-xs font-black text-white shadow-lg shadow-blue-600/20">{initials}</span>
            <div className="hidden max-w-48 sm:block"><p className="truncate text-sm font-bold text-slate-800">{currentUser?.name}</p><p className="truncate text-[11px] text-slate-500">{profileLabel}</p></div>
          </div>
          <span className="hidden h-8 w-px bg-slate-200 sm:block" aria-hidden="true" />
          <button aria-label="Se déconnecter" title="Se déconnecter" onClick={() => void logout()} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 transition duration-200 hover:border-red-200 hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"><LogOut className="h-[18px] w-[18px]" /></button>
        </div>
      </div>
    </header>

    <div className="relative mx-auto w-full max-w-7xl px-5 pb-16 pt-7 sm:px-8 sm:pt-10 lg:px-10">
      {currentUser?.platformAdmin && <Link to="/administration" className="mb-4 inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-700 shadow-sm sm:hidden"><Settings className="h-4 w-4" /> Utilisateurs</Link>}
      <section aria-labelledby="dashboard-title" className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#102a56] via-[#17458a] to-[#2474c8] px-6 py-8 text-white shadow-[0_24px_60px_rgba(23,69,138,0.22)] sm:px-10 sm:py-10">
        <div className="absolute -right-14 -top-20 h-64 w-64 rounded-full border-[42px] border-white/5" />
        <div className="absolute bottom-0 right-16 h-32 w-32 translate-y-1/2 rounded-full bg-cyan-300/15 blur-xl" />
        <div className="relative max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.16em] text-blue-50"><Sparkles className="h-3.5 w-3.5 text-cyan-300" /> Espace de travail PROGAD</div>
          <p className="mt-6 text-xs font-medium capitalize text-blue-100">{today}</p>
          <h1 id="dashboard-title" className="mt-2 text-[2rem] font-black tracking-[-0.04em] sm:text-4xl lg:text-5xl">Bonjour {firstName} <span className="inline-block origin-bottom-right animate-[wave_1.8s_ease-in-out_1]" aria-hidden="true">👋</span></h1>
          <div className="mt-7 flex flex-wrap gap-3 text-xs font-semibold">
            <span className="rounded-xl bg-white/10 px-3 py-2 ring-1 ring-inset ring-white/10">{allowed.length} espace{allowed.length > 1 ? 's' : ''} accessible{allowed.length > 1 ? 's' : ''}</span>
          </div>
        </div>
      </section>

      <section className="mt-9 sm:mt-11" aria-label="Applications">
        <div className="mb-5 flex items-end justify-between gap-4"><span className="hidden text-xs font-medium text-slate-400 sm:block">Sélectionnez un espace pour continuer</span></div>
        {allowed.length ? <div className="grid gap-4 md:grid-cols-3 lg:gap-5">
          {allowed.map(([code, item], index) => <ApplicationTile key={code} item={item} index={index} />)}
        </div> : <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center"><Grid2X2 className="mx-auto h-7 w-7 text-slate-300" /><p className="mt-3 text-sm font-semibold text-slate-700">Aucun module ne vous est affecté.</p><p className="mt-1 text-xs text-slate-500">Contactez l’administrateur PROGAD.</p></div>}
      </section>
    </div>
  </main>;
}

function ApplicationTile({ item, index }: { item: (typeof modules)[keyof typeof modules]; index: number }) {
  const Icon = item.icon;
  return <Link to={item.href} aria-label={`Ouvrir ${item.label}`} className="group relative min-h-64 overflow-hidden rounded-[1.5rem] border border-white bg-white p-5 shadow-[0_10px_35px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70 transition duration-300 hover:-translate-y-1.5 hover:shadow-[0_22px_48px_rgba(15,23,42,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 sm:p-6">
    <span className={`absolute -right-12 -top-14 h-40 w-40 rounded-full opacity-0 blur-3xl transition duration-500 group-hover:opacity-30 ${item.glow}`} />
    <span className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${item.accent}`} />
    <div className="relative flex h-full flex-col">
      <div className="flex items-start justify-between"><span className={`grid h-14 w-14 place-items-center rounded-2xl shadow-lg transition duration-300 group-hover:rotate-[-3deg] group-hover:scale-105 ${item.iconStyle}`}><Icon className="h-6 w-6" strokeWidth={2} /></span><span className="text-[11px] font-black text-slate-200">0{index + 1}</span></div>
      <p className="mt-6 text-[10px] font-black uppercase tracking-[.15em] text-slate-400">{item.eyebrow}</p>
      <h3 className="mt-2 text-lg font-black leading-snug tracking-tight text-slate-950">{item.label}</h3>
      <p className="mt-2 text-xs leading-5 text-slate-500">{item.description}</p>
    </div>
  </Link>;
}

export function AdministrationPage() {
  const { currentUser, refreshCurrentUser } = useApp();
  const [users, setUsers] = useState<CentralUser[]>([]);
  const [legacy, setLegacy] = useState<LegacyOptions>({ cheques: [], impayes: [] });
  const [draft, setDraft] = useState<UserDraft | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const load = async () => {
    setError(''); setLoading(true);
    try {
      const [centralUsers, legacyUsers] = await Promise.all([
        api.get<CentralUser[]>('/administration/users'),
        api.get<LegacyOptions>('/administration/legacy-identities'),
      ]);
      setUsers(centralUsers);
      setLegacy(legacyUsers);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Chargement impossible.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { if (currentUser?.platformAdmin) void load(); }, [currentUser?.platformAdmin]);

  const edit = (user: CentralUser) => {
    const next = blankDraft();
    next.id = user.id; next.name = user.name; next.email = user.email; next.platformAdmin = user.platformAdmin;
    for (const access of user.accesses) if (access.module in next.accesses) next.accesses[access.module] = { enabled: true, role: access.role, legacyUserId: access.legacyUserId || '' };
    setDraft(next); setError(''); setSuccess('');
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!draft) return;
    const accesses = (Object.entries(draft.accesses) as [ModuleCode, AccessDraft][])
      .filter(([, access]) => access.enabled)
      .map(([module, access]) => ({ module, role: access.role, legacyUserId: access.legacyUserId }));
    if (accesses.some((access) => access.module !== 'logistique' && !access.legacyUserId)) { setError('Sélectionnez un identifiant historique pour chaque module historique activé.'); return; }
    setSaving(true); setError(''); setSuccess('');
    try {
      if (!draft.id) {
        await api.post('/administration/users', { name: draft.name, email: draft.email, password: draft.password, platformAdmin: draft.platformAdmin, accesses });
      } else {
        await api.put(`/administration/users/${draft.id}`, { name: draft.name, email: draft.email, platformAdmin: draft.platformAdmin });
        const original = users.find((user) => user.id === draft.id);
        for (const module of Object.keys(accessConfig) as ModuleCode[]) {
          const access = draft.accesses[module];
          if (access.enabled) await api.put(`/administration/users/${draft.id}/access/${module}`, { role: access.role, ...(module === 'logistique' ? {} : { legacyUserId: access.legacyUserId }) });
          else if (original?.accesses.some((item) => item.module === module)) await api.delete(`/administration/users/${draft.id}/access/${module}`);
        }
        if (draft.id === currentUser?.centralId) await refreshCurrentUser();
      }
      setDraft(null); setSuccess(draft.id ? 'Compte mis à jour.' : 'Compte créé.'); await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Enregistrement impossible.'); }
    finally { setSaving(false); }
  };

  const toggleStatus = async (user: CentralUser) => {
    if (!window.confirm(`${user.active ? 'Désactiver' : 'Réactiver'} le compte de ${user.name} ?`)) return;
    try { await api.patch(`/administration/users/${user.id}/status`, { active: !user.active }); setSuccess(`Compte ${user.active ? 'désactivé' : 'réactivé'}.`); await load(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Modification impossible.'); }
  };

  const removeUser = async (user: CentralUser) => {
    if (user.id === currentUser?.centralId) { setError('Vous ne pouvez pas supprimer votre propre compte.'); return; }
    if (!window.confirm(`Supprimer définitivement le compte de ${user.name} ?\n\nSes accès PROGAD seront supprimés. Les historiques métier existants seront conservés.`)) return;
    setDeletingId(user.id); setError(''); setSuccess('');
    try {
      await api.delete(`/administration/users/${user.id}`);
      setDraft((current) => current?.id === user.id ? null : current);
      setSuccess(`Le compte de ${user.name} a été supprimé.`);
      await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Suppression impossible.'); }
    finally { setDeletingId(null); }
  };

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('fr');
    return users.filter((user) => {
      const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' ? user.active : !user.active);
      const matchesSearch = !query || `${user.name} ${user.email}`.toLocaleLowerCase('fr').includes(query);
      return matchesStatus && matchesSearch;
    });
  }, [search, statusFilter, users]);
  const activeCount = users.filter((user) => user.active).length;
  const adminCount = users.filter((user) => user.platformAdmin).length;
  const accessCount = users.reduce((total, user) => total + user.accesses.length, 0);

  if (!currentUser?.platformAdmin) return <ForbiddenPage />;
  return <main className="min-h-screen bg-[#f3f6fb] text-slate-950">
    <header className="border-b border-slate-200 bg-white"><div className="mx-auto flex h-16 max-w-[1500px] items-center justify-between px-4 sm:px-6 lg:px-8"><div className="flex items-center gap-5"><ProgadBrand className="w-40 sm:w-44" /><span className="hidden h-7 w-px bg-slate-200 sm:block" /><div className="hidden sm:block"><p className="text-xs font-bold text-slate-800">Administration</p><p className="text-[10px] text-slate-400">Identités et habilitations</p></div></div><Link to="/dashboard" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50 hover:text-slate-950"><ChevronLeft className="h-4 w-4" /> <span className="hidden sm:inline">Retour au cockpit</span></Link></div></header>
    <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <section className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-violet-700"><ShieldCheck className="h-3.5 w-3.5" /> Zone administrateur</div><h1 className="mt-4 text-3xl font-black tracking-tight">Gestion des accès</h1><p className="mt-1 max-w-2xl text-sm text-slate-500">Créez les comptes, attribuez les modules et maîtrisez les rôles PROGAD depuis un espace unique.</p></div><button onClick={() => { setDraft(blankDraft()); setError(''); setSuccess(''); }} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white shadow-lg shadow-blue-600/15 transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/20"><Plus className="h-4 w-4" /> Nouveau compte</button></section>

      <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Synthèse des comptes">
        <AdminMetric icon={Users} label="Comptes" value={users.length} tone="blue" />
        <AdminMetric icon={UserCheck} label="Comptes actifs" value={activeCount} tone="emerald" />
        <AdminMetric icon={UserCog} label="Admins plateforme" value={adminCount} tone="violet" />
        <AdminMetric icon={KeyRound} label="Accès attribués" value={accessCount} tone="amber" />
      </section>

      {error && <div role="alert" className="mt-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700"><ShieldX className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}
      {success && <div role="status" className="mt-5 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />{success}</div>}

      <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between"><div><h2 className="font-black text-slate-900">Utilisateurs</h2><p className="mt-0.5 text-xs text-slate-500">{filteredUsers.length} compte{filteredUsers.length > 1 ? 's' : ''} affiché{filteredUsers.length > 1 ? 's' : ''}</p></div><div className="flex flex-col gap-3 sm:flex-row"><div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher un collaborateur…" className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 sm:w-64" /></div><div className="flex rounded-xl bg-slate-100 p-1">{(['all', 'active', 'inactive'] as const).map((filter) => <button key={filter} onClick={() => setStatusFilter(filter)} className={`rounded-lg px-3 py-2 text-[11px] font-bold transition ${statusFilter === filter ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>{filter === 'all' ? 'Tous' : filter === 'active' ? 'Actifs' : 'Inactifs'}</button>)}</div><button onClick={() => void load()} disabled={loading} aria-label="Actualiser les comptes" className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></button></div></div>

        {loading ? <div className="grid place-items-center px-6 py-20"><RefreshCw className="h-6 w-6 animate-spin text-blue-600" /><p className="mt-3 text-xs text-slate-500">Chargement des comptes…</p></div> : filteredUsers.length ? <div className="divide-y divide-slate-100">{filteredUsers.map((user) => {
          const userInitials = user.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
          return <article key={user.id} className="p-4 transition hover:bg-slate-50/70 sm:p-5"><div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between"><div className="flex min-w-0 gap-3.5"><span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl text-xs font-black ${user.active ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-400'}`}>{userInitials}</span><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate text-sm font-black text-slate-900">{user.name}</h3><span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${user.active ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{user.active ? <UserCheck className="h-3 w-3" /> : <UserX className="h-3 w-3" />}{user.active ? 'Actif' : 'Désactivé'}</span>{user.platformAdmin && <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-bold text-violet-700">Admin plateforme</span>}</div><p className="mt-1 truncate text-xs text-slate-500">{user.email}</p><div className="mt-3 flex flex-wrap gap-1.5">{user.accesses.length ? user.accesses.map((access) => <span key={access.module} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[10px] text-slate-600"><b className="text-slate-800">{accessConfig[access.module]?.label || access.module}</b><span className="mx-1 text-slate-300">·</span>{roleLabel(access.module, access.role)}{access.legacyUserId && <><span className="mx-1 text-slate-300">·</span>ID {access.legacyUserId}</>}</span>) : <span className="rounded-lg bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-700">Aucun module attribué</span>}</div></div></div><div className="flex shrink-0 flex-wrap gap-2 pl-[3.4rem] xl:pl-0"><button onClick={() => edit(user)} className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 transition hover:border-blue-200 hover:text-blue-700"><Pencil className="h-3.5 w-3.5" /> Modifier</button><button onClick={() => void toggleStatus(user)} className={`inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-xs font-bold transition ${user.active ? 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100' : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}><Power className="h-3.5 w-3.5" />{user.active ? 'Désactiver' : 'Réactiver'}</button>{user.id !== currentUser?.centralId && <button disabled={deletingId === user.id} onClick={() => void removeUser(user)} className="inline-flex h-9 items-center gap-2 rounded-lg border border-red-200 bg-white px-3 text-xs font-bold text-red-600 transition hover:bg-red-50 disabled:cursor-wait disabled:opacity-50"><Trash2 className="h-3.5 w-3.5" />{deletingId === user.id ? 'Suppression…' : 'Supprimer'}</button>}</div></div></article>;
        })}</div> : <div className="px-6 py-16 text-center"><Search className="mx-auto h-7 w-7 text-slate-300" /><p className="mt-3 text-sm font-bold text-slate-700">Aucun compte trouvé</p><p className="mt-1 text-xs text-slate-500">Modifiez votre recherche ou le filtre sélectionné.</p></div>}
      </section>
      <p className="mt-4 text-center text-[11px] text-slate-400">La désactivation préserve l’historique et bloque immédiatement les accès.</p>
    </div>
    {draft && <UserEditor draft={draft} setDraft={setDraft} legacy={legacy} saving={saving} error={error} close={() => setDraft(null)} save={save} />}
  </main>;
}

function AdminMetric({ icon: Icon, label, value, tone }: { icon: typeof Users; label: string; value: number; tone: 'blue' | 'emerald' | 'violet' | 'amber' }) {
  const tones = { blue: 'bg-blue-50 text-blue-700', emerald: 'bg-emerald-50 text-emerald-700', violet: 'bg-violet-50 text-violet-700', amber: 'bg-amber-50 text-amber-700' };
  return <article className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><span className={`grid h-10 w-10 place-items-center rounded-xl ${tones[tone]}`}><Icon className="h-5 w-5" /></span><div><p className="text-2xl font-black text-slate-900">{value}</p><p className="text-[11px] font-medium text-slate-500">{label}</p></div></article>;
}

function UserEditor({ draft, setDraft, legacy, saving, error, close, save }: { draft: UserDraft; setDraft: (draft: UserDraft) => void; legacy: LegacyOptions; saving: boolean; error: string; close: () => void; save: (event: FormEvent) => void }) {
  const modules = useMemo(() => Object.entries(accessConfig) as [ModuleCode, typeof accessConfig[ModuleCode]][], []);
  const setAccess = (module: ModuleCode, patch: Partial<AccessDraft>) => setDraft({ ...draft, accesses: { ...draft.accesses, [module]: { ...draft.accesses[module], ...patch } } });
  const enabledCount = Object.values(draft.accesses).filter((access) => access.enabled).length;
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"><form onSubmit={save} className="flex max-h-[96dvh] w-full max-w-4xl flex-col overflow-hidden rounded-t-[1.75rem] bg-white shadow-2xl sm:max-h-[92dvh] sm:rounded-[1.75rem]"><header className="flex shrink-0 items-start justify-between border-b border-slate-200 bg-white px-5 py-4 sm:px-7 sm:py-5"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-700"><UserCog className="h-5 w-5" /></span><div><p className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Gestion d’identité</p><h2 className="mt-0.5 text-lg font-black text-slate-950">{draft.id ? 'Modifier le collaborateur' : 'Créer un collaborateur'}</h2><p className="mt-0.5 text-xs text-slate-500">Aucun accès n’est accordé automatiquement.</p></div></div><button type="button" onClick={close} aria-label="Fermer" className="grid h-9 w-9 place-items-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"><X className="h-5 w-5" /></button></header>
    <div className="overflow-y-auto p-5 sm:p-7">
      {error && <div role="alert" className="mb-5 flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700"><ShieldX className="h-4 w-4 shrink-0" />{error}</div>}
      <section><div className="mb-4 flex items-center gap-2"><span className="grid h-7 w-7 place-items-center rounded-lg bg-slate-100 text-slate-600"><Users className="h-3.5 w-3.5" /></span><div><h3 className="text-sm font-black text-slate-900">Informations du compte</h3><p className="text-[11px] text-slate-400">Identité utilisée pour la connexion centralisée</p></div></div><div className="grid gap-4 sm:grid-cols-2"><label className="text-xs font-bold text-slate-700">Nom complet<input required className="field mt-1.5 w-full" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="Prénom et nom" /></label><label className="text-xs font-bold text-slate-700">E-mail professionnel<input required type="email" className="field mt-1.5 w-full" value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} placeholder="prenom.nom@gadimat.ma" /></label>{!draft.id && <label className="text-xs font-bold text-slate-700 sm:col-span-2">Mot de passe initial<input required minLength={12} type="password" autoComplete="new-password" className="field mt-1.5 w-full" value={draft.password} onChange={(event) => setDraft({ ...draft, password: event.target.value })} placeholder="12 caractères minimum" /><span className="mt-1.5 block text-[10px] font-normal text-slate-400">Le collaborateur utilisera ce mot de passe lors de sa première connexion.</span></label>}</div></section>

      <label className={`mt-5 flex cursor-pointer items-center justify-between gap-4 rounded-xl border p-4 transition ${draft.platformAdmin ? 'border-violet-200 bg-violet-50' : 'border-slate-200 bg-slate-50'}`}><div className="flex items-center gap-3"><span className={`grid h-9 w-9 place-items-center rounded-xl ${draft.platformAdmin ? 'bg-violet-600 text-white' : 'bg-white text-slate-400'}`}><ShieldCheck className="h-4 w-4" /></span><div><p className="text-xs font-black text-slate-900">Administrateur de la plateforme</p><p className="mt-0.5 text-[10px] text-slate-500">Autorise la gestion des comptes et habilitations, sans accorder les modules métier.</p></div></div><input type="checkbox" className="h-4 w-4 accent-violet-600" checked={draft.platformAdmin} onChange={(event) => setDraft({ ...draft, platformAdmin: event.target.checked })} /></label>

      <section className="mt-7 border-t border-slate-100 pt-6">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2"><span className="grid h-7 w-7 place-items-center rounded-lg bg-blue-50 text-blue-600"><Grid2X2 className="h-3.5 w-3.5" /></span><div><h3 className="text-sm font-black text-slate-900">Habilitations métier</h3><p className="text-[11px] text-slate-400">Module, rôle et identité centrale ou historique</p></div></div>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">{enabledCount} actif{enabledCount > 1 ? 's' : ''}</span>
        </div>
        <div className="grid gap-3">{modules.map(([module, config]) => {
          const access = draft.accesses[module];
          const options = config.source ? legacy[config.source] : [];
          return <section key={module} className={`rounded-xl border p-4 transition ${access.enabled ? 'border-blue-200 bg-blue-50/40' : 'border-slate-200 bg-white'}`}>
            <label className="flex cursor-pointer items-center justify-between gap-4"><div><p className="text-xs font-black text-slate-900">{config.label}</p><p className="mt-0.5 text-[10px] text-slate-400">{access.enabled ? 'Accès activé pour ce collaborateur' : 'Aucun accès à ce module'}</p></div><input type="checkbox" className="h-4 w-4 accent-blue-600" checked={access.enabled} onChange={(event) => setAccess(module, { enabled: event.target.checked })} /></label>
            {access.enabled && <div className="mt-4 grid gap-3 border-t border-blue-100 pt-4 sm:grid-cols-2">
              <label className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Rôle dans le module<select className="field mt-1.5 w-full normal-case tracking-normal" value={access.role} onChange={(event) => setAccess(module, { role: event.target.value })}>{config.roles.map((role) => <option key={role} value={role}>{roleLabel(module, role)}</option>)}</select></label>
              {config.source
                ? <label className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Identité historique<select required className="field mt-1.5 w-full normal-case tracking-normal" value={access.legacyUserId} onChange={(event) => setAccess(module, { legacyUserId: event.target.value })}><option value="">Sélectionner une identité…</option>{access.legacyUserId && !options.some((item) => item.id === access.legacyUserId) && <option value={access.legacyUserId}>ID {access.legacyUserId} (actuel)</option>}{options.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.email} · {roleLabel(module, item.role)}{item.active ? '' : ' · inactif'}</option>)}</select></label>
                : <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">Identité PROGAD centrale utilisée automatiquement.</div>}
            </div>}
          </section>;
        })}</div>
      </section>
    </div><footer className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:px-7"><p className="hidden text-[10px] text-slate-400 sm:block">Les modifications prennent effet à la prochaine vérification de session.</p><div className="ml-auto flex gap-2"><button type="button" onClick={close} className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-600 transition hover:bg-slate-100">Annuler</button><button disabled={saving} className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-xs font-bold text-white shadow-lg shadow-blue-600/15 transition hover:bg-blue-700 disabled:cursor-wait disabled:bg-blue-300"><Save className="h-4 w-4" />{saving ? 'Enregistrement…' : draft.id ? 'Enregistrer les modifications' : 'Créer le compte'}</button></div></footer>
  </form></div>;
}

export function ForbiddenPage() { return <Status code="403" title="Accès refusé" text="Vous ne disposez pas des permissions nécessaires." />; }
export function NotFoundPage() { return <Status code="404" title="Page introuvable" text="La page demandée n’existe pas." />; }
function Status({ code, title, text }: { code: string; title: string; text: string }) { return <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6"><div className="text-center"><ShieldX className="mx-auto h-14 w-14 text-slate-300" /><p className="mt-4 text-6xl font-black text-slate-900">{code}</p><h1 className="mt-3 text-2xl font-bold">{title}</h1><p className="mt-2 text-slate-500">{text}</p><Link to="/dashboard" className="mt-6 inline-block rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white">Retour au cockpit PROGAD</Link></div></main>; }
