import { DocumentRow, money, PrintableDocument } from '@/components/PrintableDocument';
import { firstRelated, type Related } from '@/lib/relations';
import { supabase } from '@/lib/supabase';
import { getWorkshopBusinessInfo } from '@/lib/workshop';

type Quotation = {
  id: string;
  status: string;
  subtotal: number;
  taxes: number;
  total: number;
  created_at: string;
  customers: Related<{ name: string; phone?: string | null; email?: string | null }>;
  work_orders: Related<{
    status?: string | null;
    issue_description?: string | null;
    diagnosis_summary?: string | null;
    vehicle_condition?: string | null;
    estimated_hours?: number | null;
    mechanics?: Related<{ name: string; specialty?: string | null }>;
    vehicles?: Related<{
      plate: string;
      make_model: string;
      type?: string | null;
      year?: number | null;
      mileage?: number | null;
    }>;
  }>;
  quotation_items: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    subtotal?: number | null;
    tax_rate?: number | null;
    tax_amount?: number | null;
    total: number;
  }>;
};

const QUOTATION_SELECTS = [
  'id, status, subtotal, taxes, total, created_at, customers(name, phone, email), work_orders(status, issue_description, diagnosis_summary, vehicle_condition, estimated_hours, mechanics(name, specialty), vehicles(plate, make_model, type, year, mileage)), quotation_items(description, quantity, unit_price, subtotal, tax_rate, tax_amount, total)',
  'id, status, subtotal, taxes, total, created_at, customers(name, phone, email), work_orders(status, issue_description, diagnosis_summary, vehicle_condition, estimated_hours, mechanics(name, specialty), vehicles(plate, make_model, type, year, mileage)), quotation_items(description, quantity, unit_price, total)',
  'id, status, subtotal, taxes, total, created_at, customers(name, phone, email), quotation_items(description, quantity, unit_price, subtotal, tax_rate, tax_amount, total)',
  'id, status, subtotal, taxes, total, created_at, customers(name, phone, email), quotation_items(description, quantity, unit_price, total)',
  'id, status, subtotal, taxes, total, created_at, quotation_items(description, quantity, unit_price, subtotal, tax_rate, tax_amount, total)',
  'id, status, subtotal, taxes, total, created_at, quotation_items(description, quantity, unit_price, total)',
  'id, status, subtotal, taxes, total, created_at',
];

function splitItemDescription(description: string) {
  const [category, ...rest] = description.split(':');
  if (!rest.length) return { category: 'Item', detail: description };
  return { category: category.trim(), detail: rest.join(':').trim() };
}

async function getQuotation(id: string) {
  let lastError: unknown = null;

  for (const select of QUOTATION_SELECTS) {
    const result = await supabase
      .from('quotations')
      .select(select)
      .eq('id', id)
      .single();

    if (!result.error) return { data: result.data as unknown as Quotation, error: null };
    lastError = result.error;
  }

  return { data: null, error: lastError };
}

export default async function QuotationDocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const business = await getWorkshopBusinessInfo();
  const result = await getQuotation(id);

  if (result.error || !result.data) {
    const message = typeof result.error === 'object' && result.error !== null && 'message' in result.error ? String(result.error.message) : 'No se pudo cargar la cotizacion.';
    return <div className="p-8 text-red-700">{message}</div>;
  }

  const quotation = result.data;
  const customer = firstRelated(quotation.customers);
  const workOrder = firstRelated(quotation.work_orders);
  const vehicle = firstRelated(workOrder?.vehicles ?? null);
  const mechanic = firstRelated(workOrder?.mechanics ?? null);
  const folio = `COT-${quotation.id.slice(0, 8).toUpperCase()}`;

  return (
    <PrintableDocument title="Cotizacion de Servicio" subtitle={`Folio ${folio}`} business={business}>
      <section className="document-meta mb-6 grid gap-4 rounded-xl border border-slate-200 p-4 md:grid-cols-2">
        <DocumentRow label="Folio" value={folio} strong />
        <DocumentRow label="Fecha" value={new Date(quotation.created_at).toLocaleString('es-CO')} />
        <DocumentRow label="Estado" value={quotation.status} />
        <DocumentRow label="Cliente" value={customer?.name ?? 'Cliente pendiente'} />
        {customer?.phone && <DocumentRow label="Telefono" value={customer.phone} />}
        {customer?.email && <DocumentRow label="Correo" value={customer.email} />}
        <DocumentRow label="Vehiculo" value={vehicle ? `${vehicle.make_model} - ${vehicle.plate}` : 'Vehiculo pendiente'} />
        <DocumentRow label="Tipo" value={vehicle?.type ?? 'Pendiente'} />
        <DocumentRow label="Ano" value={vehicle?.year ?? 'Pendiente'} />
        <DocumentRow label="Kilometraje" value={vehicle?.mileage ? `${Number(vehicle.mileage).toLocaleString('es-CO')} km` : 'Pendiente'} />
        <DocumentRow label="Mecanico asignado" value={mechanic?.name ?? 'Por asignar'} />
        <DocumentRow label="Especialidad" value={mechanic?.specialty ?? 'General'} />
      </section>

      {(workOrder?.issue_description || workOrder?.diagnosis_summary || workOrder?.vehicle_condition) && (
        <section className="mb-6 rounded-xl border border-slate-200 p-4">
          <h2 className="mb-3 text-sm font-black uppercase tracking-wider text-slate-900">Diagnostico y alcance del trabajo</h2>
          {workOrder?.vehicle_condition && <DocumentRow label="Estado del vehiculo" value={workOrder.vehicle_condition} />}
          {workOrder?.issue_description && <DocumentRow label="Solicitud del cliente" value={workOrder.issue_description} />}
          {workOrder?.diagnosis_summary && <DocumentRow label="Diagnostico" value={workOrder.diagnosis_summary} />}
          {workOrder?.estimated_hours ? <DocumentRow label="Horas estimadas" value={`${Number(workOrder.estimated_hours).toFixed(1)} h`} /> : null}
        </section>
      )}

      <table className="quotation-document-table sale-receipt-table w-full text-left text-sm">
        <thead className="bg-slate-900 text-white">
          <tr>
            <th className="px-3 py-2">#</th>
            <th className="px-3 py-2">Tipo</th>
            <th className="px-3 py-2">Trabajo / repuesto</th>
            <th className="px-3 py-2 text-right">Cant.</th>
            <th className="px-3 py-2 text-right">Vr. unitario</th>
            <th className="px-3 py-2 text-right">IVA</th>
            <th className="px-3 py-2 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {(quotation.quotation_items ?? []).map((item, index) => {
            const parsed = splitItemDescription(item.description);
            const taxRate = Number(item.tax_rate ?? 0);
            const taxAmount = Number(item.tax_amount ?? 0);

            return (
              <tr key={`${item.description}-${index}`} className="border-b border-slate-100 align-top">
                <td className="px-3 py-2 font-black text-slate-500">{index + 1}</td>
                <td className="px-3 py-2 font-bold text-slate-700">{parsed.category}</td>
                <td className="px-3 py-2 font-bold text-slate-900">{parsed.detail}</td>
                <td className="px-3 py-2 text-right">{Number(item.quantity).toLocaleString('es-CO')}</td>
                <td className="px-3 py-2 text-right">{money(item.unit_price)}</td>
                <td className="px-3 py-2 text-right">{taxRate > 0 ? `${taxRate}% / ${money(taxAmount)}` : 'Sin IVA'}</td>
                <td className="px-3 py-2 text-right font-black">{money(item.total)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <section className="document-totals ml-auto mt-6 max-w-sm rounded-xl border border-slate-200 p-4">
        <DocumentRow label="Subtotal" value={money(quotation.subtotal)} />
        <DocumentRow label="IVA aplicado" value={money(quotation.taxes)} />
        <DocumentRow label="Total cotizado" value={money(quotation.total)} strong />
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 p-4 text-sm text-slate-600">
          <p className="font-black uppercase tracking-wider text-slate-900">Condiciones</p>
          <p className="mt-2">Esta cotizacion esta sujeta a disponibilidad de repuestos, validacion final del diagnostico y aprobacion del cliente.</p>
          <p className="mt-2">Validez sugerida: 15 dias calendario.</p>
        </div>
        <div className="rounded-xl border border-slate-200 p-4 text-sm text-slate-600">
          <p className="font-black uppercase tracking-wider text-slate-900">Autorizacion</p>
          <div className="mt-8 border-t border-slate-400 pt-2 text-center text-xs font-bold uppercase tracking-wider text-slate-500">
            Firma cliente / autorizacion
          </div>
        </div>
      </section>

      <p className="document-footer-note mt-8 rounded-xl bg-slate-50 p-4 text-center text-xs font-bold uppercase tracking-wider text-slate-500">
        {business.documentFooter}
      </p>
    </PrintableDocument>
  );
}
