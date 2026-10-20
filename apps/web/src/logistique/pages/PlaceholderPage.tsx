import { Construction } from 'lucide-react';

export default function PlaceholderPage({ title, phase }: { title: string; phase: string }) {
  return <div className="mx-auto w-full max-w-7xl"><p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">{phase}</p><h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{title}</h1><div className="mt-7 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center"><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-500"><Construction className="h-5 w-5" /></span><h2 className="mt-4 text-sm font-black text-slate-800">Écran planifié</h2><p className="mx-auto mt-1 max-w-lg text-sm text-slate-500">Cette entrée est intégrée à la navigation. Ses données et actions seront livrées dans {phase.toLowerCase()} après application des migrations métier correspondantes.</p></div></div>;
}
