import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Truck, X } from 'lucide-react';
import { useApp } from '../../lib/AppContext';
import { logisticsApi } from '../services/api';
import type { Asset, Page, ReferenceData } from '../types';

const statusLabels: Record<string, string> = { available: 'Disponible', in_operation: 'En exploitation', under_maintenance: 'En maintenance', immobilized: 'Immobilisé', out_of_service: 'Hors service', sold: 'Vendu', decommissioned: 'Réformé' };
const blank = { fleetNumber: '', registrationNumber: '', categoryId: '', brand: '', model: '', serialNumber: '', vin: '', manufactureYear: '', acquisitionDate: '', purchaseCost: '', siteId: '', departmentId: '', currentMileage: '0', currentOperatingHours: '0', fuelType: '', status: 'available', notes: '' };

export default function AssetsPage({ group }: { group: 'vehicles' | 'equipment' }) {
  const { currentUser } = useApp();
  const access = currentUser?.accesses?.find((item) => item.module === 'logistique');
  const canCreate = access?.permissions.includes('*') || access?.permissions.includes('assets.create');
  const [page, setPage] = useState<Page<Asset> | null>(null);
  const [references, setReferences] = useState<ReferenceData>({ sites: [], departments: [], assetCategories: [] });
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<typeof blank | null>(null);
  const [error, setError] = useState('');
  const title = group === 'vehicles' ? 'Véhicules' : 'Engins & équipements';
  const allowedCodes = group === 'vehicles' ? ['truck', 'light_commercial', 'passenger_vehicle'] : ['forklift', 'handling_equipment', 'trailer', 'other'];
  const categories = useMemo(() => references.assetCategories.filter((item) => allowedCodes.includes(item.code)), [references, group]);

  const load = async () => {
    try {
      const query = new URLSearchParams({ assetGroup: group, ...(search ? { search } : {}) });
      const [assets, refs] = await Promise.all([logisticsApi.get<Page<Asset>>(`/assets?${query}`), logisticsApi.get<ReferenceData>('/reference-data')]);
      setPage(assets); setReferences(refs); setError('');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Chargement impossible.'); }
  };
  useEffect(() => { void load(); }, [group]);

  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (!form) return;
    try {
      await logisticsApi.post('/assets', { ...form, manufactureYear: form.manufactureYear || null, purchaseCost: form.purchaseCost || null, currentMileage: Number(form.currentMileage), currentOperatingHours: Number(form.currentOperatingHours) });
      setForm(null); await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Création impossible.'); }
  };

  return <div className="mx-auto w-full max-w-7xl">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-blue-600">Gestion du parc</p><h1 className="mt-2 text-3xl font-black tracking-tight">{title}</h1><p className="mt-1 text-sm text-slate-500">{page?.total ?? 0} actif(s) dans votre périmètre.</p></div>{canCreate && <button onClick={() => setForm({ ...blank, categoryId: categories[0]?.id || '', siteId: references.sites[0]?.id || '' })} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white"><Plus className="h-4 w-4" /> Nouvel actif</button>}</div>
    <form onSubmit={(event) => { event.preventDefault(); void load(); }} className="mt-6 flex max-w-md gap-2"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input className="field w-full pl-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="N° parc, immatriculation, marque…" /></div><button className="rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold">Rechercher</button></form>
    {error && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">{!page ? <p className="p-10 text-center text-sm text-slate-500">Chargement…</p> : !page.data.length ? <p className="p-10 text-center text-sm text-slate-500">Aucun actif enregistré.</p> : <div className="overflow-x-auto"><table className="w-full"><thead><tr><th>N° parc</th><th>Actif</th><th>Site</th><th>Compteur</th><th>Conducteur</th><th>Statut</th></tr></thead><tbody>{page.data.map((asset) => <tr key={asset.id}><td><Link className="font-black text-blue-700 hover:underline" to={`${asset.id}`}>{asset.fleet_number}</Link><p className="text-xs text-slate-400">{asset.registration_number || 'Sans immatriculation'}</p></td><td><b>{asset.brand} {asset.model}</b><p className="text-xs text-slate-400">{asset.category_name}</p></td><td>{asset.site_code}</td><td>{Number(asset.current_mileage) > 0 ? `${Number(asset.current_mileage).toLocaleString('fr-FR')} km` : `${Number(asset.current_operating_hours).toLocaleString('fr-FR')} h`}</td><td>{asset.primary_driver_name || '—'}</td><td><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold">{statusLabels[asset.status] || asset.status}</span></td></tr>)}</tbody></table></div>}</section>
    {form && <div className="fixed inset-0 z-[70] grid place-items-end bg-slate-950/60 sm:place-items-center sm:p-4"><form onSubmit={submit} className="max-h-[95dvh] w-full max-w-3xl overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-7"><div className="flex items-center justify-between"><h2 className="text-xl font-black">Nouvel actif</h2><button type="button" onClick={() => setForm(null)}><X /></button></div><div className="mt-6 grid gap-4 sm:grid-cols-2">
      <Field label="Numéro de parc"><input required className="field w-full" value={form.fleetNumber} onChange={e=>setForm({...form,fleetNumber:e.target.value})} /></Field><Field label="Immatriculation"><input className="field w-full" value={form.registrationNumber} onChange={e=>setForm({...form,registrationNumber:e.target.value})} /></Field>
      <Field label="Catégorie"><select required className="field w-full" value={form.categoryId} onChange={e=>setForm({...form,categoryId:e.target.value})}>{categories.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></Field><Field label="Site"><select required className="field w-full" value={form.siteId} onChange={e=>setForm({...form,siteId:e.target.value})}>{references.sites.map(x=><option key={x.id} value={x.id}>{x.code} · {x.name}</option>)}</select></Field>
      <Field label="Marque"><input required className="field w-full" value={form.brand} onChange={e=>setForm({...form,brand:e.target.value})} /></Field><Field label="Modèle"><input required className="field w-full" value={form.model} onChange={e=>setForm({...form,model:e.target.value})} /></Field>
      <Field label="VIN"><input className="field w-full" value={form.vin} onChange={e=>setForm({...form,vin:e.target.value})} /></Field><Field label="N° de série"><input className="field w-full" value={form.serialNumber} onChange={e=>setForm({...form,serialNumber:e.target.value})} /></Field>
      <Field label="Année"><input type="number" min="1900" max="2200" className="field w-full" value={form.manufactureYear} onChange={e=>setForm({...form,manufactureYear:e.target.value})} /></Field><Field label="Coût d’acquisition (MAD)"><input type="number" min="0" step="0.01" className="field w-full" value={form.purchaseCost} onChange={e=>setForm({...form,purchaseCost:e.target.value})} /></Field>
    </div><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={()=>setForm(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold">Annuler</button><button className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white">Créer l’actif</button></div></form></div>}
  </div>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="text-xs font-bold text-slate-700">{label}<span className="mt-1.5 block">{children}</span></label>; }
