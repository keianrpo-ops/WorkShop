'use client';

import { ChangeEvent, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BadgeDollarSign,
  BarChart3,
  Building2,
  CarFront,
  FileText,
  KanbanSquare,
  Landmark,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  MessageCircle,
  ImagePlus,
  Package,
  ReceiptText,
  Search,
  Settings,
  ShoppingCart,
  UserRound,
  Users,
  Wallet,
  Wrench,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WorkshopBusinessInfo } from '@/lib/workshop';
import { supabase } from '@/lib/supabase';
import { clearLocalSession, getLocalSessionEmail } from '@/lib/auth-session';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Punto de Venta', href: '/pos', icon: ShoppingCart },
  { name: 'Recepcion', href: '/reception', icon: CarFront },
  { name: 'Tablero', href: '/board', icon: KanbanSquare },
  { name: 'Cotizaciones', href: '/quotations', icon: FileText },
  { name: 'Clientes', href: '/customers', icon: Users },
  { name: 'Personal', href: '/team', icon: Users },
  { name: 'RRHH', href: '/hr', icon: UserRound },
  { name: 'Nomina', href: '/payroll', icon: BadgeDollarSign },
  { name: 'Inventario', href: '/inventory', icon: Package },
  { name: 'Tesoreria', href: '/treasury', icon: Landmark },
  { name: 'Gastos', href: '/expenses', icon: ReceiptText },
  { name: 'Contabilidad', href: '/accounting', icon: Wallet },
  { name: 'Reportes', href: '/reports', icon: BarChart3 },
];

const settingsNav = [
  { name: 'Negocio', href: '/settings/business', icon: Building2 },
  { name: 'Portal Mecanico', href: '/mechanic', icon: Wrench },
  { name: 'Portal Empleado', href: '/employee-portal', icon: UserRound },
  { name: 'Integraciones', href: '/settings/integrations', icon: Settings },
  { name: 'Planes', href: '/settings/plans', icon: Settings },
];

const BRAND_LOGO_KEY = 'workshop-brand-logo-v2';
const BRAND_BACKGROUND_KEY = 'workshop-brand-background-v2';

export function AppShell({ children, business }: { children: React.ReactNode; business: WorkshopBusinessInfo }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [brandLogo, setBrandLogo] = useState<string | null>(null);
  const [brandBackground, setBrandBackground] = useState<string | null>(null);
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const backgroundInputRef = useRef<HTMLInputElement>(null);
  const pathname = usePathname();
  const router = useRouter();
  const isDocumentRoute = pathname.startsWith('/documents');
  const isAuthRoute = pathname.startsWith('/login');
  const isPublicRoute = pathname === '/';

  const currentNav = [...navigation, ...settingsNav].find((item) => item.href === pathname);
  const pageTitle = currentNav ? currentNav.name : 'Dashboard Global';

  useEffect(() => {
    const timeout = window.setTimeout(() => setNavigatingTo(null), 0);
    return () => window.clearTimeout(timeout);
  }, [pathname]);

  useEffect(() => {
    if (isDocumentRoute || isAuthRoute || isPublicRoute) {
      return;
    }

    let mounted = true;
    const localEmail = getLocalSessionEmail();

    if (localEmail) {
      window.queueMicrotask(() => {
        if (!mounted) return;
        setSessionEmail(localEmail);
        setAuthChecked(true);
      });
    }

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      const email = data.session?.user.email ?? getLocalSessionEmail();
      setSessionEmail(email);
      setAuthChecked(true);

      if (!email) {
        router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      const email = session?.user.email ?? getLocalSessionEmail();
      setSessionEmail(email);
      setAuthChecked(true);

      if (!email) {
        router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [isAuthRoute, isDocumentRoute, isPublicRoute, pathname, router]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setBrandLogo(localStorage.getItem(BRAND_LOGO_KEY));
      setBrandBackground(localStorage.getItem(BRAND_BACKGROUND_KEY));
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  const handleNavigation = (href: string) => {
    if (href !== pathname) setNavigatingTo(href);
  };

  const imageToDataUrl = (file: File, maxSize: number, quality: number) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));
      reader.onload = () => {
        const image = new Image();
        image.onerror = () => reject(new Error('No se pudo cargar la imagen.'));
        image.onload = () => {
          const ratio = Math.min(maxSize / image.width, maxSize / image.height, 1);
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(Math.round(image.width * ratio), 1);
          canvas.height = Math.max(Math.round(image.height * ratio), 1);
          const context = canvas.getContext('2d');
          if (!context) {
            reject(new Error('No se pudo procesar la imagen.'));
            return;
          }

          context.drawImage(image, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        image.src = String(reader.result);
      };
      reader.readAsDataURL(file);
    });

  const saveImage = async (event: ChangeEvent<HTMLInputElement>, key: string, setter: (value: string) => void) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const isBackground = key.includes('background');
      const value = await imageToDataUrl(file, isBackground ? 1400 : 520, isBackground ? 0.72 : 0.82);
      localStorage.setItem(key, value);
      setter(value);
    } finally {
      event.target.value = '';
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    clearLocalSession();
    setSessionEmail(null);
    router.replace('/login');
  };

  if (isDocumentRoute || isAuthRoute || isPublicRoute) {
    return <>{children}</>;
  }

  if (!authChecked || !sessionEmail) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 shadow-2xl">
          <Loader2 className="h-5 w-5 animate-spin text-blue-300" />
          <span className="text-sm font-bold">Verificando sesion...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-100 font-sans text-slate-800">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/80 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 transform flex-col border-r border-slate-800 bg-slate-900 text-slate-300 transition-transform duration-200 ease-in-out lg:static lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div
          className="relative overflow-hidden border-b border-slate-800 bg-slate-950 p-6"
        >
          {brandBackground && (
            <>
              <span className="absolute inset-0 scale-110 bg-cover bg-center opacity-70 blur-md" style={{ backgroundImage: `url(${brandBackground})` }} />
              <span className="absolute inset-0 bg-contain bg-center bg-no-repeat opacity-75" style={{ backgroundImage: `url(${brandBackground})` }} />
              <span className="absolute inset-0 bg-slate-950/70" />
            </>
          )}
          <input
            ref={logoInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => saveImage(event, BRAND_LOGO_KEY, setBrandLogo)}
          />
          <input
            ref={backgroundInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => saveImage(event, BRAND_BACKGROUND_KEY, setBrandBackground)}
          />

          <div className="relative z-10 flex flex-col items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => logoInputRef.current?.click()}
              className="group relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-slate-700 bg-slate-800 shadow-inner transition-colors hover:border-blue-500"
              title="Cambiar logo"
            >
              {brandLogo ? (
                <span className="absolute inset-0 bg-contain bg-center bg-no-repeat" style={{ backgroundImage: `url(${brandLogo})` }} />
              ) : (
                <svg className="h-10 w-10 text-slate-400 transition-colors group-hover:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              <span className="absolute inset-0 flex items-center justify-center bg-slate-950/70 text-center text-[10px] font-bold uppercase tracking-widest text-white opacity-0 transition-opacity group-hover:opacity-100">
                Cambiar<br />Logo
              </span>
            </button>

            <div className="text-center">
              <span className="block text-xl font-extrabold tracking-tight text-white">{business.name}</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{business.branchName}</span>
            </div>

            <button
              type="button"
              onClick={() => backgroundInputRef.current?.click()}
              title="Cambiar fondo"
              className="absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-slate-950/45 text-white/80 backdrop-blur transition hover:bg-white/20 hover:text-white"
            >
              <ImagePlus className="h-4 w-4" />
            </button>
          </div>

          <button
            className="absolute right-4 top-4 z-20 p-2 text-slate-400 hover:text-white lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-2 overflow-y-auto px-4 py-6">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => handleNavigation(item.href)}
                className={cn(
                  'flex items-center gap-3 rounded p-2 transition-colors',
                  isActive ? 'bg-blue-600/10 font-medium text-blue-400' : 'text-slate-300 hover:bg-slate-800',
                )}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.name}</span>
                {navigatingTo === item.href && <span className="ml-auto h-2 w-2 animate-pulse rounded-full bg-blue-400" />}
              </Link>
            );
          })}

          <div className="mt-4 border-t border-slate-800 pt-4">
            <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">Configuracion</p>
            {settingsNav.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => handleNavigation(item.href)}
                  className={cn(
                    'flex items-center gap-3 rounded p-2 transition-colors',
                    isActive ? 'bg-blue-600/10 font-medium text-blue-400' : 'text-slate-300 hover:bg-slate-800',
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.name}</span>
                  {navigatingTo === item.href && <span className="ml-auto h-2 w-2 animate-pulse rounded-full bg-blue-400" />}
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="mt-auto border-t border-slate-800 p-4">
          <div className="rounded-lg bg-slate-800 p-3 text-xs">
            <p className="mb-1 text-slate-400">Plan Actual</p>
            <p className="mb-2 font-bold text-blue-400">PRO - COP $200.000/mes</p>
            <Link href="/settings/plans" className="block w-full rounded bg-slate-700 py-1 text-center font-medium text-white transition-colors hover:bg-slate-600">
              Gestionar Suscripcion
            </Link>
          </div>
        </div>
      </aside>

      <main className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 flex-shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 md:px-8">
          <div className="flex items-center gap-4">
            <button className="-ml-2 p-2 text-slate-500 hover:text-slate-700 lg:hidden" onClick={() => setSidebarOpen(true)}>
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="hidden text-lg font-semibold sm:block">{pageTitle}</h1>
            <span className="hidden rounded border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs text-slate-500 md:block">{business.branchName}</span>
          </div>

          <div className="flex items-center gap-6">
            <div className="relative hidden md:block">
              <input type="text" placeholder="Buscar placa o cliente..." className="w-64 rounded-full border-none bg-slate-100 px-4 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
              <Search className="absolute right-3 top-2 h-4 w-4 text-slate-400" />
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="max-w-44 truncate text-sm font-medium">{sessionEmail}</p>
                <p className="text-[10px] font-bold uppercase text-slate-500">Admin Workshop</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-slate-200 font-bold uppercase text-slate-600 shadow-sm">
                {sessionEmail.slice(0, 2)}
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                title="Cerrar sesion"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>

        <div className="relative flex-1 overflow-y-auto bg-slate-100 focus:outline-none">
          {navigatingTo && (
            <div className="pointer-events-none absolute left-0 right-0 top-0 z-40 h-1 overflow-hidden bg-blue-100">
              <div className="h-full w-1/2 animate-[pulse_0.8s_ease-in-out_infinite] bg-blue-600" />
            </div>
          )}
          {children}

          <a href="https://wa.me/573244490660" target="_blank" className="group fixed bottom-6 right-6 z-50 rounded-full bg-green-500 p-4 text-white shadow-lg shadow-green-500/30 transition-all duration-300 hover:-translate-y-1 hover:bg-green-600 hover:shadow-xl hover:shadow-green-500/40">
            <MessageCircle className="h-6 w-6" />
            <span className="pointer-events-none absolute right-full top-1/2 mr-4 -translate-y-1/2 whitespace-nowrap rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-bold text-white opacity-0 transition-opacity group-hover:opacity-100">
              Soporte WhatsApp
            </span>
          </a>
        </div>
      </main>
    </div>
  );
}
