import { Card, CardContent } from '@/components/ui/card';
import { firstRelated, type Related } from '@/lib/relations';
import { supabase } from '@/lib/supabase';
import { Briefcase, CalendarDays, Clock, ReceiptText, TrendingUp, type LucideIcon } from 'lucide-react';

export const dynamic = 'force-dynamic';

function money(value: number | null | undefined) {
  return `COP $${Number(value ?? 0).toLocaleString('es-CO')}`;
}

type Mechanic = {
  id: string;
  name: string;
  role: string | null;
  specialty: string | null;
  work_orders: Array<{
    id: string;
    status: string;
    hours_spent: number;
    estimated_hours: number;
    customers: Related<{ name: string }>;
    vehicles: Related<{ plate: string; make_model: string }>;
  }>;
  attendance_records: Array<{ work_date: string; hours_worked: number; overtime_hours: number; status: string }>;
  work_order_labor: Array<{ hours_spent: number; billable_hours: number; commission_amount: number }>;
  payroll_items: Array<{
    id: string;
    net_pay: number;
    gross_pay: number;
    commissions: number;
    advances: number;
    loan_deductions: number;
    productivity: number;
    payroll_runs: Related<{ period_start: string; period_end: string; period_type: string; status: string }>;
  }>;
  employee_advances: Array<{ amount: number; status: string; reason: string | null; advance_date: string }>;
  employee_loans: Array<{ principal: number; balance: number; installments: number; status: string }>;
};

export default async function EmployeePortalPage() {
  const result = await supabase
    .from('mechanics')
    .select('id, name, role, specialty, work_orders(id, status, hours_spent, estimated_hours, customers(name), vehicles(plate, make_model)), attendance_records(work_date, hours_worked, overtime_hours, status), work_order_labor(hours_spent, billable_hours, commission_amount), payroll_items(id, net_pay, gross_pay, commissions, advances, loan_deductions, productivity, payroll_runs(period_start, period_end, period_type, status)), employee_advances(amount, status, reason, advance_date), employee_loans(principal, balance, installments, status)')
    .eq('is_active', true)
    .order('name');

  const employees = (result.data ?? []) as unknown as Mechanic[];
  const error = result.error?.message ?? null;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
      <div>
        <p className="text-sm font-bold uppercase tracking-wider text-blue-600">Portal del empleado</p>
        <h1 className="text-3xl font-black text-slate-900">Trabajo, horas y pagos</h1>
        <p className="text-slate-500">Cada empleado puede consultar asignaciones, productividad, comisiones y desprendibles de nomina.</p>
      </div>

      {error && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4 text-sm text-amber-800">
            Ejecuta en Supabase <span className="font-mono">06_hr_payroll_treasury.sql</span> y <span className="font-mono">07_hr_payroll_policies.sql</span>. Detalle: {error}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6">
        {employees.map((employee) => {
          const attendanceHours = (employee.attendance_records ?? []).reduce((sum, item) => sum + Number(item.hours_worked), 0);
          const overtime = (employee.attendance_records ?? []).reduce((sum, item) => sum + Number(item.overtime_hours), 0);
          const labor = employee.work_order_labor ?? [];
          const billable = labor.reduce((sum, item) => sum + Number(item.billable_hours), 0);
          const spent = labor.reduce((sum, item) => sum + Number(item.hours_spent), 0);
          const productivity = attendanceHours > 0 ? (billable / attendanceHours) * 100 : spent > 0 ? (billable / spent) * 100 : 0;
          const commissions = labor.reduce((sum, item) => sum + Number(item.commission_amount), 0);
          const latestPayroll = (employee.payroll_items ?? [])[0];
          const stats: Array<[string, string | number, LucideIcon]> = [
            ['Ordenes asignadas', employee.work_orders?.length ?? 0, Briefcase],
            ['Horas trabajadas', attendanceHours.toFixed(1), Clock],
            ['Horas extras', overtime.toFixed(1), CalendarDays],
            ['Comisiones', money(commissions), TrendingUp],
            ['Ultimo neto', money(latestPayroll?.net_pay), ReceiptText],
          ];

          return (
            <Card key={employee.id} className="overflow-hidden border-0 shadow-sm">
              <CardContent className="p-0">
                <div className="border-b border-slate-100 bg-white p-5">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h2 className="text-xl font-black text-slate-900">{employee.name}</h2>
                      <p className="text-sm text-slate-500">{employee.role ?? 'Personal'} · {employee.specialty ?? 'Sin especialidad'}</p>
                    </div>
                    <p className="rounded-full bg-blue-50 px-3 py-1 text-sm font-bold text-blue-700">Productividad {productivity.toFixed(1)}%</p>
                  </div>
                </div>

                <div className="grid gap-4 p-5 md:grid-cols-5">
                  {stats.map(([label, value, Icon]) => (
                    <div key={String(label)} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                      <Icon className="mb-2 h-5 w-5 text-blue-600" />
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>
                      <p className="mt-1 text-lg font-black text-slate-900">{String(value)}</p>
                    </div>
                  ))}
                </div>

                <div className="grid gap-4 border-t border-slate-100 p-5 lg:grid-cols-2">
                  <div>
                    <h3 className="mb-3 font-black text-slate-900">Ordenes asignadas</h3>
                    <div className="space-y-2">
                      {(employee.work_orders ?? []).slice(0, 6).map((order) => {
                        const customer = firstRelated(order.customers);
                        const vehicle = firstRelated(order.vehicles);
                        return (
                          <div key={order.id} className="rounded-lg border border-slate-100 bg-white p-3">
                            <p className="font-bold text-slate-900">{vehicle?.plate ?? 'Sin placa'} · {vehicle?.make_model ?? 'Vehiculo'}</p>
                            <p className="text-xs text-slate-500">{customer?.name ?? 'Cliente'} · {order.status} · {Number(order.hours_spent ?? 0).toFixed(1)}h</p>
                          </div>
                        );
                      })}
                      {(employee.work_orders ?? []).length === 0 && <p className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-sm text-slate-500">Sin ordenes asignadas.</p>}
                    </div>
                  </div>

                  <div>
                    <h3 className="mb-3 font-black text-slate-900">Historial de pagos</h3>
                    <div className="space-y-2">
                      {(employee.payroll_items ?? []).slice(0, 6).map((item) => {
                        const run = firstRelated(item.payroll_runs);
                        const csv = `Empleado,Periodo,Devengado,Deducciones,Neto\n${employee.name},${run?.period_start ?? ''} a ${run?.period_end ?? ''},${item.gross_pay},${Number(item.advances) + Number(item.loan_deductions)},${item.net_pay}`;
                        return (
                          <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-white p-3">
                            <div>
                              <p className="font-bold text-slate-900">{run?.period_type ?? 'Nomina'} {run?.period_start ?? ''}</p>
                              <p className="text-xs text-slate-500">Neto {money(item.net_pay)} · Productividad {Number(item.productivity).toFixed(1)}%</p>
                            </div>
                            <a href={`data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`} download={`desprendible-${employee.name}-${run?.period_start ?? 'periodo'}.csv`} className="rounded border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700">
                              Descargar
                            </a>
                          </div>
                        );
                      })}
                      {(employee.payroll_items ?? []).length === 0 && <p className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-sm text-slate-500">Sin pagos cerrados.</p>}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {employees.length === 0 && <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">Registra personal para activar el portal del empleado.</div>}
    </div>
  );
}
