import { Card, CardContent } from '@/components/ui/card';
import { firstRelated, type Related } from '@/lib/relations';
import { supabase } from '@/lib/supabase';
import { AlertTriangle, BarChart3, CarFront, ListFilter, TrendingUp, Users, Wallet } from 'lucide-react';
import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';

export const dynamic = 'force-dynamic';

type WorkOrder = {
  id: string;
  status: string;
  customers: Related<{ name: string }>;
  vehicles: Related<{ plate: string; make_model: string; type: string }>;
};

async function getDashboardData() {
  const [orders, inventory, customers, transactions] = await Promise.all([
    supabase.from('work_orders').select('id, status, customers(name), vehicles(plate, make_model, type)').order('created_at', { ascending: false }).limit(6),
    supabase.from('inventory_items').select('id, stock, min_stock'),
    supabase.from('customers').select('id', { count: 'exact', head: true }),
    supabase.from('financial_transactions').select('type, amount'),
  ]);

  const txRows = transactions.data ?? [];
  const orderRows = orders.data ?? [];
  const inventoryRows = inventory.data ?? [];
  const statusCounts = ['Recibido', 'Diagnostico', 'En reparacion', 'Listo'].map((status) => ({
    status,
    count: orderRows.filter((order) => order.status === status).length,
  }));

  return {
    recentOrders: (orders.data ?? []) as unknown as WorkOrder[],
    activeJobs: orderRows.filter((order) => !['Entregado', 'Listo'].includes(order.status)).length,
    lowStock: inventoryRows.filter((item) => Number(item.stock) <= Number(item.min_stock)).length,
    stockUnits: inventoryRows.reduce((sum, item) => sum + Number(item.stock), 0),
    statusCounts,
    customersCount: customers.count ?? 0,
    income: txRows.filter((tx) => tx.type === 'INCOME').reduce((sum, tx) => sum + Number(tx.amount), 0),
    expense: txRows.filter((tx) => tx.type === 'EXPENSE').reduce((sum, tx) => sum + Number(tx.amount), 0),
    error: orders.error?.message ?? inventory.error?.message ?? customers.error?.message ?? transactions.error?.message ?? null,
  };
}

export default async function DashboardPage() {
  const { recentOrders, activeJobs, lowStock, stockUnits, statusCounts, customersCount, income, expense, error } = await getDashboardData();
  const balance = income - expense;
  const maxStatus = Math.max(...statusCounts.map((item) => item.count), 1);
  const incomePct = income + expense > 0 ? Math.round((income / (income + expense)) * 100) : 0;

  return (
    <div className="space-y-6 p-4 md:p-8">
      <div className="overflow-hidden rounded-lg bg-slate-950 p-6 text-white shadow-xl">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-blue-300">Centro Especializado</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight">Dashboard operativo</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">Indicadores reales del taller conectados a Supabase: ordenes, inventario, clientes y caja.</p>
            <div className="mt-6 grid grid-cols-3 gap-3">
              <Metric label="Ordenes activas" value={String(activeJobs)} />
              <Metric label="Unidades stock" value={String(stockUnits)} />
              <Metric label="Balance" value={`$${balance.toFixed(0)}`} />
            </div>
          </div>
          <div className="flex items-center justify-center">
            <div className="relative h-44 w-44 rounded-full bg-[conic-gradient(#22c55e_var(--income),#ef4444_0)] p-5 shadow-2xl shadow-blue-950 [transform:rotateX(12deg)]" style={{ '--income': `${incomePct}%` } as CSSProperties}>
              <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-slate-950 text-center">
                <BarChart3 className="mb-2 h-7 w-7 text-blue-300" />
                <p className="text-3xl font-black">{incomePct}%</p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Ingresos</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4 text-sm text-amber-800">{error}</CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DashboardCard icon={<CarFront className="h-4 w-4 text-blue-600" />} label="Trabajos activos" value={String(activeJobs)} href="/board" link="Ver tablero" />
        <DashboardCard icon={<Users className="h-4 w-4 text-blue-600" />} label="Clientes" value={String(customersCount)} href="/customers" link="Ver directorio" />
        <DashboardCard icon={<Wallet className="h-4 w-4 text-green-600" />} label="Balance" value={`$${balance.toFixed(2)}`} foot="Ingresos - gastos" />
        <DashboardCard icon={<AlertTriangle className="h-4 w-4 text-red-500" />} label="Stock critico" value={String(lowStock)} href="/inventory" link="Revisar inventario" danger />
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="flex flex-col md:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 p-4">
            <h2 className="flex items-center gap-2 font-bold text-slate-700">
              <ListFilter className="h-4 w-4 text-blue-600" />
              Trabajos recientes
            </h2>
            <Link href="/board" className="text-xs font-bold text-blue-600 hover:underline">Ver todos</Link>
          </div>
          <CardContent className="flex-1 bg-slate-50/50 p-4">
            <div className="space-y-3">
              {recentOrders.map((order) => {
                const customer = firstRelated(order.customers);
                const vehicle = firstRelated(order.vehicles);

                return (
                  <div key={order.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                    <div>
                      <div className="mb-1 flex items-center gap-2">
                        <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-blue-700">
                          {vehicle?.plate ?? 'Sin placa'}
                        </span>
                        <p className="text-sm font-bold text-slate-800">{vehicle?.make_model ?? 'Vehiculo'}</p>
                      </div>
                      <p className="text-xs font-medium text-slate-500">{customer?.name ?? 'Cliente'}</p>
                    </div>
                    <span className="rounded bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-700">{order.status}</span>
                  </div>
                );
              })}
              {recentOrders.length === 0 && (
                <div className="rounded-lg border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                  Todavia no hay trabajos. Empieza desde recepcion.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardContent className="flex flex-1 flex-col justify-center p-6">
            <div className="space-y-3">
              {statusCounts.map((item) => (
                <div key={item.status}>
                  <div className="mb-1 flex items-center justify-between text-xs font-bold text-slate-600">
                    <span>{item.status}</span>
                    <span>{item.count}</span>
                  </div>
                  <div className="h-3 rounded-full bg-slate-100">
                    <div className="h-3 rounded-full bg-blue-600 shadow-sm" style={{ width: `${(item.count / maxStatus) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <Link href="/reception" className="mt-6 rounded bg-slate-800 py-2 text-center text-xs font-bold text-white transition-colors hover:bg-slate-700">
              Nueva recepcion
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/10 p-4">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-black">{value}</p>
    </div>
  );
}

function DashboardCard({ icon, label, value, href, link, foot, danger = false }: { icon: ReactNode; label: string; value: string; href?: string; link?: string; foot?: string; danger?: boolean }) {
  return (
    <Card className={danger ? 'border-l-4 border-l-red-500 transition-shadow hover:shadow-md' : 'transition-shadow hover:shadow-md'}>
      <CardContent className="flex h-full flex-col justify-between space-y-1 p-5">
        <p className="mb-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500">
          {label}
          {icon}
        </p>
        <p className={danger ? 'text-2xl font-bold text-red-600' : 'text-2xl font-bold text-slate-800'}>{value}</p>
        {href && link && <Link href={href} className="mt-2 text-xs font-medium text-blue-500 hover:underline">{link}</Link>}
        {foot && (
          <p className="mt-2 flex items-center gap-1 text-xs font-medium text-green-500">
            <TrendingUp className="h-3 w-3" />
            {foot}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
