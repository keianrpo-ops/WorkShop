import { DocumentRow, money, PrintableDocument } from '@/components/PrintableDocument';
import { firstRelated, type Related } from '@/lib/relations';
import { supabase } from '@/lib/supabase';
import { productImage } from '@/lib/utils';
import { getWorkshopBusinessInfo } from '@/lib/workshop';

type Sale = {
  id: string;
  folio: string;
  payment_method: string;
  customer_name?: string | null;
  customer_document?: string | null;
  customer_phone?: string | null;
  customer_email?: string | null;
  subtotal: number;
  cost_total: number;
  total: number;
  created_at: string;
  sale_items: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    total: number;
    image_url?: string | null;
    inventory_items?: Related<{ image_url?: string | null; category?: string | null }>;
  }>;
};

function missingSchemaColumn(error: { message?: string } | null | undefined) {
  return Boolean(error?.message && (error.message.includes('does not exist') || error.message.includes('Could not find') || error.message.includes('schema cache')));
}

export default async function SaleReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const business = await getWorkshopBusinessInfo();
  let result: Awaited<ReturnType<typeof supabase.from>> | any = await supabase
    .from('sales')
    .select('id, folio, payment_method, customer_name, customer_document, customer_phone, customer_email, subtotal, cost_total, total, created_at, sale_items(description, quantity, unit_price, total, image_url, inventory_items(image_url, category))')
    .eq('id', id)
    .single();

  if (missingSchemaColumn(result.error)) {
    result = await supabase
      .from('sales')
      .select('id, folio, payment_method, subtotal, cost_total, total, created_at, sale_items(description, quantity, unit_price, total, inventory_items(image_url, category))')
      .eq('id', id)
      .single();
  }

  if (result.error) return <div className="p-8 text-red-700">{result.error.message}</div>;

  const sale = result.data as unknown as Sale;
  const customerName = sale.customer_name?.trim() || 'Consumidor final';

  return (
    <PrintableDocument title="Factura de venta" business={business}>
      <section className="document-meta mb-6 grid gap-4 rounded-xl border border-slate-200 p-4 md:grid-cols-2">
        <DocumentRow label="Factura No." value={sale.folio} strong />
        <DocumentRow label="Fecha" value={new Date(sale.created_at).toLocaleString('es-CO')} />
        <DocumentRow label="Metodo de pago" value={sale.payment_method === 'cash' ? 'Efectivo' : 'Tarjeta'} />
        <DocumentRow label="Cliente" value={customerName} />
        {sale.customer_document && <DocumentRow label="Documento" value={sale.customer_document} />}
        {sale.customer_phone && <DocumentRow label="Telefono" value={sale.customer_phone} />}
        {sale.customer_email && <DocumentRow label="Correo" value={sale.customer_email} />}
      </section>

      <table className="sale-receipt-table w-full text-left text-sm">
        <thead className="bg-slate-900 text-white">
          <tr>
            <th className="px-3 py-2">Producto / servicio</th>
            <th className="px-3 py-2 text-right">Cant.</th>
            <th className="px-3 py-2 text-right">Precio</th>
            <th className="px-3 py-2 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {(sale.sale_items ?? []).map((item, index) => (
            <tr key={`${item.description}-${index}`} className="border-b border-slate-100 align-middle">
              <td className="px-3 py-2">
                <div className="flex items-center gap-3">
                  <span
                    className="receipt-item-image h-14 w-14 flex-shrink-0 rounded-lg border border-slate-100 bg-slate-100 bg-cover bg-center"
                    style={{
                      backgroundImage: `url(${item.image_url ?? firstRelated(item.inventory_items)?.image_url ?? productImage(firstRelated(item.inventory_items)?.category)})`,
                    }}
                  />
                  <span className="font-bold text-slate-800">{item.description}</span>
                </div>
              </td>
              <td className="px-3 py-2 text-right">{Number(item.quantity).toFixed(0)}</td>
              <td className="px-3 py-2 text-right">{money(item.unit_price)}</td>
              <td className="px-3 py-2 text-right font-black">{money(item.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <section className="document-totals ml-auto mt-6 max-w-sm rounded-xl border border-slate-200 p-4">
        <DocumentRow label="Subtotal" value={money(sale.subtotal)} />
        <DocumentRow label="Total pagado" value={money(sale.total)} strong />
      </section>

      <p className="document-footer-note mt-8 rounded-xl bg-slate-50 p-4 text-center text-xs font-bold uppercase tracking-wider text-slate-500">
        {business.documentFooter}
      </p>
    </PrintableDocument>
  );
}
