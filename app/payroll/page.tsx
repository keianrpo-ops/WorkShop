import { Card, CardContent } from '@/components/ui/card';
import { createCommissionRule, createEmployeeLiquidation, createPayrollRun, updatePayrollParameters } from '@/lib/actions';
import { firstRelated, type Related } from '@/lib/relations';
import { isMissingColumn, supabase } from '@/lib/supabase';
import { BadgeDollarSign, FileText, Percent, Wallet, type LucideIcon } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

function money(value: number | null | undefined) {
  return `COP $${Number(value ?? 0).toLocaleString('es-CO')}`;
}

function ParameterField({
  name,
  label,
  help,
  defaultValue,
  step,
}: {
  name: string;
  label: string;
  help: string;
  defaultValue: number | string | null | undefined;
  step: string;
}) {
  return (
    <label className="grid gap-1 rounded-lg border border-slate-200 bg-white p-3">
      <span className="text-xs font-black uppercase tracking-wider text-slate-700">{label}</span>
      <span className="min-h-8 text-[11px] leading-4 text-slate-500">{help}</span>
      <input
        name={name}
        type="number"
        step={step}
        defaultValue={defaultValue ?? ''}
        className="rounded border border-slate-300 px-3 py-2 text-sm font-bold text-slate-900"
      />
    </label>
  );
}

type PayrollRun = {
  id: string;
  period_type: string;
  period_start: string;
  period_end: string;
  status: string;
  gross_total: number;
  deductions_total: number;
  net_total: number;
  payroll_items: Array<{
    id: string;
    pay_scheme?: string | null;
    base_salary: number;
    regular_hours: number;
    overtime_hours: number;
    commissions: number;
    advances: number;
    loan_deductions: number;
    net_pay: number;
    productivity: number;
    mechanics: Related<{ name: string; document_number?: string | null }>;
  }>;
};

export default async function PayrollPage() {
  let runsQuery: Awaited<ReturnType<typeof supabase.from>> | any = await supabase
    .from('payroll_runs')
    .select('id, period_type, period_start, period_end, status, gross_total, deductions_total, net_total, payroll_items(id, pay_scheme, base_salary, regular_hours, overtime_hours, commissions, advances, loan_deductions, net_pay, productivity, mechanics(name, document_number))')
    .order('created_at', { ascending: false })
    .limit(6);

  if (isMissingColumn(runsQuery.error, 'pay_scheme')) {
    runsQuery = await supabase
      .from('payroll_runs')
      .select('id, period_type, period_start, period_end, status, gross_total, deductions_total, net_total, payroll_items(id, base_salary, regular_hours, overtime_hours, commissions, advances, loan_deductions, net_pay, productivity, mechanics(name, document_number))')
      .order('created_at', { ascending: false })
      .limit(6);
  }

  const [rulesResult, mechanicsResult, paramsResult, liquidationsResult] = await Promise.all([
    supabase.from('commission_rules').select('id, name, applies_to, percent, is_active').order('created_at', { ascending: false }),
    supabase.from('mechanics').select('id, name, hire_date, base_salary').eq('is_active', true).order('name'),
    supabase.from('payroll_parameters').select('*').eq('workshop_id', '00000000-0000-0000-0000-000000000001').maybeSingle(),
    supabase.from('employee_liquidations').select('id, net_total, created_at, mechanics(name)').order('created_at', { ascending: false }).limit(8),
  ]);

  const runs = (runsQuery.data ?? []) as unknown as PayrollRun[];
  const rules = rulesResult.data ?? [];
  const mechanics = mechanicsResult.data ?? [];
  const parameters = paramsResult.data ?? {
    minimum_wage: 1423500,
    transport_allowance: 200000,
    month_base_days: 30,
    health_rate_employee: 0.04,
    pension_rate_employee: 0.04,
    solidarity_rate: 0.01,
    solidarity_salary_limit_smmlv: 4,
    arl_rate: 0.00522,
    compensation_rate: 0.04,
    severance_rate: 0.0833,
    severance_interest_rate_annual: 0.12,
    service_bonus_rate: 0.0833,
    vacation_rate: 0.0417,
    transport_salary_limit_smmlv: 2,
  };
  const liquidations = liquidationsResult.data ?? [];
  const activeEmployees = mechanics.length;
  const latestRun = runs[0];
  const error = runsQuery.error?.message ?? rulesResult.error?.message ?? paramsResult.error?.message ?? liquidationsResult.error?.message ?? null;
  const stats: Array<[string, string | number, LucideIcon]> = [
    ['Empleados activos', activeEmployees, Wallet],
    ['Ultima nomina', money(latestRun?.net_total), BadgeDollarSign],
    ['Deducciones', money(latestRun?.deductions_total), FileText],
    ['Reglas comision', rules.length, Percent],
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-wider text-blue-600">Nomina y costos laborales</p>
          <h1 className="text-3xl font-black text-slate-900">Cerrar nomina del taller</h1>
          <p className="text-slate-500">Calcula salarios, horas extras, comisiones, anticipos y prestamos con impacto automatico en contabilidad y tesoreria.</p>
        </div>
      </div>

      {error && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4 text-sm text-amber-800">
            Ejecuta en Supabase <span className="font-mono">06_hr_payroll_treasury.sql</span> y <span className="font-mono">07_hr_payroll_policies.sql</span>. Detalle: {error}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        {stats.map(([label, value, Icon]) => (
          <Card key={String(label)} className="border-0 shadow-sm">
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>
                <p className="mt-1 text-2xl font-black text-slate-900">{String(value)}</p>
              </div>
              <Icon className="h-8 w-8 text-blue-600" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <h2 className="text-lg font-black text-slate-900">Parametros laborales Colombia</h2>
          <p className="mb-5 text-sm text-slate-500">Estos valores alimentan nomina, prestaciones, liquidaciones y recibos imprimibles.</p>
          <form action={updatePayrollParameters} className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <ParameterField name="minimumWage" label="SMMLV" help="Salario minimo mensual legal vigente usado como base para topes y calculos." defaultValue={parameters.minimum_wage} step="1" />
            <ParameterField name="transportAllowance" label="Auxilio transporte mensual" help="Valor legal mensual de referencia para empleados que cumplen el tope." defaultValue={parameters.transport_allowance} step="1" />
            <ParameterField name="monthBaseDays" label="Dias base del mes" help="Base para prorratear salario, auxilio y pagos parciales. Usualmente 30." defaultValue={parameters.month_base_days} step="1" />
            <ParameterField name="healthRateEmployee" label="Salud empleado" help="Aporte descontado al trabajador. Ejemplo: 0.04 equivale al 4%." defaultValue={parameters.health_rate_employee} step="0.0001" />
            <ParameterField name="pensionRateEmployee" label="Pension empleado" help="Aporte descontado al trabajador. Ejemplo: 0.04 equivale al 4%." defaultValue={parameters.pension_rate_employee} step="0.0001" />
            <ParameterField name="solidarityRate" label="Fondo solidaridad pensional" help="Aporte FSP aplicado cuando supera el tope configurado. Ejemplo: 0.01 equivale al 1%." defaultValue={parameters.solidarity_rate} step="0.0001" />
            <ParameterField name="solidaritySalaryLimitSmmlv" label="Tope FSP en SMMLV" help="Cantidad de salarios minimos desde la cual empieza a aplicar el Fondo de Solidaridad." defaultValue={parameters.solidarity_salary_limit_smmlv} step="0.1" />
            <ParameterField name="arlRate" label="ARL riesgo laboral" help="Tarifa ARL asumida por el empleador segun clase de riesgo. Ejemplo: 0.00522 equivale al 0.522%." defaultValue={parameters.arl_rate} step="0.00001" />
            <ParameterField name="compensationRate" label="Caja compensacion" help="Aporte parafiscal del empleador a caja de compensacion. Ejemplo: 0.04 equivale al 4%." defaultValue={parameters.compensation_rate} step="0.0001" />
            <ParameterField name="severanceRate" label="Cesantias" help="Provision de cesantias sobre base salarial. Ejemplo: 0.0833 equivale a 8.33% mensual aproximado." defaultValue={parameters.severance_rate} step="0.0001" />
            <ParameterField name="severanceInterestRateAnnual" label="Intereses cesantias anual" help="Tasa anual para intereses sobre cesantias. Ejemplo: 0.12 equivale al 12% anual." defaultValue={parameters.severance_interest_rate_annual} step="0.0001" />
            <ParameterField name="serviceBonusRate" label="Prima de servicios" help="Provision de prima sobre base salarial. Ejemplo: 0.0833 equivale a 8.33% mensual aproximado." defaultValue={parameters.service_bonus_rate} step="0.0001" />
            <ParameterField name="vacationRate" label="Vacaciones" help="Provision de vacaciones. Ejemplo: 0.0417 equivale a 4.17% mensual aproximado." defaultValue={parameters.vacation_rate} step="0.0001" />
            <ParameterField name="transportSalaryLimitSmmlv" label="Tope auxilio transporte" help="Maximo de SMMLV para reconocer auxilio de transporte. Ejemplo: 2 equivale hasta 2 SMMLV." defaultValue={parameters.transport_salary_limit_smmlv} step="0.1" />
            <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800 md:col-span-2 xl:col-span-3">Guardar parametros</button>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <h2 className="text-lg font-black text-slate-900">Cerrar periodo</h2>
            <p className="mb-5 text-sm text-slate-500">El cierre genera gasto de nomina, salida de tesoreria y desprendibles por empleado.</p>
            <form action={createPayrollRun} className="grid gap-3 md:grid-cols-5">
              <select name="periodType" defaultValue="Quincenal" className="rounded border border-slate-300 px-3 py-2 text-sm">
                <option>Semanal</option>
                <option>Quincenal</option>
                <option>Mensual</option>
              </select>
              <input name="periodStart" type="date" required className="rounded border border-slate-300 px-3 py-2 text-sm" />
              <input name="periodEnd" type="date" required className="rounded border border-slate-300 px-3 py-2 text-sm" />
              <input name="daysPaid" type="number" min="1" step="0.5" placeholder="Dias a pagar" className="rounded border border-slate-300 px-3 py-2 text-sm" />
              <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700">Cerrar nomina</button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <h2 className="text-lg font-black text-slate-900">Reglas de comision</h2>
            <p className="mb-5 text-sm text-slate-500">Define porcentajes por mano de obra o venta para nuevos calculos.</p>
            <form action={createCommissionRule} className="grid gap-3">
              <input name="name" required placeholder="Nombre de regla" className="rounded border border-slate-300 px-3 py-2 text-sm" />
              <div className="grid grid-cols-2 gap-3">
                <select name="appliesTo" className="rounded border border-slate-300 px-3 py-2 text-sm">
                  <option value="LABOR">Mano de obra</option>
                  <option value="SALE">Venta</option>
                </select>
                <input name="percent" required type="number" min="0" step="0.1" placeholder="%" className="rounded border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800">Guardar regla</button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 bg-blue-50 shadow-sm">
        <CardContent className="grid gap-4 p-5 text-sm text-blue-950 md:grid-cols-5">
          <div>
            <p className="font-black">Salario fijo</p>
            <p>Liquida salario base, extras y comisiones registradas.</p>
          </div>
          <div>
            <p className="font-black">Por hora</p>
            <p>Liquida horas trabajadas por valor hora, mas extras.</p>
          </div>
          <div>
            <p className="font-black">Por comision</p>
            <p>Liquida solo comisiones registradas en ordenes o ventas.</p>
          </div>
          <div>
            <p className="font-black">Salario + comision</p>
            <p>Base fija mas comisiones, ideal para asesores o lideres.</p>
          </div>
          <div>
            <p className="font-black">Hora + comision</p>
            <p>Horas reales mas comisiones por productividad.</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <h2 className="text-lg font-black text-slate-900">Liquidacion de empleado</h2>
          <p className="mb-5 text-sm text-slate-500">Selecciona empleado, fecha inicial/final y el sistema calcula cesantias, intereses, prima y vacaciones.</p>
          <form action={createEmployeeLiquidation} className="grid gap-3 md:grid-cols-6">
            <select name="mechanicId" required className="rounded border border-slate-300 px-3 py-2 text-sm md:col-span-2">
              <option value="">Empleado</option>
              {mechanics.map((mechanic) => (
                <option key={mechanic.id} value={mechanic.id}>{mechanic.name}</option>
              ))}
            </select>
            <input name="startDate" type="date" required className="rounded border border-slate-300 px-3 py-2 text-sm" />
            <input name="endDate" type="date" required className="rounded border border-slate-300 px-3 py-2 text-sm" />
            <input name="baseSalary" type="number" min="0" step="1000" placeholder="Salario base opcional" className="rounded border border-slate-300 px-3 py-2 text-sm" />
            <input name="deductions" type="number" min="0" step="1000" placeholder="Deducciones" className="rounded border border-slate-300 px-3 py-2 text-sm" />
            <input name="reason" placeholder="Motivo de retiro" className="rounded border border-slate-300 px-3 py-2 text-sm md:col-span-5" />
            <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700">Generar liquidacion</button>
          </form>
          {liquidations.length > 0 && (
            <div className="mt-5 grid gap-2">
              {liquidations.map((liquidation: any) => {
                const mechanic = firstRelated(liquidation.mechanics);
                return (
                  <Link key={liquidation.id} href={`/documents/liquidation/${liquidation.id}`} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm hover:bg-white">
                    <span className="font-bold text-slate-800">{mechanic?.name ?? 'Empleado'} · {new Date(liquidation.created_at).toLocaleDateString('es-CO')}</span>
                    <span className="font-black text-blue-700">{money(liquidation.net_total)}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <div className="border-b border-slate-100 p-5">
            <h2 className="text-lg font-black text-slate-900">Historial de nomina</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {runs.map((run) => (
              <div key={run.id} className="p-5">
                <div className="mb-4 flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-black text-slate-900">{run.period_type} {run.period_start} a {run.period_end}</p>
                    <p className="text-sm text-slate-500">{run.status} · Neto: {money(run.net_total)}</p>
                  </div>
                  <a
                    href={`data:text/csv;charset=utf-8,Empleado,Documento,Neto%0A${encodeURIComponent((run.payroll_items ?? []).map((item) => {
                      const mechanic = firstRelated(item.mechanics);
                      return `${mechanic?.name ?? ''},${mechanic?.document_number ?? ''},${item.net_pay}`;
                    }).join('\n'))}`}
                    download={`nomina-${run.period_start}-${run.period_end}.csv`}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                  >
                    Exportar CSV
                  </a>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                      <tr>
                        <th className="px-3 py-2">Empleado</th>
                        <th className="px-3 py-2">Modalidad</th>
                        <th className="px-3 py-2">Horas</th>
                        <th className="px-3 py-2">Extras</th>
                        <th className="px-3 py-2">Comisiones</th>
                        <th className="px-3 py-2">Deducciones</th>
                        <th className="px-3 py-2">Productividad</th>
                        <th className="px-3 py-2">Neto</th>
                        <th className="px-3 py-2">Documento</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(run.payroll_items ?? []).map((item) => {
                        const mechanic = firstRelated(item.mechanics);
                        return (
                          <tr key={item.id} className="border-t border-slate-100">
                            <td className="px-3 py-2 font-bold text-slate-800">{mechanic?.name ?? 'Empleado'}</td>
                            <td className="px-3 py-2">{item.pay_scheme ?? 'Salario fijo'}</td>
                            <td className="px-3 py-2">{Number(item.regular_hours).toFixed(1)}</td>
                            <td className="px-3 py-2">{Number(item.overtime_hours).toFixed(1)}</td>
                            <td className="px-3 py-2">{money(item.commissions)}</td>
                            <td className="px-3 py-2">{money(Number(item.advances) + Number(item.loan_deductions))}</td>
                            <td className="px-3 py-2">{Number(item.productivity).toFixed(1)}%</td>
                            <td className="px-3 py-2 font-black text-emerald-700">{money(item.net_pay)}</td>
                            <td className="px-3 py-2">
                              <Link href={`/documents/payroll/${item.id}`} className="text-xs font-bold text-blue-600 hover:underline">
                                Recibo
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
            {runs.length === 0 && <div className="p-8 text-center text-slate-500">Aun no hay cierres de nomina.</div>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
