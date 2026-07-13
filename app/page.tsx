import Link from 'next/link';
import {
  ArrowRight,
  BadgeDollarSign,
  BarChart3,
  CalendarCheck,
  CarFront,
  CheckCircle2,
  ClipboardList,
  FileText,
  Landmark,
  MessageCircle,
  Package,
  ShieldCheck,
  Users,
  Wrench,
} from 'lucide-react';
import { WORKSHOP_PLANS, formatCop } from '@/lib/plans';

const heroImage = 'https://images.unsplash.com/photo-1487754180451-c456f719a1fc?auto=format&fit=crop&w=2200&q=85';

const modules = [
  { icon: CarFront, title: 'Recepcion y diagnostico', text: 'Ingreso del cliente, datos del vehiculo, fotos, autorizacion y trazabilidad por placa.' },
  { icon: Wrench, title: 'Tablero del taller', text: 'Estados claros para diagnostico, aprobacion, reparacion, entrega y reasignacion de mecanicos.' },
  { icon: Package, title: 'Inventario y POS', text: 'Repuestos con costo, precio de venta, utilidad bruta, imagenes y salida automatica por venta.' },
  { icon: BadgeDollarSign, title: 'Nomina y productividad', text: 'Personal por hora, salario o comision, prestamos, anticipos, horas y costos laborales.' },
  { icon: Landmark, title: 'Tesoreria y gastos', text: 'Entradas, salidas, caja menor, bancos, proveedores y gastos operativos del negocio.' },
  { icon: BarChart3, title: 'Reportes gerenciales', text: 'Rentabilidad por orden, cliente, mecanico, inventario, nomina y flujo de caja.' },
];

const steps = [
  'Crea la cuenta del taller',
  'Configura negocio, sucursal y facturacion',
  'Registra personal, inventario y clientes',
  'Recibe el primer vehiculo y mide la rentabilidad',
];

export default function LandingPage() {
  return (
    <main className="bg-white text-slate-950">
      <section className="relative min-h-[92vh] overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${heroImage})` }} />
        <div className="absolute inset-0 bg-slate-950/68" />
        <div className="absolute inset-x-0 top-0 z-20 border-b border-white/10 bg-slate-950/35 backdrop-blur">
          <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
            <Link href="/" className="flex items-center gap-3 text-white">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
                <Wrench className="h-5 w-5" />
              </span>
              <span>
                <span className="block text-lg font-black leading-none">Workshop</span>
                <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-blue-200">ERP Automotriz</span>
              </span>
            </Link>
            <div className="hidden items-center gap-6 text-sm font-bold text-slate-200 md:flex">
              <a href="#modulos" className="hover:text-white">Modulos</a>
              <a href="#flujo" className="hover:text-white">Flujo</a>
              <a href="#planes" className="hover:text-white">Planes</a>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/login" className="rounded-lg border border-white/20 px-4 py-2 text-sm font-black text-white transition hover:bg-white/10">
                Iniciar sesion
              </Link>
              <Link href="/login?mode=signup&next=%2Fdashboard" className="hidden rounded-lg bg-blue-600 px-4 py-2 text-sm font-black text-white shadow-lg shadow-blue-950/30 transition hover:bg-blue-500 sm:inline-flex">
                Crear taller
              </Link>
            </div>
          </nav>
        </div>

        <div className="relative z-10 mx-auto flex min-h-[92vh] max-w-7xl flex-col justify-center px-5 pb-16 pt-28">
          <div className="max-w-3xl text-white">
            <p className="mb-4 inline-flex rounded-lg border border-white/20 bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-[0.22em] text-blue-100 backdrop-blur">
              Talleres mecanicos en Colombia
            </p>
            <h1 className="text-5xl font-black leading-[0.95] tracking-tight sm:text-6xl lg:text-7xl">
              Workshop
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-100 sm:text-xl">
              Organiza recepcion, diagnosticos, inventario, ventas, mecanicos, nomina, gastos y rentabilidad del taller desde una sola plataforma.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/login?mode=signup&next=%2Fdashboard" className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-black text-white shadow-xl shadow-blue-950/30 transition hover:bg-blue-500">
                Crear mi taller
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a href="https://wa.me/573244490660?text=Hola,%20quiero%20una%20demo%20de%20Workshop" target="_blank" className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/25 bg-white/10 px-6 py-3 text-sm font-black text-white backdrop-blur transition hover:bg-white/15">
                Solicitar demo
                <MessageCircle className="h-4 w-4" />
              </a>
            </div>
          </div>

          <div className="mt-12 grid max-w-4xl gap-3 sm:grid-cols-3">
            <HeroMetric label="Ordenes trazables" value="100%" />
            <HeroMetric label="Inventario conectado" value="POS" />
            <HeroMetric label="Control financiero" value="ERP" />
          </div>
        </div>
      </section>

      <section id="modulos" className="border-b border-slate-200 bg-slate-50 px-5 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-600">Sistema completo</p>
            <h2 className="mt-3 text-4xl font-black tracking-tight text-slate-950">Un taller no se administra con hojas sueltas.</h2>
            <p className="mt-4 text-lg leading-8 text-slate-600">
              Cada movimiento operativo debe impactar inventario, caja, contabilidad, productividad y reportes. Workshop conecta esos datos para que el dueno vea el negocio completo.
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {modules.map((item) => (
              <article key={item.title} className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                <item.icon className="h-6 w-6 text-blue-600" />
                <h3 className="mt-5 text-lg font-black text-slate-950">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="flujo" className="px-5 py-20">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-600">Inicio real</p>
            <h2 className="mt-3 text-4xl font-black tracking-tight">De afiliacion a operacion.</h2>
            <p className="mt-4 text-lg leading-8 text-slate-600">
              El cliente no entra a una pantalla vacia: entra a un proceso guiado para configurar su taller y empezar a recibir vehiculos.
            </p>
            <div className="mt-8 space-y-3">
              {steps.map((step, index) => (
                <div key={step} className="flex items-center gap-3 rounded-lg border border-slate-200 p-4">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-950 text-sm font-black text-white">{index + 1}</span>
                  <span className="font-bold text-slate-800">{step}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-950 p-4 shadow-2xl">
            <div className="rounded-lg bg-white p-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-blue-600">Dashboard gerencial</p>
                  <h3 className="text-xl font-black">Rentabilidad del taller</h3>
                </div>
                <ShieldCheck className="h-6 w-6 text-emerald-600" />
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <MiniStat label="Ventas mes" value="$18.4M" />
                <MiniStat label="Ordenes abiertas" value="14" />
                <MiniStat label="Utilidad" value="32%" />
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-[1fr_0.8fr]">
                <div className="rounded-lg border border-slate-200 p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <span className="text-sm font-black">Ordenes por estado</span>
                    <ClipboardList className="h-4 w-4 text-blue-600" />
                  </div>
                  {['Recibido', 'Diagnostico', 'En reparacion', 'Listo'].map((label, index) => (
                    <div key={label} className="mb-3">
                      <div className="mb-1 flex justify-between text-xs font-bold text-slate-500">
                        <span>{label}</span>
                        <span>{[8, 5, 11, 3][index]}</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100">
                        <div className="h-2 rounded-full bg-blue-600" style={{ width: `${[72, 44, 90, 28][index]}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="rounded-lg border border-slate-200 p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <span className="text-sm font-black">Documentos</span>
                    <FileText className="h-4 w-4 text-blue-600" />
                  </div>
                  {['Factura POS', 'Cotizacion', 'Recibo nomina', 'Liquidacion'].map((label) => (
                    <div key={label} className="mb-2 flex items-center gap-2 rounded bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      {label}
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800">
                <CalendarCheck className="h-4 w-4" />
                Agenda, WhatsApp, mecanicos y finanzas en el mismo flujo.
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="planes" className="bg-slate-950 px-5 py-20 text-white">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1fr_0.8fr]">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-300">Pruebas reales</p>
            <h2 className="mt-3 text-4xl font-black tracking-tight">Listo para mostrarlo a un cliente y empezar a validar.</h2>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-300">
              Puedes entrar al sistema, crear un taller de prueba, cargar datos reales y demostrar como se controla la operacion diaria.
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/10 p-6">
            <p className="text-sm font-bold text-slate-300">Plan inicial</p>
            <p className="mt-2 text-4xl font-black">{formatCop(WORKSHOP_PLANS[1].priceCop)}<span className="text-base font-bold text-slate-400"> / mes</span></p>
            <p className="mt-3 text-sm leading-6 text-slate-300">Plan Pro para talleres que quieren empezar con recepcion, inventario, ventas, personal, nomina y reportes.</p>
            <Link href="/login?mode=signup&next=%2Fsettings%2Fplans" className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-black text-white transition hover:bg-blue-500">
              Crear cuenta y pagar
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function HeroMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/15 bg-white/10 p-4 text-white backdrop-blur">
      <p className="text-2xl font-black">{value}</p>
      <p className="mt-1 text-xs font-bold uppercase tracking-wider text-slate-200">{label}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-black text-slate-950">{value}</p>
    </div>
  );
}
