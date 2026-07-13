import { DocumentRow, money, PrintableDocument } from '@/components/PrintableDocument';
import { firstRelated, type Related } from '@/lib/relations';
import { supabase } from '@/lib/supabase';
import { getWorkshopBusinessInfo } from '@/lib/workshop';

type Liquidation = {
  id: string;
  start_date: string;
  end_date: string;
  days_worked: number;
  base_salary: number;
  transport_allowance: number;
  severance: number;
  severance_interest: number;
  service_bonus: number;
  vacations: number;
  deductions: number;
  net_total: number;
  reason: string | null;
  mechanics: Related<{ name: string; document_number?: string | null; role?: string | null }>;
};

export default async function LiquidationReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const business = await getWorkshopBusinessInfo();
  const result = await supabase
    .from('employee_liquidations')
    .select('id, start_date, end_date, days_worked, base_salary, transport_allowance, severance, severance_interest, service_bonus, vacations, deductions, net_total, reason, mechanics(name, document_number, role)')
    .eq('id', id)
    .single();

  if (result.error) return <div className="p-8 text-red-700">{result.error.message}</div>;

  const liquidation = result.data as unknown as Liquidation;
  const employee = firstRelated(liquidation.mechanics);

  return (
    <PrintableDocument title="Recibo de Liquidacion Laboral" subtitle={`${liquidation.start_date} a ${liquidation.end_date}`} business={business}>
      <section className="mb-6 grid gap-4 rounded-xl border border-slate-200 p-4 md:grid-cols-2">
        <DocumentRow label="Empleado" value={employee?.name ?? 'Empleado'} strong />
        <DocumentRow label="Documento" value={employee?.document_number ?? 'Pendiente'} />
        <DocumentRow label="Cargo" value={employee?.role ?? 'Personal'} />
        <DocumentRow label="Dias liquidados" value={liquidation.days_worked} />
        <DocumentRow label="Salario base" value={money(liquidation.base_salary)} />
        <DocumentRow label="Motivo" value={liquidation.reason ?? 'Liquidacion de contrato'} />
      </section>

      <section>
        <h2 className="mb-3 bg-slate-900 px-3 py-2 text-sm font-black uppercase tracking-wider text-white">Conceptos de liquidacion</h2>
        <DocumentRow label="Auxilio transporte base" value={money(liquidation.transport_allowance)} />
        <DocumentRow label="Cesantias" value={money(liquidation.severance)} />
        <DocumentRow label="Intereses sobre cesantias" value={money(liquidation.severance_interest)} />
        <DocumentRow label="Prima de servicios" value={money(liquidation.service_bonus)} />
        <DocumentRow label="Vacaciones" value={money(liquidation.vacations)} />
        <DocumentRow label="Deducciones" value={money(liquidation.deductions)} />
      </section>

      <section className="mt-8 rounded-xl bg-slate-950 p-5 text-white">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Total liquidacion a pagar</p>
        <p className="mt-1 text-4xl font-black">{money(liquidation.net_total)}</p>
      </section>

      <footer className="mt-10 grid gap-8 text-sm md:grid-cols-2">
        <div className="border-t border-slate-400 pt-2">Firma empleado</div>
        <div className="border-t border-slate-400 pt-2">Firma autorizado</div>
      </footer>
    </PrintableDocument>
  );
}
