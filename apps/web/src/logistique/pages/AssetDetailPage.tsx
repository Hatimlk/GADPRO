import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Gauge, MapPin, Plus, Truck, UserRound } from 'lucide-react';
import { useApp } from '../../lib/AppContext';
import { logisticsApi } from '../services/api';
import type { Asset } from '../types';

type Detail = Asset & { meterReadings: Array<{ id: string; meter_type: string; reading: string; recorded_at: string }>; driverAssignments: Array<{ id: string; full_name: string; starts_at: string; ends_at: string | null; is_primary: boolean }> };

export default function AssetDetailPage() {
  const { id } = useParams();
  const { currentUser } = useApp();
  const permissions = currentUser?.accesses?.find((item) => item.module === 'logistique')?.permissions || [];
  const canMeter = permissions.includes('*') || permissions.includes('meters.create');
  const [asset, setAsset] = useState<Detail | null>(null);
  const [error, setError] = useState('');
  const [meter, setMeter] = useState({ meterType: 'odometer', reading: '', recordedAt: new Date().toISOString().slice(0, 16) });
  const load = async () => { try { setAsset(await logisticsApi.get<Detail>(`/assets/${id}`)); setError(''); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Chargement impossible.'); } };
  useEffect(() => { void load(); }, [id]);
  const addMeter = async (event: FormEvent) => { event.preventDefault(); try { await logisticsApi.post(`/assets/${id}/meters`, { ...meter, reading: Number(meter.reading), recordedAt: new Date(meter.recordedAt).toISOString(), correctionReason: null }); setMeter({ ...meter, reading: '' }); await load(); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Enregistrement impossible.'); } };
  if (error && !asset) return <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</p>;
  if (!asset) return <p className="text-sm text-slate-500">Chargement de la fiche…</p>;
  return <div className="mx-auto w-full max-w-7xl"><Link to=".." relative="path" className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-blue-700"><ArrowLeft className="h-4 w-4" /> Retour au parc</Link><div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-blue-600">{asset.category_name} · {asset.site_code}</p><h1 className="mt-2 text-3xl font-black">{asset.fleet_number}</h1><p className="mt-1 text-sm text-slate-500">{asset.brand} {asset.model} · {asset.registration_number || 'Sans immatriculation'}</p></div><span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">Version {asset.version}</span></div>
    {error && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Card icon={Truck} label="VIN / série" value={asset.vin || asset.serial_number || '—'} /><Card icon={MapPin} label="Site" value={asset.site_code} /><Card icon={Gauge} label="Kilométrage" value={`${Number(asset.current_mileage).toLocaleString('fr-FR')} km`} /><Card icon={UserRound} label="Conducteur principal" value={asset.primary_driver_name || 'Non affecté'} /></section>
    <div className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_1fr]"><section className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="font-black">Historique des compteurs</h2>{!asset.meterReadings.length ? <p className="mt-5 text-sm text-slate-500">Aucun relevé.</p> : <div className="mt-4 divide-y divide-slate-100">{asset.meterReadings.map((item)=><div key={item.id} className="flex items-center justify-between py-3 text-sm"><span>{item.meter_type === 'odometer' ? 'Kilométrage' : 'Heures'}</span><span className="font-black">{Number(item.reading).toLocaleString('fr-FR')} {item.meter_type === 'odometer' ? 'km' : 'h'} <small className="ml-2 font-normal text-slate-400">{new Date(item.recorded_at).toLocaleDateString('fr-FR')}</small></span></div>)}</div>}</section>
      {canMeter && <form onSubmit={addMeter} className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="font-black">Nouveau relevé</h2><label className="mt-4 block text-xs font-bold">Compteur<select className="field mt-1.5 w-full" value={meter.meterType} onChange={e=>setMeter({...meter,meterType:e.target.value})}><option value="odometer">Kilométrage</option><option value="hours">Heures</option></select></label><label className="mt-3 block text-xs font-bold">Valeur<input required type="number" min="0" step="0.1" className="field mt-1.5 w-full" value={meter.reading} onChange={e=>setMeter({...meter,reading:e.target.value})} /></label><label className="mt-3 block text-xs font-bold">Date<input required type="datetime-local" className="field mt-1.5 w-full" value={meter.recordedAt} onChange={e=>setMeter({...meter,recordedAt:e.target.value})} /></label><button className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white"><Plus className="h-4 w-4" /> Enregistrer</button></form>}
    </div>
  </div>;
}
function Card({ icon: Icon, label, value }: { icon: typeof Truck; label: string; value: string }) { return <article className="rounded-2xl border border-slate-200 bg-white p-4"><Icon className="h-5 w-5 text-blue-600" /><p className="mt-3 text-[11px] font-bold uppercase text-slate-400">{label}</p><p className="mt-1 truncate text-sm font-black">{value}</p></article>; }
