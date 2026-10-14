import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Banknote, FileWarning, Grid2X2, LogOut, Settings, ShieldCheck, ShieldX, Plus, Pencil, Power, X, Save } from 'lucide-react';
import { useApp } from '../lib/AppContext';
import { api } from '../lib/api';

type ModuleCode = 'cheques' | 'impayes' | 'consommations';
type Access = { module: ModuleCode; role: string; permissions: string[]; dataScope: Record<string, unknown>; legacyUserId?: string };
type CentralUser = { id: string; name: string; email: string; active: boolean; platformAdmin: boolean; accesses: Access[] };
type LegacyUser = { id: string; name: string; email: string; role: string; active: boolean };
type LegacyOptions = { cheques: LegacyUser[]; impayes: LegacyUser[] };
type AccessDraft = { enabled: boolean; role: string; legacyUserId: string };
type UserDraft = { id?: string; name: string; email: string; password: string; platformAdmin: boolean; accesses: Record<ModuleCode, AccessDraft> };

const modules = {
  cheques: {
    label: 'Chèques et effets', description: 'Comptes, échéances, partenaires et impressions', href: '/cheques', icon: Banknote,
    eyebrow: 'Finance', iconStyle: 'bg-blue-600 text-white shadow-blue-600/25', accentStyle: 'bg-blue-600', softStyle: 'bg-blue-50 text-blue-700',
  },
  impayes: {
    label: 'Suivi des impayés', description: 'Dossiers, actions, alertes et synchronisation ERP', href: '/impayes', icon: FileWarning,
    eyebrow: 'Recouvrement', iconStyle: 'bg-amber-500 text-white shadow-amber-500/25', accentStyle: 'bg-amber-500', softStyle: 'bg-amber-50 text-amber-700',
  },
  administration: {
    label: 'Administration', description: 'Identités, accès et rôles par module', href: '/administration', icon: Settings,
    eyebrow: 'Configuration', iconStyle: 'bg-violet-600 text-white shadow-violet-600/25', accentStyle: 'bg-violet-600', softStyle: 'bg-violet-50 text-violet-700',
  },
};

const accessConfig: Record<ModuleCode, { label: string; source: keyof LegacyOptions; roles: string[] }> = {
  cheques: { label: 'Chèques et effets', source: 'cheques', roles: ['Utilisateur', 'Administrateur'] },
  impayes: { label: 'Suivi des impayés', source: 'impayes', roles: ['commercial', 'responsable_recouvrement', 'lecture_seule', 'admin'] },
  consommations: { label: 'Consommations', source: 'cheques', roles: ['Utilisateur', 'Administrateur'] },
};

const blankDraft = (): UserDraft => ({
  name: '', email: '', password: '', platformAdmin: false,
  accesses: {
    cheques: { enabled: false, role: 'Utilisateur', legacyUserId: '' },
    impayes: { enabled: false, role: 'commercial', legacyUserId: '' },
    consommations: { enabled: false, role: 'Utilisateur', legacyUserId: '' },
  },
});

export function ModuleDashboard() {
  const { currentUser, logout } = useApp();
  const hasCheques = currentUser?.accesses?.some((access) => access.module === 'cheques') ?? false;
  const hasConsumptions = currentUser?.accesses?.some((access) => access.module === 'consommations') ?? false;
  const displayedModules = {
    ...modules,
    cheques: { ...modules.cheques, href: hasCheques ? '/cheques' : '/cheques/consommations' },
  };
  const allowed = Object.entries(displayedModules).filter(([code]) => code === 'administration'
    ? currentUser?.platformAdmin
    : code === 'cheques'
      ? hasCheques || hasConsumptions
      : currentUser?.accesses?.some((access) => access.module === code));
  const firstName = currentUser?.name?.trim().split(/\s+/)[0] || 'Utilisateur';
  const initials = currentUser?.name?.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'GA';

  return <main className="relative min-h-screen overflow-hidden bg-[#f4f7fb] text-slate-950">
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[32rem] bg-[radial-gradient(circle_at_15%_0%,rgba(37,99,235,0.12),transparent_38%),radial-gradient(circle_at_85%_10%,rgba(124,58,237,0.08),transparent_34%)]" />
    <div className="relative mx-auto max-w-7xl px-4 pb-12 pt-4 sm:px-6 sm:pb-16 sm:pt-6 lg:px-8">
      <header className="flex items-center justify-between rounded-2xl border border-white/80 bg-white/75 px-4 py-3 shadow-[0_10px_40px_rgba(15,23,42,0.05)] backdrop-blur-xl sm:px-5">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-950 text-sm font-black tracking-tight text-white shadow-lg shadow-slate-950/15">G</span>
          <div>
            <p className="text-sm font-black tracking-[0.16em] text-slate-950">GADIMAT</p>
            <p className="hidden text-[11px] font-medium text-slate-500 sm:block">Plateforme de gestion unifiée</p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden items-center gap-2 border-r border-slate-200 pr-3 sm:flex">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-blue-50 text-xs font-bold text-blue-700">{initials}</span>
            <span className="max-w-32 truncate text-sm font-semibold text-slate-700">{currentUser?.name}</span>
          </div>
          <button aria-label="Se déconnecter" onClick={() => void logout()} className="group inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 sm:px-4">
            <LogOut className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            <span className="hidden sm:inline">Déconnexion</span>
          </button>
        </div>
      </header>

      <section className="relative mt-6 overflow-hidden rounded-[2rem] bg-slate-950 px-6 py-8 text-white shadow-[0_24px_70px_rgba(15,23,42,0.18)] sm:px-9 sm:py-10 lg:px-12 lg:py-12">
        <div aria-hidden="true" className="absolute -right-20 -top-32 h-80 w-80 rounded-full bg-blue-600/25 blur-3xl" />
        <div aria-hidden="true" className="absolute -bottom-40 left-1/3 h-72 w-72 rounded-full bg-violet-600/20 blur-3xl" />
        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-semibold text-blue-100 backdrop-blur">
              <ShieldCheck className="h-3.5 w-3.5" /> Espace sécurisé
            </span>
            <h1 className="mt-5 text-3xl font-black tracking-[-0.035em] sm:text-4xl lg:text-5xl">Bonjour {firstName}<span className="text-blue-400">.</span></h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300 sm:text-base">Retrouvez vos outils de travail dans un seul espace. Choisissez un module pour continuer.</p>
          </div>
          <div className="flex w-fit items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.07] p-3 backdrop-blur-sm">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-white/10 text-blue-300"><Grid2X2 className="h-5 w-5" /></span>
            <div className="pr-2"><p className="text-2xl font-black leading-none">{allowed.length}</p><p className="mt-1 text-xs text-slate-400">module{allowed.length > 1 ? 's' : ''} accessible{allowed.length > 1 ? 's' : ''}</p></div>
          </div>
        </div>
      </section>

      <section className="mt-9 sm:mt-11" aria-labelledby="modules-title">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Vos accès</p><h2 id="modules-title" className="mt-1 text-xl font-black tracking-tight text-slate-950 sm:text-2xl">Espaces de travail</h2></div>
          <p className="hidden text-sm text-slate-500 sm:block">Sélectionnez un module pour l’ouvrir</p>
        </div>
        {allowed.length ? <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-5">{allowed.map(([code, item]) => <Link key={code} to={item.href} className="group relative isolate min-h-60 overflow-hidden rounded-[1.6rem] border border-slate-200/80 bg-white p-6 shadow-[0_8px_30px_rgba(15,23,42,0.055)] transition duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_20px_50px_rgba(15,23,42,0.11)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-4 sm:p-7">
          <span aria-hidden="true" className={`absolute inset-x-0 top-0 h-1 ${item.accentStyle}`} />
          <div className="flex items-start justify-between gap-4">
            <span className={`inline-flex rounded-2xl p-3.5 shadow-lg ${item.iconStyle}`}><item.icon className="h-6 w-6" /></span>
            <span className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-slate-50 text-slate-500 transition duration-300 group-hover:rotate-3 group-hover:border-slate-950 group-hover:bg-slate-950 group-hover:text-white"><ArrowUpRight className="h-4 w-4" /></span>
          </div>
          <div className="mt-8">
            <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${item.softStyle}`}>{item.eyebrow}</span>
            <h3 className="mt-3 text-xl font-black tracking-tight text-slate-950 sm:text-2xl">{item.label}</h3>
            <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">{item.description}</p>
          </div>
          <div className="mt-6 flex items-center gap-2 text-sm font-bold text-slate-900"><span>Ouvrir le module</span><ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1" /></div>
        </Link>)}</div> : <div className="rounded-[1.6rem] border border-dashed border-slate-300 bg-white/70 p-8 text-center shadow-sm"><Grid2X2 className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-4 font-semibold text-slate-700">Aucun module ne vous est affecté.</p><p className="mt-1 text-sm text-slate-500">Contactez un administrateur pour demander un accès.</p></div>}
      </section>
      <footer className="mt-10 flex flex-col gap-2 border-t border-slate-200/80 pt-5 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between"><span>GADIMAT · Plateforme interne</span><span>Accès contrôlé selon vos permissions</span></footer>
    </div>
  </main>;
}

export function AdministrationPage() {
  const { currentUser } = useApp();
  const [users, setUsers] = useState<CentralUser[]>([]);
  const [legacy, setLegacy] = useState<LegacyOptions>({ cheques: [], impayes: [] });
  const [draft, setDraft] = useState<UserDraft | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setError('');
    try {
      const [centralUsers, legacyUsers] = await Promise.all([
        api.get<CentralUser[]>('/administration/users'),
        api.get<LegacyOptions>('/administration/legacy-identities'),
      ]);
      setUsers(centralUsers);
      setLegacy(legacyUsers);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Chargement impossible.'); }
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
    if (accesses.some((access) => !access.legacyUserId)) { setError('Sélectionnez un identifiant historique pour chaque module activé.'); return; }
    const chequesIds = accesses.filter((access) => access.module === 'cheques' || access.module === 'consommations').map((access) => access.legacyUserId);
    if (new Set(chequesIds).size > 1) { setError('Chèques et Consommations doivent correspondre au même utilisateur historique Chèques.'); return; }
    setSaving(true); setError(''); setSuccess('');
    try {
      if (!draft.id) {
        await api.post('/administration/users', { name: draft.name, email: draft.email, password: draft.password, platformAdmin: draft.platformAdmin, accesses });
      } else {
        await api.put(`/administration/users/${draft.id}`, { name: draft.name, email: draft.email, platformAdmin: draft.platformAdmin });
        const original = users.find((user) => user.id === draft.id);
        for (const module of Object.keys(accessConfig) as ModuleCode[]) {
          const access = draft.accesses[module];
          if (access.enabled) await api.put(`/administration/users/${draft.id}/access/${module}`, { role: access.role, legacyUserId: access.legacyUserId });
          else if (original?.accesses.some((item) => item.module === module)) await api.delete(`/administration/users/${draft.id}/access/${module}`);
        }
      }
      setDraft(null); setSuccess(draft.id ? 'Compte mis à jour.' : 'Compte créé.'); await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Enregistrement impossible.'); }
    finally { setSaving(false); }
  };

  const toggleStatus = async (user: CentralUser) => {
    if (!window.confirm(`${user.active ? 'Désactiver' : 'Réactiver'} le compte de ${user.name} ?`)) return;
    try { await api.patch(`/administration/users/${user.id}/status`, { active: !user.active }); await load(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Modification impossible.'); }
  };

  if (!currentUser?.platformAdmin) return <ForbiddenPage />;
  return <main className="min-h-screen bg-slate-50 p-4 sm:p-8"><div className="mx-auto max-w-7xl">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><Link to="/dashboard" className="text-sm font-semibold text-blue-600">← Accueil GADIMAT</Link><h1 className="mt-4 text-3xl font-black text-slate-950">Administration centrale</h1><p className="mt-1 text-slate-500">Comptes, modules, rôles et correspondances historiques.</p></div><button onClick={() => { setDraft(blankDraft()); setError(''); setSuccess(''); }} className="action primary"><Plus className="h-4 w-4" />Créer un compte</button></div>
    {error && <p className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    {success && <p className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{success}</p>}
    <div className="mt-7 grid gap-4">{users.map((user) => <article key={user.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="font-bold text-slate-950">{user.name}</h2><span className={`rounded-full px-2 py-0.5 text-xs font-bold ${user.active ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{user.active ? 'Actif' : 'Désactivé'}</span>{user.platformAdmin && <span className="rounded-full bg-violet-50 px-2 py-0.5 text-xs font-bold text-violet-700">Admin plateforme</span>}</div><p className="mt-1 truncate text-sm text-slate-500">{user.email}</p><div className="mt-3 flex flex-wrap gap-2">{user.accesses.length ? user.accesses.map((access) => <span key={access.module} className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs text-slate-700"><b>{accessConfig[access.module]?.label || access.module}</b> · {access.role} · ID {access.legacyUserId || 'manquant'}</span>) : <span className="text-sm text-slate-400">Aucun module</span>}</div></div><div className="flex shrink-0 gap-2"><button onClick={() => edit(user)} className="action secondary"><Pencil className="h-4 w-4" />Modifier</button><button onClick={() => void toggleStatus(user)} className={`action ${user.active ? 'border border-red-200 bg-red-50 text-red-700' : 'border border-emerald-200 bg-emerald-50 text-emerald-700'}`}><Power className="h-4 w-4" />{user.active ? 'Désactiver' : 'Réactiver'}</button></div></div></article>)}</div>
  </div>{draft && <UserEditor draft={draft} setDraft={setDraft} legacy={legacy} saving={saving} close={() => setDraft(null)} save={save} />}</main>;
}

function UserEditor({ draft, setDraft, legacy, saving, close, save }: { draft: UserDraft; setDraft: (draft: UserDraft) => void; legacy: LegacyOptions; saving: boolean; close: () => void; save: (event: FormEvent) => void }) {
  const modules = useMemo(() => Object.entries(accessConfig) as [ModuleCode, typeof accessConfig[ModuleCode]][], []);
  const setAccess = (module: ModuleCode, patch: Partial<AccessDraft>) => setDraft({ ...draft, accesses: { ...draft.accesses, [module]: { ...draft.accesses[module], ...patch } } });
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-3"><form onSubmit={save} className="max-h-[95dvh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl"><header className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-5 py-4"><div><h2 className="text-lg font-bold">{draft.id ? 'Modifier le compte' : 'Créer un compte'}</h2><p className="text-xs text-slate-500">Aucun module n’est accordé automatiquement.</p></div><button type="button" onClick={close} className="rounded-lg p-2 hover:bg-slate-100"><X className="h-5 w-5" /></button></header>
    <div className="grid gap-4 p-5 sm:grid-cols-2"><label className="text-sm font-semibold">Nom<input required className="field mt-1 w-full" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label><label className="text-sm font-semibold">E-mail<input required type="email" className="field mt-1 w-full" value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} /></label>{!draft.id && <label className="text-sm font-semibold sm:col-span-2">Mot de passe initial (12 caractères minimum)<input required minLength={12} type="password" className="field mt-1 w-full" value={draft.password} onChange={(event) => setDraft({ ...draft, password: event.target.value })} /></label>}<label className="flex items-center gap-3 rounded-xl border border-violet-100 bg-violet-50 p-3 text-sm font-semibold sm:col-span-2"><input type="checkbox" checked={draft.platformAdmin} onChange={(event) => setDraft({ ...draft, platformAdmin: event.target.checked })} />Administration de la plateforme</label>
      <div className="sm:col-span-2"><h3 className="mb-3 font-bold text-slate-900">Modules autorisés</h3><div className="grid gap-3">{modules.map(([module, config]) => { const access = draft.accesses[module]; const options = legacy[config.source]; return <section key={module} className={`rounded-xl border p-4 ${access.enabled ? 'border-blue-200 bg-blue-50/40' : 'border-slate-200'}`}><label className="flex items-center gap-3 font-bold"><input type="checkbox" checked={access.enabled} onChange={(event) => setAccess(module, { enabled: event.target.checked })} />{config.label}</label>{access.enabled && <div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="text-xs font-bold text-slate-600">Rôle<select className="field mt-1 w-full" value={access.role} onChange={(event) => setAccess(module, { role: event.target.value })}>{config.roles.map((role) => <option key={role}>{role}</option>)}</select></label><label className="text-xs font-bold text-slate-600">Utilisateur historique<select required className="field mt-1 w-full" value={access.legacyUserId} onChange={(event) => setAccess(module, { legacyUserId: event.target.value })}><option value="">Sélectionner…</option>{access.legacyUserId && !options.some((item) => item.id === access.legacyUserId) && <option value={access.legacyUserId}>ID {access.legacyUserId} (actuel)</option>}{options.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.email} · {item.role}{item.active ? '' : ' · inactif'}</option>)}</select></label></div>}</section>; })}</div></div>
    </div><footer className="sticky bottom-0 flex justify-end gap-2 border-t bg-white p-4"><button type="button" onClick={close} className="action secondary">Annuler</button><button disabled={saving} className="action primary disabled:opacity-50"><Save className="h-4 w-4" />{saving ? 'Enregistrement…' : 'Enregistrer'}</button></footer>
  </form></div>;
}

export function ForbiddenPage() { return <Status code="403" title="Accès refusé" text="Vous ne disposez pas des permissions nécessaires." />; }
export function NotFoundPage() { return <Status code="404" title="Page introuvable" text="La page demandée n’existe pas." />; }
function Status({ code, title, text }: { code: string; title: string; text: string }) { return <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6"><div className="text-center"><ShieldX className="mx-auto h-14 w-14 text-slate-300" /><p className="mt-4 text-6xl font-black text-slate-900">{code}</p><h1 className="mt-3 text-2xl font-bold">{title}</h1><p className="mt-2 text-slate-500">{text}</p><Link to="/dashboard" className="mt-6 inline-block rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white">Retour à l’accueil</Link></div></main>; }
