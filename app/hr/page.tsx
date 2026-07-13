import { Card, CardContent } from '@/components/ui/card';
import { LoanPaymentModal } from '@/components/LoanPaymentModal';
import { createEmployeeAdvance, createEmployeeLoan, recordAttendance } from '@/lib/actions';
import { isMissingColumn, supabase } from '@/lib/supabase';
import { AlarmClock, Banknote, CalendarCheck, Clock, Medal, PiggyBank, UserCheck, type LucideIcon } from 'lucide-react';

export const dynamic = 'force-dynamic';

type Mechanic = {
  id: string;
  name: string;
  role: string | null;
  specialty: string | null;
  employment_status: string | null;
  work_orders: Array<{ id: string; status: string; hours_spent: number; estimated_hours: number }>;
};

type Attendance = {
  mechanic_id: string;
  hours_worked: number;
  overtime_hours: number;
};

type Advance = {
  id: string;
  mechanic_id: string;
  amount: number;
  balance?: number | null;
  deduction_amount?: number | null;
  deduction_installments?: number | null;
  deduction_period?: string | null;
  deduction_start_date?: string | null;
  advance_date?: string | null;
  reason?: string | null;
  status: string;
};

type Loan = {
  id: string;
  mechanic_id: string;
  principal: number;
  balance: number;
  installments: number;
  installment_amount: number;
  deduction_period?: string | null;
  deduction_start_date?: string | null;
  loan_date?: string | null;
  notes?: string | null;
  status: string;
};

type LoanPayment = {
  id: string;
  loan_id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  reference?: string | null;
};

function schemaCacheError(error: { message?: string } | null | undefined) {
  return Boolean(error?.message && (error.message.includes('schema cache') || error.message.includes('Could not find')));
}

function money(value: number | null | undefined) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));
}

async function getHrData() {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().slice(0, 10);

  const [mechanicsResult, attendanceResult, payrollResult] = await Promise.all([
    supabase.from('mechanics').select('id, name, role, specialty, employment_status, work_orders(id, status, hours_spent, estimated_hours)').order('name'),
    supabase.from('attendance_records').select('mechanic_id, hours_worked, overtime_hours').gte('work_date', firstDay).lte('work_date', lastDay),
    supabase.from('payroll_runs').select('id, net_total, status, period_start, period_end').order('created_at', { ascending: false }).limit(1),
  ]);

  let advancesResult: Awaited<ReturnType<typeof supabase.from>> | any = await supabase
    .from('employee_advances')
    .select('id, mechanic_id, amount, balance, deduction_amount, deduction_installments, deduction_period, deduction_start_date, advance_date, reason, status')
    .eq('status', 'Pendiente')
    .order('advance_date', { ascending: false });

  if (isMissingColumn(advancesResult.error, 'deduction_amount') || schemaCacheError(advancesResult.error)) {
    advancesResult = await supabase
      .from('employee_advances')
      .select('id, mechanic_id, amount, status')
      .eq('status', 'Pendiente');
  }

  let loansResult: Awaited<ReturnType<typeof supabase.from>> | any = await supabase
    .from('employee_loans')
    .select('id, mechanic_id, principal, balance, installments, installment_amount, deduction_period, deduction_start_date, loan_date, notes, status')
    .eq('status', 'Activo')
    .order('loan_date', { ascending: false });

  if (isMissingColumn(loansResult.error, 'deduction_period') || schemaCacheError(loansResult.error)) {
    loansResult = await supabase
      .from('employee_loans')
      .select('id, mechanic_id, principal, balance, installments, installment_amount, status')
      .eq('status', 'Activo');
  }

  const loanIds = ((loansResult.data ?? []) as Loan[]).map((loan) => loan.id);
  let loanPayments: LoanPayment[] = [];

  if (loanIds.length > 0) {
    const paymentsResult = await supabase
      .from('employee_loan_payments')
      .select('id, loan_id, amount, payment_date, payment_method, reference')
      .in('loan_id', loanIds)
      .order('payment_date', { ascending: false });

    if (!paymentsResult.error) {
      loanPayments = (paymentsResult.data ?? []) as LoanPayment[];
    }
  }

  return {
    mechanics: (mechanicsResult.data ?? []) as unknown as Mechanic[],
    attendance: (attendanceResult.data ?? []) as Attendance[],
    advances: (advancesResult.data ?? []) as Advance[],
    loans: (loansResult.data ?? []) as Loan[],
    loanPayments,
    latestPayroll: payrollResult.data?.[0] as { net_total: number; status: string; period_start: string; period_end: string } | undefined,
    error: mechanicsResult.error?.message ?? attendanceResult.error?.message ?? advancesResult.error?.message ?? loansResult.error?.message ?? payrollResult.error?.message ?? null,
  };
}

export default async function HrPage() {
  const { mechanics, attendance, advances, loans, loanPayments, latestPayroll, error } = await getHrData();
  const mechanicName = new Map(mechanics.map((mechanic) => [mechanic.id, mechanic.name]));
  const paymentsByLoan = new Map<string, LoanPayment[]>();
  for (const payment of loanPayments) {
    paymentsByLoan.set(payment.loan_id, [...(paymentsByLoan.get(payment.loan_id) ?? []), payment]);
  }
  const activeEmployees = mechanics.filter((mechanic) => mechanic.employment_status !== 'Inactivo').length;
  const hoursWorked = attendance.reduce((sum, row) => sum + Number(row.hours_worked), 0);
  const overtime = attendance.reduce((sum, row) => sum + Number(row.overtime_hours), 0);
  const pendingAdvances = advances.reduce((sum, row) => sum + Number(row.balance ?? row.amount), 0);
  const loanBalance = loans.reduce((sum, row) => sum + Number(row.balance), 0);
  const topMechanics = mechanics
    .map((mechanic) => {
      const jobs = mechanic.work_orders ?? [];
      const spent = jobs.reduce((sum, job) => sum + Number(job.hours_spent ?? 0), 0);
      const estimated = jobs.reduce((sum, job) => sum + Number(job.estimated_hours ?? 0), 0);
      const productivity = spent > 0 ? (estimated / spent) * 100 : 0;
      return { ...mechanic, completed: jobs.filter((job) => ['Listo', 'Entregado'].includes(job.status)).length, productivity };
    })
    .sort((a, b) => b.productivity - a.productivity)
    .slice(0, 5);
  const stats: Array<[string, string | number, LucideIcon, string]> = [
    ['Empleados activos', activeEmployees, UserCheck, 'text-blue-600'],
    ['Nomina periodo', `COP ${Number(latestPayroll?.net_total ?? 0).toFixed(2)}`, Banknote, 'text-green-600'],
    ['Horas trabajadas', hoursWorked.toFixed(1), Clock, 'text-slate-700'],
    ['Horas extras', overtime.toFixed(1), AlarmClock, 'text-amber-600'],
    ['Anticipos pendientes', `COP ${pendingAdvances.toFixed(2)}`, PiggyBank, 'text-red-600'],
    ['Prestamos saldo', `COP ${loanBalance.toFixed(2)}`, Banknote, 'text-purple-600'],
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Dashboard RRHH</h1>
        <p className="mt-1 text-slate-500">Personal, asistencia, productividad, anticipos, prestamos y nomina integrados al taller.</p>
      </div>

      {error && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4 text-sm text-amber-800">
            Ejecuta en Supabase los SQL <span className="font-mono">06_hr_payroll_treasury.sql</span> y <span className="font-mono">07_hr_payroll_policies.sql</span>. Detalle: {error}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        {stats.map(([label, value, Icon, color]) => (
          <Card key={String(label)}>
            <CardContent className="p-5">
              <Icon className={`mb-3 h-5 w-5 ${color}`} />
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
              <p className="mt-2 text-2xl font-black text-slate-900">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            <h2 className="mb-4 flex items-center gap-2 font-bold text-slate-900">
              <Medal className="h-5 w-5 text-blue-600" />
              Top mecanicos por productividad
            </h2>
            <div className="space-y-3">
              {topMechanics.map((mechanic) => (
                <div key={mechanic.id} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-900">{mechanic.name}</p>
                      <p className="text-sm text-slate-500">{mechanic.role ?? 'Personal'} · {mechanic.specialty ?? 'Sin especialidad'}</p>
                    </div>
                    <p className="text-xl font-black text-blue-700">{mechanic.productivity.toFixed(1)}%</p>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-white">
                    <div className="h-2 rounded-full bg-blue-600" style={{ width: `${Math.min(mechanic.productivity, 100)}%` }} />
                  </div>
                  <p className="mt-2 text-xs text-slate-500">{mechanic.completed} ordenes listas o entregadas</p>
                </div>
              ))}
              {topMechanics.length === 0 && <p className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">Aun no hay productividad registrada.</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-5 p-6">
            <h2 className="flex items-center gap-2 font-bold text-slate-900">
              <CalendarCheck className="h-5 w-5 text-blue-600" />
              Asistencia rapida
            </h2>
            <form action={recordAttendance} className="space-y-3">
              <select name="mechanicId" required className="w-full rounded border border-slate-300 px-3 py-2 text-sm">
                <option value="">Empleado</option>
                {mechanics.map((mechanic) => (
                  <option key={mechanic.id} value={mechanic.id}>{mechanic.name}</option>
                ))}
              </select>
              <input name="workDate" required type="date" defaultValue={new Date().toISOString().slice(0, 10)} className="w-full rounded border border-slate-300 px-3 py-2 text-sm" />
              <div className="grid grid-cols-2 gap-2">
                <input name="checkIn" type="time" className="rounded border border-slate-300 px-3 py-2 text-sm" />
                <input name="checkOut" type="time" className="rounded border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input name="hoursWorked" type="number" min="0" step="0.25" placeholder="Horas" className="rounded border border-slate-300 px-3 py-2 text-sm" />
                <input name="overtimeHours" type="number" min="0" step="0.25" placeholder="Extras" className="rounded border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <select name="status" className="w-full rounded border border-slate-300 px-3 py-2 text-sm">
                <option>Presente</option>
                <option>Llegada tarde</option>
                <option>Ausencia</option>
                <option>Permiso</option>
                <option>Vacaciones</option>
              </select>
              <button className="w-full rounded-lg bg-blue-600 py-2 text-sm font-bold text-white hover:bg-blue-700">Guardar asistencia</button>
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="space-y-4 p-6">
            <h2 className="font-bold text-slate-900">Registrar anticipo</h2>
            <form action={createEmployeeAdvance} className="grid gap-3 md:grid-cols-2">
              <select name="mechanicId" required className="rounded border border-slate-300 px-3 py-2 text-sm md:col-span-2">
                <option value="">Empleado</option>
                {mechanics.map((mechanic) => <option key={mechanic.id} value={mechanic.id}>{mechanic.name}</option>)}
              </select>
              <input name="advanceDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className="rounded border border-slate-300 px-3 py-2 text-sm" />
              <input name="amount" required type="number" min="0" step="0.01" placeholder="Valor" className="rounded border border-slate-300 px-3 py-2 text-sm" />
              <select name="deductionPeriod" defaultValue="Quincenal" className="rounded border border-slate-300 px-3 py-2 text-sm">
                <option>Semanal</option>
                <option>Quincenal</option>
                <option>Mensual</option>
              </select>
              <input name="deductionStartDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className="rounded border border-slate-300 px-3 py-2 text-sm" />
              <input name="deductionInstallments" type="number" min="1" defaultValue="1" placeholder="Numero de descuentos" className="rounded border border-slate-300 px-3 py-2 text-sm" />
              <input name="deductionAmount" type="number" min="0" step="0.01" placeholder="Valor por descuento" className="rounded border border-slate-300 px-3 py-2 text-sm" />
              <input name="reason" placeholder="Motivo" className="rounded border border-slate-300 px-3 py-2 text-sm md:col-span-2" />
              <textarea name="notes" placeholder="Notas internas del descuento" className="min-h-20 rounded border border-slate-300 px-3 py-2 text-sm md:col-span-2" />
              <button className="rounded-lg bg-slate-900 py-2 text-sm font-bold text-white md:col-span-2">Guardar anticipo</button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 p-6">
            <h2 className="font-bold text-slate-900">Registrar prestamo</h2>
            <form action={createEmployeeLoan} className="grid gap-3 md:grid-cols-2">
              <select name="mechanicId" required className="rounded border border-slate-300 px-3 py-2 text-sm md:col-span-2">
                <option value="">Empleado</option>
                {mechanics.map((mechanic) => <option key={mechanic.id} value={mechanic.id}>{mechanic.name}</option>)}
              </select>
              <input name="loanDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className="rounded border border-slate-300 px-3 py-2 text-sm" />
              <input name="principal" required type="number" min="0" step="0.01" placeholder="Valor prestado" className="rounded border border-slate-300 px-3 py-2 text-sm" />
              <input name="installments" required type="number" min="1" placeholder="Cuotas" className="rounded border border-slate-300 px-3 py-2 text-sm" />
              <input name="installmentAmount" type="number" min="0" step="0.01" placeholder="Valor cuota" className="rounded border border-slate-300 px-3 py-2 text-sm" />
              <select name="deductionPeriod" defaultValue="Quincenal" className="rounded border border-slate-300 px-3 py-2 text-sm">
                <option>Semanal</option>
                <option>Quincenal</option>
                <option>Mensual</option>
              </select>
              <input name="deductionStartDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className="rounded border border-slate-300 px-3 py-2 text-sm" />
              <textarea name="notes" placeholder="Condiciones, autorizacion o notas del prestamo" className="min-h-20 rounded border border-slate-300 px-3 py-2 text-sm md:col-span-2" />
              <button className="rounded-lg bg-slate-900 py-2 text-sm font-bold text-white md:col-span-2">Guardar prestamo</button>
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="space-y-4 p-6">
            <div>
              <h2 className="font-bold text-slate-900">Anticipos pendientes</h2>
              <p className="text-sm text-slate-500">Cada anticipo queda programado para descuento de nomina.</p>
            </div>
            <div className="space-y-3">
              {advances.map((advance) => (
                <div key={advance.id} className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-slate-900">{mechanicName.get(advance.mechanic_id) ?? 'Empleado'}</p>
                      <p className="text-xs text-slate-500">{advance.reason ?? 'Sin motivo'} - {advance.advance_date ?? 'Sin fecha'}</p>
                    </div>
                    <span className="rounded bg-amber-50 px-2 py-1 text-xs font-bold text-amber-700">{advance.status}</span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <p className="rounded bg-slate-50 px-3 py-2"><span className="font-bold">Valor: </span>{money(advance.amount)}</p>
                    <p className="rounded bg-slate-50 px-3 py-2"><span className="font-bold">Saldo: </span>{money(advance.balance ?? advance.amount)}</p>
                    <p className="rounded bg-slate-50 px-3 py-2"><span className="font-bold">Cuota: </span>{money(advance.deduction_amount ?? advance.amount)}</p>
                    <p className="rounded bg-slate-50 px-3 py-2"><span className="font-bold">Periodo: </span>{advance.deduction_period ?? 'Quincenal'}</p>
                    <p className="rounded bg-slate-50 px-3 py-2"><span className="font-bold">Inicio: </span>{advance.deduction_start_date ?? advance.advance_date ?? 'Pendiente'}</p>
                    <p className="rounded bg-slate-50 px-3 py-2"><span className="font-bold">Descuentos: </span>{advance.deduction_installments ?? 1}</p>
                  </div>
                </div>
              ))}
              {advances.length === 0 && <p className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">No hay anticipos pendientes.</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 p-6">
            <div>
              <h2 className="font-bold text-slate-900">Prestamos activos y abonos</h2>
              <p className="text-sm text-slate-500">Registra abonos manuales o deja que nomina descuente la cuota programada.</p>
            </div>
            <div className="space-y-3">
              {loans.map((loan) => {
                const payments = paymentsByLoan.get(loan.id) ?? [];

                return (
                  <details key={loan.id} className="rounded-xl border border-slate-200 bg-white">
                    <summary className="cursor-pointer px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-bold text-slate-900">{mechanicName.get(loan.mechanic_id) ?? 'Empleado'}</p>
                          <p className="text-xs text-slate-500">{loan.loan_date ?? 'Sin fecha'} - {loan.installments} cuotas {loan.deduction_period ?? 'Quincenal'}</p>
                        </div>
                        <span className="rounded bg-purple-50 px-2 py-1 text-xs font-bold text-purple-700">{money(loan.balance)}</span>
                      </div>
                    </summary>
                    <div className="space-y-4 border-t border-slate-100 p-4">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <p className="rounded bg-slate-50 px-3 py-2"><span className="font-bold">Prestado: </span>{money(loan.principal)}</p>
                        <p className="rounded bg-slate-50 px-3 py-2"><span className="font-bold">Saldo: </span>{money(loan.balance)}</p>
                        <p className="rounded bg-slate-50 px-3 py-2"><span className="font-bold">Cuota: </span>{money(loan.installment_amount)}</p>
                        <p className="rounded bg-slate-50 px-3 py-2"><span className="font-bold">Inicio: </span>{loan.deduction_start_date ?? loan.loan_date ?? 'Pendiente'}</p>
                      </div>

                      <LoanPaymentModal
                        loanId={loan.id}
                        mechanicId={loan.mechanic_id}
                        employeeName={mechanicName.get(loan.mechanic_id) ?? 'Empleado'}
                        balance={Number(loan.balance)}
                      />

                      <div>
                        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Historial de abonos</p>
                        <div className="space-y-2">
                          {payments.slice(0, 5).map((payment) => (
                            <div key={payment.id} className="flex justify-between rounded bg-slate-50 px-3 py-2 text-xs">
                              <span>{payment.payment_date} - {payment.payment_method}</span>
                              <span className="font-bold">{money(payment.amount)}</span>
                            </div>
                          ))}
                          {payments.length === 0 && <p className="rounded border border-dashed border-slate-200 p-3 text-center text-xs text-slate-500">Sin abonos registrados.</p>}
                        </div>
                      </div>
                    </div>
                  </details>
                );
              })}
              {loans.length === 0 && <p className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">No hay prestamos activos.</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
