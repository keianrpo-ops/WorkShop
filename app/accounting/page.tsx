import { Card, CardContent } from '@/components/ui/card';
import { createFinancialTransaction } from '@/lib/actions';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { ArrowDownRight, ArrowUpRight, Calendar, History, Plus, Receipt, Wallet } from 'lucide-react';
import type { CSSProperties } from 'react';

export const dynamic = 'force-dynamic';

type Transaction = {
  id: string;
  type: 'INCOME' | 'EXPENSE';
  amount: number;
  category: string;
  description: string;
  reference: string | null;
  source: string;
  created_at: string;
};

type Sale = {
  id: string;
  folio: string;
  payment_method: string;
  total: number;
  cost_total: number;
  created_at: string;
};

async function getAccountingData() {
  const [txResult, salesResult] = await Promise.all([
    supabase.from('financial_transactions').select('*').order('created_at', { ascending: false }),
    supabase.from('sales').select('id, folio, payment_method, total, cost_total, created_at').order('created_at', { ascending: false }).limit(20),
  ]);

  return {
    transactions: (txResult.data ?? []) as Transaction[],
    sales: (salesResult.data ?? []) as Sale[],
    error: txResult.error?.message ?? salesResult.error?.message ?? null,
  };
}

export default async function AccountingPage() {
  const { transactions, sales, error } = await getAccountingData();
  const totalIncome = transactions.filter((tx) => tx.type === 'INCOME').reduce((sum, tx) => sum + Number(tx.amount), 0);
  const totalExpense = transactions.filter((tx) => tx.type === 'EXPENSE').reduce((sum, tx) => sum + Number(tx.amount), 0);
  const balance = totalIncome - totalExpense;
  const grossProfit = sales.reduce((sum, sale) => sum + Number(sale.total) - Number(sale.cost_total), 0);
  const totalSales = sales.reduce((sum, sale) => sum + Number(sale.total), 0);
  const margin = totalSales > 0 ? Math.round((grossProfit / totalSales) * 100) : 0;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Contabilidad</h1>
          <p className="mt-1 text-slate-500">Ingresos, gastos, ventas POS y balance real del taller.</p>
        </div>
      </div>

      {error && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4 text-sm text-amber-800">{error}</CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        <Card className="bg-white shadow-sm">
          <CardContent className="p-6">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">Balance Neto</p>
            <p className="text-3xl font-black text-slate-900">${balance.toFixed(2)}</p>
            <Wallet className="mt-4 h-5 w-5 text-slate-400" />
          </CardContent>
        </Card>
        <Card className="bg-white shadow-sm">
          <CardContent className="p-6">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-green-500">Ingresos</p>
            <p className="text-3xl font-black text-slate-800">${totalIncome.toFixed(2)}</p>
            <ArrowUpRight className="mt-4 h-5 w-5 text-green-500" />
          </CardContent>
        </Card>
        <Card className="bg-white shadow-sm">
          <CardContent className="p-6">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-red-500">Gastos</p>
            <p className="text-3xl font-black text-slate-800">${totalExpense.toFixed(2)}</p>
            <ArrowDownRight className="mt-4 h-5 w-5 text-red-500" />
          </CardContent>
        </Card>
        <Card className="bg-white shadow-sm">
          <CardContent className="p-6">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-blue-500">Utilidad POS</p>
            <p className="text-3xl font-black text-slate-800">${grossProfit.toFixed(2)}</p>
            <Receipt className="mt-4 h-5 w-5 text-blue-500" />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-slate-900">Radiografia financiera</h2>
                <p className="text-sm text-slate-500">Resumen visual de caja, egresos y margen POS.</p>
              </div>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">Margen {margin}%</span>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {[
                ['Ingresos', totalIncome, 'bg-green-500'],
                ['Gastos', totalExpense, 'bg-red-500'],
                ['Utilidad POS', grossProfit, 'bg-blue-600'],
              ].map(([label, value, color]) => {
                const max = Math.max(totalIncome, totalExpense, grossProfit, 1);
                const width = (Number(value) / max) * 100;
                return (
                  <div key={String(label)} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>
                    <p className="mt-2 text-2xl font-black text-slate-900">${Number(value).toFixed(0)}</p>
                    <div className="mt-4 h-28 rounded-xl bg-white p-2 shadow-inner">
                      <div className="flex h-full items-end">
                        <div className={`w-full rounded-lg ${color}`} style={{ height: `${Math.max(width, 4)}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden bg-slate-950 text-white">
          <CardContent className="flex h-full flex-col items-center justify-center p-6 text-center">
            <div className="relative h-40 w-40 rounded-full bg-[conic-gradient(#2563eb_var(--margin),#1e293b_0)] p-4 shadow-2xl [transform:rotateX(14deg)]" style={{ '--margin': `${margin}%` } as CSSProperties}>
              <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-slate-950">
                <p className="text-4xl font-black">{margin}%</p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Margen POS</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <form action={createFinancialTransaction} className="grid gap-3 md:grid-cols-6">
            <select name="type" className="rounded border border-slate-300 px-3 py-2 text-sm">
              <option value="EXPENSE">Gasto</option>
              <option value="INCOME">Ingreso</option>
            </select>
            <input name="description" required placeholder="Descripcion" className="rounded border border-slate-300 px-3 py-2 text-sm md:col-span-2" />
            <input name="category" required placeholder="Categoria" className="rounded border border-slate-300 px-3 py-2 text-sm" />
            <input name="amount" required type="number" min="0" step="0.01" placeholder="Monto" className="rounded border border-slate-300 px-3 py-2 text-sm" />
            <button className="flex items-center justify-center gap-2 rounded bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800">
              <Plus className="h-4 w-4" />
              Guardar
            </button>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="border-b border-slate-100 bg-slate-50/50 p-4">
            <h3 className="flex items-center gap-2 font-bold text-slate-800">
              <History className="h-4 w-4 text-blue-600" />
              Libro Mayor
            </h3>
          </div>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              {transactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between gap-4 p-4">
                  <div className="flex items-center gap-4">
                    <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', tx.type === 'INCOME' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500')}>
                      {tx.type === 'INCOME' ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownRight className="h-5 w-5" />}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">
                        {tx.description} {tx.reference && <span className="ml-1 font-normal text-slate-400">#{tx.reference}</span>}
                      </p>
                      <div className="mt-1 flex items-center gap-3">
                        <span className="flex items-center gap-1 text-xs font-medium text-slate-500">
                          <Calendar className="h-3 w-3" />
                          {new Date(tx.created_at).toLocaleDateString('es-ES')}
                        </span>
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">{tx.category}</span>
                      </div>
                    </div>
                  </div>
                  <p className={cn('text-lg font-black', tx.type === 'INCOME' ? 'text-green-600' : 'text-slate-800')}>
                    {tx.type === 'INCOME' ? '+' : '-'}${Number(tx.amount).toFixed(2)}
                  </p>
                </div>
              ))}
              {transactions.length === 0 && <div className="p-8 text-center text-sm text-slate-500">No hay movimientos contables registrados.</div>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <div className="border-b border-slate-100 bg-slate-50/50 p-4">
            <h3 className="font-bold text-slate-800">Ventas POS</h3>
          </div>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              {sales.map((sale) => (
                <div key={sale.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-mono text-sm font-bold text-slate-800">#{sale.folio}</p>
                    <p className="font-black text-blue-600">${Number(sale.total).toFixed(2)}</p>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{sale.payment_method} · {new Date(sale.created_at).toLocaleString('es-ES')}</p>
                </div>
              ))}
              {sales.length === 0 && <div className="p-8 text-center text-sm text-slate-500">No hay ventas POS.</div>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
