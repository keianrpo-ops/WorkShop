import { DocumentRow, money, PrintableDocument } from '@/components/PrintableDocument';
import { firstRelated, type Related } from '@/lib/relations';
import { supabase } from '@/lib/supabase';
import { getWorkshopBusinessInfo } from '@/lib/workshop';

type PayrollItem = {
  id: string;
  pay_scheme?: string | null;
  days_paid?: number | null;
  base_salary: number;
  regular_hours: number;
  overtime_hours: number;
  overtime_amount: number;
  transport_allowance?: number | null;
  health_deduction?: number | null;
  pension_deduction?: number | null;
  solidarity_deduction?: number | null;
  commissions: number;
  advances: number;
  loan_deductions: number;
  gross_pay: number;
  net_pay: number;
  productivity: number;
  mechanics: Related<{ name: string; document_number?: string | null; role?: string | null; bank_name?: string | null; bank_account_number?: string | null }>;
  payroll_runs: Related<{ period_type: string; period_start: string; period_end: string; status: string }>;
};

export default async function PayrollReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const business = await getWorkshopBusinessInfo();
  const result = await supabase
    .from('payroll_items')
    .select('id, pay_scheme, days_paid, base_salary, regular_hours, overtime_hours, overtime_amount, transport_allowance, health_deduction, pension_deduction, solidarity_deduction, commissions, advances, loan_deductions, gross_pay, net_pay, productivity, mechanics(name, document_number, role, bank_name, bank_account_number), payroll_runs(period_type, period_start, period_end, status)')
    .eq('id', id)
    .single();

  if (result.error) {
    return <div className="p-8 text-red-700">{result.error.message}</div>;
  }

  const item = result.data as unknown as PayrollItem;
  const employee = firstRelated(item.mechanics);
  const run = firstRelated(item.payroll_runs);
  const deductions = Number(item.health_deduction ?? 0) + Number(item.pension_deduction ?? 0) + Number(item.solidarity_deduction ?? 0) + Number(item.advances ?? 0) + Number(item.loan_deductions ?? 0);

  return (
    <PrintableDocument title="Comprobante de Pago de Nomina" subtitle={`${run?.period_type ?? 'Periodo'} ${run?.period_start ?? ''} a ${run?.period_end ?? ''}`} business={business}>
      <section className="mb-6 grid gap-4 rounded-xl border border-slate-200 p-4 md:grid-cols-2">
        <DocumentRow label="Empleado" value={employee?.name ?? 'Empleado'} strong />
        <DocumentRow label="Documento" value={employee?.document_number ?? 'Pendiente'} />
        <DocumentRow label="Cargo" value={employee?.role ?? 'Personal'} />
        <DocumentRow label="Modalidad" value={item.pay_scheme ?? 'Salario fijo'} />
        <DocumentRow label="Dias pagados" value={Number(item.days_paid ?? 0).toFixed(1)} />
        <DocumentRow label="Banco / cuenta" value={`${employee?.bank_name ?? 'Pendiente'} ${employee?.bank_account_number ?? ''}`} />
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <section>
          <h2 className="mb-3 bg-slate-900 px-3 py-2 text-sm font-black uppercase tracking-wider text-white">Devengados</h2>
          <DocumentRow label="Salario / horas base" value={money(item.base_salary)} />
          <DocumentRow label="Horas extras" value={money(item.overtime_amount)} />
          <DocumentRow label="Auxilio de transporte" value={money(item.transport_allowance)} />
          <DocumentRow label="Comisiones" value={money(item.commissions)} />
          <DocumentRow label="Total devengado" value={money(item.gross_pay)} strong />
        </section>

        <section>
          <h2 className="mb-3 bg-slate-900 px-3 py-2 text-sm font-black uppercase tracking-wider text-white">Deducciones</h2>
          <DocumentRow label="Salud" value={money(item.health_deduction)} />
          <DocumentRow label="Pension" value={money(item.pension_deduction)} />
          <DocumentRow label="Fondo solidaridad" value={money(item.solidarity_deduction)} />
          <DocumentRow label="Anticipos" value={money(item.advances)} />
          <DocumentRow label="Prestamos" value={money(item.loan_deductions)} />
          <DocumentRow label="Total deducciones" value={money(deductions)} strong />
        </section>
      </div>

      <section className="mt-8 rounded-xl bg-slate-950 p-5 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Neto a pagar</p>
            <p className="mt-1 text-4xl font-black">{money(item.net_pay)}</p>
          </div>
          <div className="text-right text-sm">
            <p>Horas: {Number(item.regular_hours ?? 0).toFixed(1)}</p>
            <p>Extras: {Number(item.overtime_hours ?? 0).toFixed(1)}</p>
            <p>Productividad: {Number(item.productivity ?? 0).toFixed(1)}%</p>
          </div>
        </div>
      </section>

      <footer className="mt-10 grid gap-8 text-sm md:grid-cols-2">
        <div className="border-t border-slate-400 pt-2">Firma empleado</div>
        <div className="border-t border-slate-400 pt-2">Firma autorizado</div>
      </footer>
    </PrintableDocument>
  );
}
