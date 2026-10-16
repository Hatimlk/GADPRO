import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { BadgeCheck, Eye, EyeOff, LoaderCircle, LockKeyhole, LogIn, ShieldCheck } from 'lucide-react';
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
    <main className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-[#f3f6fb] px-5 py-8 sm:px-10">
      <div aria-hidden="true" className="absolute -right-24 -top-28 h-96 w-96 rounded-full bg-blue-200/45 blur-3xl" />
      <div aria-hidden="true" className="absolute -bottom-32 left-8 h-80 w-80 rounded-full bg-indigo-100/60 blur-3xl" />
      <div className="relative w-full max-w-md">
        <ProgadBrand className="mx-auto mb-8 w-52 sm:w-56" />

        <div className="rounded-[2rem] border border-white bg-white/90 p-6 shadow-[0_30px_90px_-35px_rgba(15,23,42,.35)] backdrop-blur-xl sm:p-9">
          <div className="mb-8 flex items-start justify-between gap-4">
            <div>
              <span className="mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-700 ring-1 ring-blue-100"><LockKeyhole className="h-5 w-5" /></span>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">Accès collaborateur</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Connexion à PROGAD</h2>
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
    </main>
  );
}
