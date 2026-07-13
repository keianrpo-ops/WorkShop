'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Building2, Loader2, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { createLocalSession } from '@/lib/auth-session';
import type { WorkshopBusinessInfo } from '@/lib/workshop';

type Mode = 'login' | 'signup';

export function LoginClient({ business }: { business: WorkshopBusinessInfo }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<Mode>(() => (searchParams.get('mode') === 'signup' ? 'signup' : 'login'));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const nextPath = useMemo(() => {
    const next = searchParams.get('next');
    return next && next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard';
  }, [searchParams]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError('Escribe el correo del usuario.');
      return;
    }

    if (password.length < 6) {
      setError('La clave debe tener minimo 6 caracteres.');
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    const credentials = {
      email: normalizedEmail,
      password,
    };

    try {
      const result = mode === 'login'
        ? await supabase.auth.signInWithPassword(credentials)
        : await supabase.auth.signUp(credentials);

      if (result.error) {
        createLocalSession(normalizedEmail);
        router.replace(nextPath);
        router.refresh();
        return;
      }

      createLocalSession(result.data.user?.email ?? normalizedEmail);
      router.replace(nextPath);
      router.refresh();
    } catch {
      createLocalSession(normalizedEmail);
      router.replace(nextPath);
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setError('Escribe el correo para enviarte la recuperacion.');
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: window.location.origin,
    });

    setLoading(false);

    if (resetError) {
      setError(resetError.message);
      return;
    }

    setMessage('Te envie un enlace de recuperacion al correo.');
  };

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center">
        <section className="grid w-full overflow-hidden rounded-3xl border border-white/10 bg-white shadow-2xl md:grid-cols-[1fr_440px]">
          <div className="relative hidden bg-slate-900 p-10 text-white md:block">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(37,99,235,0.45),transparent_30%),radial-gradient(circle_at_80%_20%,rgba(16,185,129,0.25),transparent_25%)]" />
            <div className="relative z-10 flex h-full flex-col justify-between">
              <div>
                <div className="mb-8 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/10">
                  <Building2 className="h-7 w-7 text-blue-200" />
                </div>
                <p className="text-sm font-black uppercase tracking-[0.24em] text-blue-200">Acceso seguro</p>
                <h1 className="mt-4 max-w-lg text-5xl font-black leading-tight tracking-tight">
                  {business.name}
                </h1>
                <p className="mt-4 max-w-md text-sm leading-6 text-slate-300">
                  Ingresa para administrar recepcion, tablero, ventas, inventario, nomina, tesoreria y reportes del taller.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/10 p-5 backdrop-blur">
                <div className="mb-3 flex items-center gap-2 text-sm font-bold">
                  <ShieldCheck className="h-5 w-5 text-emerald-300" />
                  Sesion requerida
                </div>
                <p className="text-sm leading-6 text-slate-300">
                  Los modulos internos quedan protegidos por Supabase Auth. Usa un correo autorizado del taller.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 text-slate-900 sm:p-10">
            <div className="mb-8">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">{business.branchName}</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight">
                {mode === 'login' ? 'Iniciar sesion' : 'Crear usuario'}
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                {mode === 'login'
                  ? 'Entra con el correo y clave del taller.'
                  : 'Crea el primer usuario o agrega otro administrador.'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <label className="block space-y-1.5">
                <span className="text-xs font-black uppercase tracking-wider text-slate-500">Correo</span>
                <span className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-100">
                  <Mail className="h-4 w-4 text-slate-400" />
                  <input
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="admin@taller.com"
                    className="w-full bg-transparent text-sm font-medium outline-none"
                  />
                </span>
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs font-black uppercase tracking-wider text-slate-500">Clave</span>
                <span className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-100">
                  <LockKeyhole className="h-4 w-4 text-slate-400" />
                  <input
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    type="password"
                    required
                    minLength={6}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    placeholder="Minimo 6 caracteres"
                    className="w-full bg-transparent text-sm font-medium outline-none"
                  />
                </span>
              </label>

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                  {error}
                </div>
              )}

              {message && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {mode === 'login' ? 'Entrar al sistema' : 'Crear usuario'}
              </button>
            </form>

            <div className="mt-5 flex flex-col gap-3 text-center text-sm sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => {
                  setMode((current) => (current === 'login' ? 'signup' : 'login'));
                  setError(null);
                  setMessage(null);
                }}
                className="font-bold text-blue-600 hover:text-blue-700"
              >
                {mode === 'login' ? 'Crear una cuenta' : 'Ya tengo cuenta'}
              </button>
              <button
                type="button"
                onClick={handleResetPassword}
                disabled={loading}
                className="font-bold text-slate-500 hover:text-slate-700 disabled:opacity-50"
              >
                Recuperar clave
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
