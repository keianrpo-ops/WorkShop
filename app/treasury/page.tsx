import { Card, CardContent } from '@/components/ui/card';
import { createTreasuryTransaction } from '@/lib/actions';
import { firstRelated, type Related } from '@/lib/relations';
import { supabase } from '@/lib/supabase';
import { ArrowDownCircle, ArrowUpCircle, Landmark, WalletCards, type LucideIcon } from 'lucide-react';

export const dynamic = 'force-dynamic';

function money(value: number | null | undefined) {
  return `COP $${Number(value ?? 0).toLocaleString('es-CO')}`;
}

type TreasuryTransaction = {
  id: string;
  type: string;
  amount: number;
  category: string | null;
  description: string | null;
  reference: string | null;
  source: string | null;
  created_at: string;
  treasury_accounts: Related<{ name: string; account_type: string }>;
};

export default async function TreasuryPage() {
  const [accountsResult, transactionsResult] = await Promise.all([
    supabase.from('treasury_accounts').select('id, name, account_type, balance, is_active').order('name'),
    supabase
      .from('treasury_transactions')
      .select('id, type, amount, category, description, reference, source, created_at, treasury_accounts(name, account_type)')
      .order('created_at', { ascending: false })
      .limit(50),
  ]);

  const accounts = accountsResult.data ?? [];
  const transactions = (transactionsResult.data ?? []) as unknown as TreasuryTransaction[];
  const income = transactions.filter((tx) => tx.type === 'INCOME').reduce((sum, tx) => sum + Number(tx.amount), 0);
  const expenses = transactions.filter((tx) => tx.type === 'EXPENSE').reduce((sum, tx) => sum + Number(tx.amount), 0);
  const available = income - expenses;
  const error = accountsResult.error?.message ?? transactionsResult.error?.message ?? null;
  const stats: Array<[string, string, LucideIcon, string]> = [
    ['Entradas registradas', money(income), ArrowUpCircle, 'text-emerald-600'],
    ['Salidas registradas', money(expenses), ArrowDownCircle, 'text-red-600'],
    ['Flujo neto', money(available), WalletCards, 'text-blue-600'],
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
      <div>
        <p className="text-sm font-bold uppercase tracking-wider text-blue-600">Tesoreria</p>
        <h1 className="text-3xl font-black text-slate-900">Caja, bancos y flujo de dinero</h1>
        <p className="text-slate-500">Toda venta, pago de nomina y movimiento manual queda conectado con contabilidad.</p>
      </div>

      {error && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4 text-sm text-amber-800">
            Ejecuta en Supabase <span className="font-mono">06_hr_payroll_treasury.sql</span> y <span className="font-mono">07_hr_payroll_policies.sql</span>. Detalle: {error}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {stats.map(([label, value, Icon, color]) => (
          <Card key={String(label)} className="border-0 shadow-sm">
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>
                <p className="mt-1 text-2xl font-black text-slate-900">{String(value)}</p>
              </div>
              <Icon className={`h-8 w-8 ${color}`} />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <h2 className="text-lg font-black text-slate-900">Nuevo movimiento</h2>
            <p className="mb-5 text-sm text-slate-500">Usa esto para caja menor, bancos, pagos o ingresos que no nacen en otro modulo.</p>
            <form action={createTreasuryTransaction} className="grid gap-3">
              <select name="accountId" required className="rounded border border-slate-300 px-3 py-2 text-sm">
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>{account.name}</option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-3">
                <select name="type" className="rounded border border-slate-300 px-3 py-2 text-sm">
                  <option value="INCOME">Entrada</option>
                  <option value="EXPENSE">Salida</option>
                </select>
                <input name="amount" required type="number" min="0" step="1000" placeholder="Valor" className="rounded border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <input name="category" placeholder="Categoria" className="rounded border border-slate-300 px-3 py-2 text-sm" />
              <input name="reference" placeholder="Referencia" className="rounded border border-slate-300 px-3 py-2 text-sm" />
              <textarea name="description" required placeholder="Descripcion" className="min-h-24 rounded border border-slate-300 px-3 py-2 text-sm" />
              <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700">Guardar movimiento</button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
            <div className="border-b border-slate-100 p-5">
              <h2 className="text-lg font-black text-slate-900">Movimientos recientes</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {transactions.map((tx) => {
                const account = firstRelated(tx.treasury_accounts);
                const isIncome = tx.type === 'INCOME';
                return (
                  <div key={tx.id} className="flex items-center justify-between gap-4 p-4">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${isIncome ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                        {isIncome ? <ArrowUpCircle className="h-5 w-5" /> : <ArrowDownCircle className="h-5 w-5" />}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{tx.description ?? tx.category ?? 'Movimiento'}</p>
                        <p className="text-xs text-slate-500">{account?.name ?? 'Cuenta'} · {tx.reference ?? tx.source ?? 'Sin referencia'}</p>
                      </div>
                    </div>
                    <p className={`font-black ${isIncome ? 'text-emerald-700' : 'text-red-700'}`}>{isIncome ? '+' : '-'}{money(tx.amount)}</p>
                  </div>
                );
              })}
              {transactions.length === 0 && <div className="p-8 text-center text-slate-500">No hay movimientos de tesoreria.</div>}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-5">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-slate-900"><Landmark className="h-5 w-5 text-blue-600" /> Cuentas</h2>
          <div className="grid gap-3 md:grid-cols-3">
            {accounts.map((account) => (
              <div key={account.id} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <p className="font-black text-slate-900">{account.name}</p>
                <p className="text-sm text-slate-500">{account.account_type}</p>
                <p className="mt-2 text-lg font-black text-blue-700">{money(account.balance)}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
