import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Boxes, Eye, EyeOff, FileWarning, Landmark, LoaderCircle, LockKeyhole, LogIn, ShieldCheck } from 'lucide-react';
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
    <main className="relative min-h-screen overflow-hidden bg-slate-950 lg:grid lg:grid-cols-[1.08fr_0.92fr]">
      <section className="relative hidden min-h-screen overflow-hidden bg-[#0b1730] px-12 py-10 text-white lg:flex lg:flex-col lg:justify-between xl:px-20 xl:py-14">
        <div className="pointer-events-none absolute -left-32 -top-40 h-[520px] w-[520px] rounded-full bg-blue-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-56 right-[-120px] h-[620px] w-[620px] rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(rgba(255,255,255,.5)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.5)_1px,transparent_1px)] [background-size:48px_48px]" />

        <div className="relative flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-blue-500 font-black shadow-lg shadow-blue-950/30">G</span>
          <div>
            <p className="text-xl font-extrabold tracking-[0.18em]">GADIMAT</p>
            <p className="text-xs text-blue-200/70">Plateforme de gestion interne</p>
          </div>
        </div>

        <div className="relative max-w-2xl py-12">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-300/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-blue-100 backdrop-blur-sm">
            <ShieldCheck className="h-4 w-4 text-cyan-300" /> Un compte unique, des accès maîtrisés
          </div>
          <h1 className="max-w-xl text-4xl font-black leading-[1.12] tracking-tight xl:text-5xl">
            Tous vos outils métier dans un même espace.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-slate-300">
            Accédez uniquement aux modules et aux données autorisés pour votre profil.
          </p>

          <div className="mt-10 grid max-w-xl grid-cols-2 gap-3">
            <Module icon={Landmark} label="Chèques et effets" />
            <Module icon={FileWarning} label="Suivi des impayés" />
            <Module icon={ShieldCheck} label="Administration centralisée" />
            <Module icon={Boxes} label="Une plateforme évolutive" />
          </div>
        </div>

        <p className="relative text-xs text-slate-400">Accès réservé aux collaborateurs autorisés de GADIMAT.</p>
      </section>

      <section className="relative flex min-h-screen items-center justify-center bg-slate-50 px-5 py-10 sm:px-10 lg:px-14">
        <div className="pointer-events-none absolute right-0 top-0 h-72 w-72 rounded-full bg-blue-100/60 blur-3xl" />
        <div className="relative w-full max-w-md">
          <div className="mb-9 flex items-center gap-3 lg:hidden">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-600 font-black text-white">G</span>
            <div><p className="font-extrabold tracking-[0.16em] text-slate-950">GADIMAT</p><p className="text-xs text-slate-500">Plateforme de gestion interne</p></div>
          </div>

          <div className="rounded-3xl border border-slate-200/80 bg-white p-7 shadow-[0_24px_70px_-32px_rgba(15,23,42,.3)] sm:p-10">
            <div className="mb-8">
              <span className="mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-700 ring-1 ring-blue-100"><LockKeyhole className="h-5 w-5" /></span>
              <h2 className="text-2xl font-black tracking-tight text-slate-950">Bienvenue</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">Connectez-vous à votre espace GADIMAT.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="email" className="mb-2 block text-xs font-bold text-slate-700">Adresse e-mail</label>
                <input id="email" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="prenom.nom@gadimat.com" required className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10" />
              </div>

              <div>
                <label htmlFor="password" className="mb-2 block text-xs font-bold text-slate-700">Mot de passe</label>
                <div className="relative">
                  <input id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Votre mot de passe" required className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-4 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10" />
                  <button type="button" onClick={() => setShowPassword((visible) => !visible)} className="absolute right-1.5 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>}

              <button type="submit" disabled={loading} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/20 disabled:cursor-wait disabled:opacity-70">
                {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
                {loading ? 'Connexion en cours…' : 'Se connecter'}
              </button>
            </form>

            <div className="mt-7 flex items-center justify-center gap-2 text-xs text-slate-400"><ShieldCheck className="h-4 w-4" /> Connexion sécurisée et accès contrôlé</div>
          </div>
        </div>
      </section>
    </main>
  );
}

function Module({ icon: Icon, label }: { icon: typeof Landmark; label: string }) {
  return <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-sm"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-blue-400/15 text-cyan-200"><Icon className="h-4 w-4" /></span><span className="text-sm font-semibold text-slate-100">{label}</span></div>;
}
