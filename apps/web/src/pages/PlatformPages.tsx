import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Banknote, FileWarning, LogOut, Settings, ShieldX, Plus, Pencil, Power, X, Save } from 'lucide-react';
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
  cheques: { label: 'Chèques et effets', description: 'Comptes, échéances, partenaires et impressions', href: '/cheques', icon: Banknote, color: 'bg-blue-600' },
  impayes: { label: 'Suivi des impayés', description: 'Dossiers, actions, alertes et synchronisation ERP', href: '/impayes', icon: FileWarning, color: 'bg-amber-500' },
  administration: { label: 'Administration', description: 'Identités, accès et rôles par module', href: '/administration', icon: Settings, color: 'bg-violet-600' },
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
  return <main className="min-h-screen bg-slate-50 p-5 sm:p-8 md:p-10"><div className="mx-auto max-w-6xl">
    <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-bold text-blue-600">GADIMAT</p><h1 className="text-2xl font-black text-slate-900 sm:text-3xl">Bonjour {currentUser?.name}</h1><p className="mt-1 text-slate-500">Sélectionnez un module autorisé.</p></div><button onClick={() => void logout()} className="flex w-fit items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-semibold"><LogOut className="h-4 w-4" />Déconnexion</button></header>
    {allowed.length ? <div className="grid gap-5 md:grid-cols-2">{allowed.map(([code, item]) => <Link key={code} to={item.href} className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"><span className={`inline-flex rounded-xl p-3 text-white ${item.color}`}><item.icon className="h-6 w-6" /></span><h2 className="mt-5 text-xl font-bold text-slate-900">{item.label}</h2><p className="mt-1 text-sm text-slate-500">{item.description}</p></Link>)}</div> : <p className="rounded-2xl border bg-white p-8 text-slate-600">Aucun module ne vous est affecté.</p>}
  </div></main>;
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
