import { Card, CardContent } from '@/components/ui/card';
import { firstRelated, type Related } from '@/lib/relations';
import { supabase } from '@/lib/supabase';
import { Download, FileSpreadsheet, TrendingUp } from 'lucide-react';

export const dynamic = 'force-dynamic';

function money(value: number | null | undefined) {
  return `COP $${Number(value ?? 0).toLocaleString('es-CO')}`;
}

function csvHref(rows: string[][]) {
  return `data:text/csv;charset=utf-8,${encodeURIComponent(rows.map((row) => row.join(',')).join('\n'))}`;
}

type LaborRow = {
  id: string;
  hours_spent: number;
  billable_hours: number;
  hourly_cost?: number | null;
  labor_cost?: number | null;
  commission_amount: number;
  mechanics: Related<{ name: string }>;
  work_orders: Related<{ id: string; total_amount: number; labor_revenue?: number | null; parts_revenue?: number | null; parts_cost?: number | null; labor_cost?: number | null; commission_cost?: number | null; customers: Related<{ name: string }> }>;
};

function laborCost(row: LaborRow) {
  return Number(row.labor_cost ?? 0) || Number(row.hours_spent ?? 0) * Number(row.hourly_cost ?? 0);
}

export default async function ReportsPage() {
  const [payrollResult, laborResult, financialResult] = await Promise.all([
    supabase.from('payroll_items').select('id, net_pay, gross_pay, commissions, regular_hours, overtime_hours, productivity, mechanics(name), payroll_runs(period_start, period_end)').order('created_at', { ascending: false }).limit(100),
    supabase.from('work_order_labor').select('id, hours_spent, billable_hours, hourly_cost, commission_amount, mechanics(name), work_orders(id, total_amount, labor_revenue, parts_revenue, parts_cost, labor_cost, commission_cost, customers(name))').order('created_at', { ascending: false }).limit(100),
    supabase.from('financial_transactions').select('id, type, amount, category, source, created_at').order('created_at', { ascending: false }).limit(100),
  ]);

  const payroll = payrollResult.data ?? [];
  const labor = (laborResult.data ?? []) as unknown as LaborRow[];
  const financial = financialResult.data ?? [];
  const laborHours = labor.reduce((sum, row) => sum + Number(row.hours_spent), 0);
  const billableHours = labor.reduce((sum, row) => sum + Number(row.billable_hours), 0);
  const commissions = labor.reduce((sum, row) => sum + Number(row.commission_amount), 0);
  const payrollCost = payroll.reduce((sum, row) => sum + Number(row.net_pay), 0);
  const productivity = laborHours > 0 ? (billableHours / laborHours) * 100 : 0;
  const financialIncome = financial.filter((tx) => tx.type === 'INCOME').reduce((sum, tx) => sum + Number(tx.amount), 0);
  const financialExpense = financial.filter((tx) => tx.type === 'EXPENSE').reduce((sum, tx) => sum + Number(tx.amount), 0);
  const netProfit = financialIncome - financialExpense;
  const expenseByCategory = Array.from(
    financial
      .filter((tx) => tx.type === 'EXPENSE')
      .reduce((map, tx) => {
        const category = tx.category ?? 'Sin categoria';
        map.set(category, (map.get(category) ?? 0) + Number(tx.amount));
        return map;
      }, new Map<string, number>()),
  ).sort((a, b) => b[1] - a[1]);
  const error = payrollResult.error?.message ?? laborResult.error?.message ?? financialResult.error?.message ?? null;

  const reportCards = [
    {
      title: 'Nomina por periodo',
      description: 'Empleado, periodo, devengado, comisiones, horas y neto pagado.',
      file: 'reporte-nomina.csv',
      rows: [
        ['Empleado', 'Periodo', 'Devengado', 'Comisiones', 'Horas', 'Extras', 'Productividad', 'Neto'],
        ...payroll.map((item: any) => {
          const mechanic = firstRelated(item.mechanics);
          const run = firstRelated(item.payroll_runs);
          return [mechanic?.name ?? '', `${run?.period_start ?? ''} a ${run?.period_end ?? ''}`, item.gross_pay, item.commissions, item.regular_hours, item.overtime_hours, item.productivity, item.net_pay].map(String);
        }),
      ],
    },
    {
      title: 'Productividad por mecanico',
      description: 'Horas trabajadas, horas facturables, comisiones y costo laboral.',
      file: 'reporte-productividad.csv',
      rows: [
        ['Mecanico', 'Horas trabajadas', 'Horas facturables', 'Costo laboral', 'Comision'],
        ...labor.map((row) => {
          const mechanic = firstRelated(row.mechanics);
          return [mechanic?.name ?? '', row.hours_spent, row.billable_hours, laborCost(row), row.commission_amount].map(String);
        }),
      ],
    },
    {
      title: 'Rentabilidad por orden',
      description: 'Ingresos, costos, utilidad bruta y margen por orden de trabajo.',
      file: 'reporte-rentabilidad-orden.csv',
      rows: [
        ['Orden', 'Cliente', 'Ingresos', 'Costos', 'Utilidad', 'Margen'],
        ...labor.map((row) => {
          const order = firstRelated(row.work_orders);
          const customer = firstRelated(order?.customers ?? null);
          const revenue = Number(order?.total_amount || 0) || Number(order?.labor_revenue || 0) + Number(order?.parts_revenue || 0);
          const cost = Number(order?.parts_cost || 0) + Number(order?.labor_cost || 0) + Number(order?.commission_cost || 0);
          const profit = revenue - cost;
          const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
          return [order?.id ?? '', customer?.name ?? '', revenue, cost, profit, `${margin.toFixed(1)}%`].map(String);
        }),
      ],
    },
    {
      title: 'Movimientos financieros',
      description: 'Fuente unica de ingresos, gastos, nomina, POS y tesoreria.',
      file: 'reporte-financiero.csv',
      rows: [
        ['Fecha', 'Tipo', 'Categoria', 'Fuente', 'Valor'],
        ...financial.map((tx) => [tx.created_at, tx.type, tx.category ?? '', tx.source ?? '', tx.amount].map(String)),
      ],
    },
    {
      title: 'Gastos por categoria',
      description: 'Detalle de egresos operativos para controlar utilidad real.',
      file: 'reporte-gastos-categoria.csv',
      rows: [
        ['Categoria', 'Valor'],
        ...expenseByCategory.map(([category, amount]) => [category, String(amount)]),
      ],
    },
    {
      title: 'Estado de resultados',
      description: 'Ingresos menos gastos registrados en la fuente financiera unica.',
      file: 'estado-resultados.csv',
      rows: [
        ['Concepto', 'Valor'],
        ['Ingresos', String(financialIncome)],
        ['Gastos', String(financialExpense)],
        ['Utilidad neta', String(netProfit)],
      ],
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
      <div>
        <p className="text-sm font-bold uppercase tracking-wider text-blue-600">Reportes gerenciales</p>
        <h1 className="text-3xl font-black text-slate-900">Datos reales exportables</h1>
        <p className="text-slate-500">Los informes salen de nomina, productividad, ordenes, tesoreria y contabilidad. Sin doble digitacion.</p>
      </div>

      {error && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4 text-sm text-amber-800">
            Ejecuta en Supabase <span className="font-mono">06_hr_payroll_treasury.sql</span> y <span className="font-mono">07_hr_payroll_policies.sql</span>. Detalle: {error}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        {[
          ['Costo nomina', money(payrollCost)],
          ['Ingresos', money(financialIncome)],
          ['Gastos', money(financialExpense)],
          ['Utilidad neta', money(netProfit)],
          ['Horas trabajadas', laborHours.toFixed(1)],
          ['Horas facturables', billableHours.toFixed(1)],
          ['Productividad', `${productivity.toFixed(1)}%`],
        ].map(([label, value]) => (
          <Card key={label} className="border-0 shadow-sm">
            <CardContent className="p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>
              <p className="mt-1 text-2xl font-black text-slate-900">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {reportCards.map((report) => (
          <Card key={report.file} className="border-0 shadow-sm">
            <CardContent className="flex items-center justify-between gap-4 p-6">
              <div className="flex gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <FileSpreadsheet className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="font-black text-slate-900">{report.title}</h2>
                  <p className="mt-1 text-sm text-slate-500">{report.description}</p>
                </div>
              </div>
              <a href={csvHref(report.rows)} download={report.file} className="flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-bold text-white hover:bg-slate-800">
                <Download className="h-4 w-4" />
                CSV
              </a>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-slate-900"><TrendingUp className="h-5 w-5 text-blue-600" /> Vista rapida de rentabilidad</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">Mecanico</th>
                  <th className="px-3 py-2">Horas</th>
                  <th className="px-3 py-2">Facturables</th>
                  <th className="px-3 py-2">Costo laboral</th>
                  <th className="px-3 py-2">Comisiones</th>
                </tr>
              </thead>
              <tbody>
                {labor.slice(0, 12).map((row) => {
                  const mechanic = firstRelated(row.mechanics);
                  return (
                    <tr key={row.id} className="border-t border-slate-100">
                      <td className="px-3 py-2 font-bold text-slate-800">{mechanic?.name ?? 'Mecanico'}</td>
                      <td className="px-3 py-2">{Number(row.hours_spent).toFixed(1)}</td>
                      <td className="px-3 py-2">{Number(row.billable_hours).toFixed(1)}</td>
                      <td className="px-3 py-2">{money(laborCost(row))}</td>
                      <td className="px-3 py-2">{money(row.commission_amount)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
