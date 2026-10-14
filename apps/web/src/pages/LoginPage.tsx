import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { BadgeCheck, Building2, Eye, EyeOff, FileWarning, Landmark, LoaderCircle, LockKeyhole, LogIn, ShieldCheck } from 'lucide-react';
import { ProgadBrand } from '@/components/ProgadBrand';
import { useApp } from '@/lib/AppContext';

export function LoginPage() {
  const { login } = useApp();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (result) setError(result);
    else navigate('/dashboard', { replace: true });
  };

  return (
    <main className="min-h-[100dvh] bg-[#f3f6fb] lg:grid lg:grid-cols-[1.08fr_0.92fr]">
      <section className="relative hidden min-h-[100dvh] overflow-hidden bg-[#07152f] px-12 py-10 text-white lg:flex lg:flex-col lg:justify-between xl:px-20 xl:py-14">
        <div aria-hidden="true" className="absolute -left-40 -top-52 h-[620px] w-[620px] rounded-full bg-blue-500/20 blur-3xl" />
        <div aria-hidden="true" className="absolute -bottom-64 right-[-120px] h-[680px] w-[680px] rounded-full bg-cyan-400/10 blur-3xl" />
        <div aria-hidden="true" className="absolute inset-0 opacity-[0.055] [background-image:linear-gradient(rgba(255,255,255,.7)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.7)_1px,transparent_1px)] [background-size:56px_56px]" />

        <div className="relative flex items-center justify-between">
          <ProgadBrand tone="dark" className="w-52 xl:w-60" />
          <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[11px] font-semibold text-blue-100">ERP INTERNE</span>
        </div>

        <div className="relative max-w-2xl py-10">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-300/15 bg-white/[0.07] px-3 py-1.5 text-xs font-semibold text-blue-100 backdrop-blur-sm">
            <Building2 className="h-4 w-4 text-cyan-300" /> Réservé aux collaborateurs GADIMAT
          </div>
          <h1 className="max-w-2xl text-4xl font-black leading-[1.08] tracking-[-0.035em] xl:text-[3.4rem]">
            Votre activité métier,<br />pilotée depuis un seul ERP.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-slate-300">
            PROGAD centralise les opérations financières et le recouvrement de GADIMAT dans un environnement privé, sécurisé et adapté à chaque rôle.
          </p>

          <div className="mt-10 grid max-w-2xl grid-cols-3 gap-3">
            <BusinessArea icon={Landmark} label="Chèques & effets" detail="Trésorerie" />
            <BusinessArea icon={FileWarning} label="Impayés" detail="Recouvrement" />
            <BusinessArea icon={ShieldCheck} label="Accès maîtrisés" detail="Administration" />
          </div>
        </div>

        <div className="relative flex items-center justify-between border-t border-white/10 pt-5 text-xs text-slate-400">
          <span>Usage strictement professionnel</span>
          <span>GADIMAT S.A. · {new Date().getFullYear()}</span>
        </div>
      </section>

      <section className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden px-5 py-8 sm:px-10 lg:px-14">
        <div aria-hidden="true" className="absolute -right-24 -top-28 h-96 w-96 rounded-full bg-blue-200/45 blur-3xl" />
        <div aria-hidden="true" className="absolute -bottom-32 left-8 h-80 w-80 rounded-full bg-indigo-100/60 blur-3xl" />
        <div className="relative w-full max-w-md">
          <div className="mb-8 flex items-center justify-between lg:hidden">
            <ProgadBrand className="w-48" />
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-bold tracking-wide text-slate-500">ERP INTERNE</span>
          </div>

          <div className="rounded-[2rem] border border-white bg-white/90 p-6 shadow-[0_30px_90px_-35px_rgba(15,23,42,.35)] backdrop-blur-xl sm:p-9">
            <div className="mb-8 flex items-start justify-between gap-4">
              <div>
                <span className="mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-700 ring-1 ring-blue-100"><LockKeyhole className="h-5 w-5" /></span>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">Accès collaborateur</p>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Connexion à PROGAD</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">Utilisez votre compte professionnel GADIMAT.</p>
              </div>
              <BadgeCheck className="mt-1 h-5 w-5 shrink-0 text-emerald-500" aria-label="Portail vérifié" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="email" className="mb-2 block text-xs font-bold text-slate-700">Adresse e-mail professionnelle</label>
                <input id="email" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="prenom.nom@gadimat.ma" required className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10" />
              </div>

              <div>
                <label htmlFor="password" className="mb-2 block text-xs font-bold text-slate-700">Mot de passe</label>
                <div className="relative">
                  <input id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Votre mot de passe" required className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10" />
                  <button type="button" onClick={() => setShowPassword((visible) => !visible)} className="absolute right-1.5 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>}

              <button type="submit" disabled={loading} aria-busy={loading || undefined} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/20 disabled:cursor-wait disabled:bg-blue-300">
                {loading ? <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
                {loading ? 'Connexion en cours…' : 'Accéder à PROGAD'}
              </button>
            </form>

            <div className="mt-7 flex items-center justify-center gap-2 border-t border-slate-100 pt-6 text-xs text-slate-400"><ShieldCheck className="h-4 w-4" /> Connexion sécurisée · accès selon votre rôle</div>
          </div>
          <p className="mt-5 text-center text-[11px] leading-5 text-slate-400">Portail privé. Tout accès non autorisé est interdit.</p>
        </div>
      </section>
    </main>
  );
}

function BusinessArea({ icon: Icon, label, detail }: { icon: typeof Landmark; label: string; detail: string }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[0.065] p-4 backdrop-blur-sm"><span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-400/15 text-cyan-200"><Icon className="h-4 w-4" /></span><p className="mt-4 text-sm font-bold text-white">{label}</p><p className="mt-1 text-[11px] text-slate-400">{detail}</p></div>;
}
