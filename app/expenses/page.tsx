import { Card, CardContent } from '@/components/ui/card';
import { createOperatingExpense } from '@/lib/actions';
import { isMissingColumn, supabase } from '@/lib/supabase';
import { ArrowDownCircle, Download, FileText, Receipt, TrendingUp, WalletCards } from 'lucide-react';

export const dynamic = 'force-dynamic';

type FinancialTransaction = {
  id: string;
  type: 'INCOME' | 'EXPENSE';
  amount: number;
  category: string;
  description: string;
  reference?: string | null;
  source?: string | null;
  created_at: string;
  transaction_date?: string | null;
  vendor?: string | null;
  responsible?: string | null;
  payment_method?: string | null;
  approval_status?: string | null;
  receipt_url?: string | null;
  notes?: string | null;
};

function money(value: number | null | undefined) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));
}

function csvHref(rows: string[][]) {
  return `data:text/csv;charset=utf-8,${encodeURIComponent(rows.map((row) => row.join(',')).join('\n'))}`;
}

const expenseCategories = [
  'Arriendo',
  'Servicios publicos',
  'Nomina',
  'Repuestos internos',
  'Herramientas',
  'Insumos de taller',
  'Publicidad',
  'Transporte',
  'Impuestos',
  'Mantenimiento locativo',
  'Software',
  'Gastos bancarios',
  'Caja menor',
  'Otros',
];

async function getExpensesData() {
  const start = new Date();
  start.setDate(1);
  const monthStart = start.toISOString().slice(0, 10);

  let financialResult: Awaited<ReturnType<typeof supabase.from>> | any = await supabase
    .from('financial_transactions')
    .select('id, type, amount, category, description, reference, source, created_at, transaction_date, vendor, responsible, payment_method, approval_status, receipt_url, notes')
    .order('created_at', { ascending: false })
    .limit(250);

  if (
    isMissingColumn(financialResult.error, 'transaction_date') ||
    isMissingColumn(financialResult.error, 'vendor') ||
    isMissingColumn(financialResult.error, 'receipt_url')
  ) {
    financialResult = await supabase
      .from('financial_transactions')
      .select('id, type, amount, category, description, reference, source, created_at')
      .order('created_at', { ascending: false })
      .limit(250);
  }

  const accountsResult = await supabase
    .from('treasury_accounts')
    .select('id, name, account_type, balance')
    .eq('is_active', true)
    .order('name');

  const transactions = (financialResult.data ?? []) as FinancialTransaction[];
  const expenses = transactions.filter((tx) => tx.type === 'EXPENSE');
  const income = transactions.filter((tx) => tx.type === 'INCOME');
  const monthRows = transactions.filter((tx) => (tx.transaction_date ?? tx.created_at.slice(0, 10)) >= monthStart);
  const monthIncome = monthRows.filter((tx) => tx.type === 'INCOME').reduce((sum, tx) => sum + Number(tx.amount), 0);
  const monthExpenses = monthRows.filter((tx) => tx.type === 'EXPENSE').reduce((sum, tx) => sum + Number(tx.amount), 0);
  const totalIncome = income.reduce((sum, tx) => sum + Number(tx.amount), 0);
  const totalExpenses = expenses.reduce((sum, tx) => sum + Number(tx.amount), 0);

  return {
    accounts: accountsResult.data ?? [],
    transactions,
    expenses,
    monthIncome,
    monthExpenses,
    monthProfit: monthIncome - monthExpenses,
    totalIncome,
    totalExpenses,
    netProfit: totalIncome - totalExpenses,
    error: financialResult.error?.message ?? accountsResult.error?.message ?? null,
  };
}

export default async function ExpensesPage() {
  const { accounts, expenses, monthIncome, monthExpenses, monthProfit, totalIncome, totalExpenses, netProfit, error } = await getExpensesData();
  const byCategory = expenseCategories
    .map((category) => ({
      category,
      amount: expenses.filter((tx) => tx.category === category).reduce((sum, tx) => sum + Number(tx.amount), 0),
    }))
    .filter((row) => row.amount > 0)
    .sort((a, b) => b.amount - a.amount);
  const maxCategory = Math.max(...byCategory.map((row) => row.amount), 1);
  const netMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;

  const csvRows = [
    ['Fecha', 'Categoria', 'Descripcion', 'Proveedor', 'Responsable', 'Metodo', 'Referencia', 'Valor', 'Estado'],
    ...expenses.map((tx) => [
      tx.transaction_date ?? tx.created_at.slice(0, 10),
      tx.category,
      tx.description,
      tx.vendor ?? '',
      tx.responsible ?? '',
      tx.payment_method ?? '',
      tx.reference ?? '',
      String(tx.amount),
      tx.approval_status ?? '',
    ]),
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-wider text-blue-600">Gastos y rentabilidad</p>
          <h1 className="text-3xl font-black text-slate-900">Control de gastos operativos</h1>
          <p className="text-slate-500">Registra arriendo, servicios, caja menor, insumos y cualquier egreso para medir utilidad real del negocio.</p>
        </div>
        <a href={csvHref(csvRows)} download="gastos-operativos.csv" className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800">
          <Download className="h-4 w-4" />
          Exportar CSV
        </a>
      </div>

      {error && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4 text-sm text-amber-800">
            Para detalles completos ejecuta <span className="font-mono">supabase/23_operating_expenses.sql</span>. Detalle: {error}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        {[
          ['Ingresos mes', money(monthIncome), TrendingUp, 'text-emerald-600'],
          ['Gastos mes', money(monthExpenses), ArrowDownCircle, 'text-red-600'],
          ['Utilidad mes', money(monthProfit), WalletCards, monthProfit >= 0 ? 'text-blue-600' : 'text-red-600'],
          ['Margen neto', `${netMargin.toFixed(1)}%`, Receipt, netMargin >= 0 ? 'text-emerald-600' : 'text-red-600'],
        ].map(([label, value, Icon, color]) => (
          <Card key={String(label)} className="border-0 shadow-sm">
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{String(label)}</p>
                <p className="mt-1 text-2xl font-black text-slate-900">{String(value)}</p>
              </div>
              <Icon className={`h-7 w-7 ${String(color)}`} />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <h2 className="text-lg font-black text-slate-900">Registrar gasto</h2>
            <p className="mb-5 text-sm text-slate-500">Todo gasto queda en contabilidad y, si seleccionas cuenta, tambien en tesoreria.</p>
            <form action={createOperatingExpense} className="grid gap-3" encType="multipart/form-data">
              <div className="grid grid-cols-2 gap-3">
                <input name="transactionDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className="rounded border border-slate-300 px-3 py-2 text-sm" />
                <input name="amount" required type="number" min="0" step="1000" placeholder="Valor del gasto" className="rounded border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <select name="category" defaultValue="Caja menor" className="rounded border border-slate-300 px-3 py-2 text-sm">
                {expenseCategories.map((category) => <option key={category}>{category}</option>)}
              </select>
              <input name="description" required placeholder="Descripcion del gasto" className="rounded border border-slate-300 px-3 py-2 text-sm" />
              <div className="grid grid-cols-2 gap-3">
                <input name="vendor" placeholder="Proveedor" className="rounded border border-slate-300 px-3 py-2 text-sm" />
                <input name="responsible" placeholder="Responsable" className="rounded border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <select name="paymentMethod" className="rounded border border-slate-300 px-3 py-2 text-sm">
                  <option>Caja</option>
                  <option>Banco</option>
                  <option>Transferencia</option>
                  <option>Tarjeta</option>
                  <option>Credito proveedor</option>
                </select>
                <select name="approvalStatus" defaultValue="Aprobado" className="rounded border border-slate-300 px-3 py-2 text-sm">
                  <option>Aprobado</option>
                  <option>Pendiente</option>
                  <option>Rechazado</option>
                </select>
              </div>
              <select name="accountId" className="rounded border border-slate-300 px-3 py-2 text-sm">
                <option value="">No afectar caja/banco</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>{account.name} - {account.account_type}</option>
                ))}
              </select>
              <input name="reference" placeholder="Factura, recibo o referencia" className="rounded border border-slate-300 px-3 py-2 text-sm" />
              <input name="receipt" type="file" accept="image/*,application/pdf" className="rounded border border-slate-300 px-3 py-2 text-sm" />
              <textarea name="notes" placeholder="Notas internas, aprobacion, observaciones" className="min-h-20 rounded border border-slate-300 px-3 py-2 text-sm" />
              <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700">Guardar gasto</button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <h2 className="mb-4 text-lg font-black text-slate-900">Gasto por categoria</h2>
            <div className="space-y-3">
              {byCategory.map((row) => (
                <div key={row.category}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-bold text-slate-700">{row.category}</span>
                    <span className="font-black text-slate-900">{money(row.amount)}</span>
                  </div>
                  <div className="h-3 rounded-full bg-slate-100">
                    <div className="h-3 rounded-full bg-red-500" style={{ width: `${Math.max((row.amount / maxCategory) * 100, 4)}%` }} />
                  </div>
                </div>
              ))}
              {byCategory.length === 0 && <p className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">Aun no hay gastos registrados.</p>}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <div className="flex items-center justify-between border-b border-slate-100 p-5">
            <div>
              <h2 className="text-lg font-black text-slate-900">Libro de gastos</h2>
              <p className="text-sm text-slate-500">Historial detallado para saber en que se va el dinero.</p>
            </div>
            <FileText className="h-5 w-5 text-blue-600" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Categoria</th>
                  <th className="px-4 py-3">Descripcion</th>
                  <th className="px-4 py-3">Proveedor</th>
                  <th className="px-4 py-3">Responsable</th>
                  <th className="px-4 py-3">Metodo</th>
                  <th className="px-4 py-3">Valor</th>
                  <th className="px-4 py-3">Soporte</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((tx) => (
                  <tr key={tx.id} className="border-t border-slate-100">
                    <td className="px-4 py-3">{tx.transaction_date ?? tx.created_at.slice(0, 10)}</td>
                    <td className="px-4 py-3 font-bold text-slate-800">{tx.category}</td>
                    <td className="px-4 py-3">{tx.description}</td>
                    <td className="px-4 py-3">{tx.vendor ?? '-'}</td>
                    <td className="px-4 py-3">{tx.responsible ?? '-'}</td>
                    <td className="px-4 py-3">{tx.payment_method ?? '-'}</td>
                    <td className="px-4 py-3 font-black text-red-700">{money(tx.amount)}</td>
                    <td className="px-4 py-3">
                      {tx.receipt_url ? <a href={tx.receipt_url} target="_blank" className="font-bold text-blue-600 hover:underline">Ver</a> : '-'}
                    </td>
                  </tr>
                ))}
                {expenses.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-slate-500">No hay gastos registrados.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
