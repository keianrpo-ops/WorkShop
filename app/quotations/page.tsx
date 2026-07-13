import { Card, CardContent } from '@/components/ui/card';
import { updateQuotationStatus } from '@/lib/actions';
import { firstRelated, type Related } from '@/lib/relations';
import { supabase } from '@/lib/supabase';
import { CheckCircle, FileEdit, FileText, Search, XCircle } from 'lucide-react';
import Link from 'next/link';
import { QuotationBuilder } from './QuotationBuilder';

export const dynamic = 'force-dynamic';

type Quotation = {
  id: string;
  status: string;
  subtotal: number;
  taxes: number;
  total: number;
  created_at: string;
  customers: Related<{ name: string }>;
  work_orders: Related<{ vehicles: Related<{ plate: string; make_model: string }> }>;
  quotation_items: Array<{ id: string; description: string; quantity: number; unit_price: number; total: number }>;
};

export default async function QuotationsPage({ searchParams }: { searchParams?: Promise<{ error?: string }> }) {
  const params = searchParams ? await searchParams : {};
  const [quotesResult, customersResult, ordersResult] = await Promise.all([
    supabase
    .from('quotations')
    .select('id, status, subtotal, taxes, total, created_at, customers(name), work_orders(vehicles(plate, make_model)), quotation_items(id, description, quantity, unit_price, total)')
      .order('created_at', { ascending: false }),
    supabase.from('customers').select('id, name').order('name'),
    supabase.from('work_orders').select('id, status, customers(name), vehicles(plate, make_model)').order('created_at', { ascending: false }).limit(25),
  ]);

  const quotations = (quotesResult.data ?? []) as unknown as Quotation[];
  const customers = (customersResult.data ?? []) as Array<{ id: string; name: string }>;
  const workOrders = (ordersResult.data ?? []) as unknown as Array<{ id: string; status: string; customers: Related<{ name: string }>; vehicles: Related<{ plate: string; make_model: string }> }>;
  const actionError = params.error;
  const workOrderOptions = workOrders.map((order) => {
    const customer = firstRelated(order.customers);
    const vehicle = firstRelated(order.vehicles);

    return {
      id: order.id,
      label: `${customer?.name ?? 'Cliente'} - ${vehicle?.plate ?? 'Sin placa'} - ${vehicle?.make_model ?? 'Vehiculo'} - ${order.status}`,
    };
  });
  const error = quotesResult.error ?? customersResult.error ?? ordersResult.error;

  return (
    <div className="p-4 md:p-8">
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">Cotizaciones</h1>
          <p className="text-slate-500">Construye presupuestos detallados por trabajos, repuestos, cantidades y precios.</p>
        </div>
      </div>

      <Card className="mb-6 border-0 shadow-sm">
        <CardContent className="p-5">
          {actionError && (
            <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
              {actionError}
            </div>
          )}
          <div className="mb-5 flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-blue-600">Nueva cotizacion</p>
              <h2 className="mt-1 text-xl font-black text-slate-950">Detalle de trabajos y repuestos</h2>
              <p className="mt-1 text-sm text-slate-500">Agrega cada cambio, reparacion o repuesto como renglon independiente para que el cliente entienda exactamente que se le va a hacer al vehiculo.</p>
            </div>
            <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <span className="font-bold text-slate-900">Ejemplo:</span> Cambio 1 aceite, cambio 2 filtro, mano de obra, repuestos.
            </div>
          </div>
          <QuotationBuilder customers={customers} workOrders={workOrderOptions} />
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Buscar por cliente o placa..." className="w-full rounded-md border border-slate-300 py-2 pl-10 pr-4 outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="mb-6 border-amber-200 bg-amber-50">
          <CardContent className="p-4 text-sm text-amber-800">{error.message}</CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {quotations.map((quote) => (
          <Card key={quote.id}>
            <CardContent className="p-6">
              {(() => {
                const customer = firstRelated(quote.customers);
                const workOrder = firstRelated(quote.work_orders);
                const vehicle = firstRelated(workOrder?.vehicles ?? null);
                const items = quote.quotation_items ?? [];

                return (
                  <>
              <div className="flex flex-col justify-between gap-6 md:flex-row">
                <div className="flex-1">
                  <div className="mb-4 flex items-start justify-between">
                    <div>
                      <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800">
                        <FileText className="h-5 w-5 text-blue-600" />
                        {customer?.name ?? 'Cliente'}
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        {vehicle?.make_model ?? 'Vehiculo'} - {vehicle?.plate ?? 'Sin placa'}
                      </p>
                    </div>
                    <span className="rounded bg-slate-100 px-3 py-1 text-xs font-bold uppercase text-slate-700">{quote.status}</span>
                  </div>

                      <div className="divide-y divide-slate-100 rounded-lg border border-slate-100">
                    {items.map((item, index) => (
                      <div key={item.id} className="grid gap-2 p-3 text-sm md:grid-cols-[42px_1fr_90px_120px] md:items-center">
                        <span className="flex h-7 w-7 items-center justify-center rounded bg-blue-50 text-xs font-black text-blue-700">{index + 1}</span>
                        <span className="font-medium text-slate-700">{item.description}</span>
                        <span className="text-slate-500">Cant. {Number(item.quantity).toLocaleString('es-CO')}</span>
                        <span className="text-right font-bold text-slate-800">${Number(item.total).toLocaleString('es-CO')}</span>
                      </div>
                    ))}
                    {items.length === 0 && <div className="p-3 text-sm text-slate-500">Sin items registrados.</div>}
                  </div>
                </div>

                <div className="w-full md:w-64">
                  <div className="space-y-2 rounded-lg bg-slate-50 p-4">
                    <div className="flex justify-between text-sm text-slate-500">
                      <span>Subtotal</span>
                      <span>${Number(quote.subtotal).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-slate-500">
                      <span>IVA aplicado</span>
                      <span>${Number(quote.taxes).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-200 pt-2 text-lg font-bold text-slate-800">
                      <span>Total</span>
                      <span>${Number(quote.total).toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="mt-6 flex gap-2">
                    {quote.status === 'Pendiente' ? (
                      <>
                        <form action={updateQuotationStatus} className="flex-1">
                          <input type="hidden" name="quotationId" value={quote.id} />
                          <input type="hidden" name="status" value="Aprobado" />
                          <button className="flex w-full items-center justify-center gap-1 rounded-md bg-green-50 px-3 py-1.5 text-sm font-medium text-green-700">
                          <CheckCircle className="h-4 w-4" />
                          Aprobar
                          </button>
                        </form>
                        <form action={updateQuotationStatus} className="flex-1">
                          <input type="hidden" name="quotationId" value={quote.id} />
                          <input type="hidden" name="status" value="Rechazado" />
                          <button className="flex w-full items-center justify-center gap-1 rounded-md bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700">
                          <XCircle className="h-4 w-4" />
                          Rechazar
                          </button>
                        </form>
                      </>
                    ) : (
                      <Link href={`/documents/quotation/${quote.id}`} className="flex w-full items-center justify-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-white">
                        <FileEdit className="h-4 w-4" />
                        Ver / imprimir
                      </Link>
                    )}
                  </div>
                  {quote.status === 'Pendiente' && (
                    <Link href={`/documents/quotation/${quote.id}`} className="mt-2 flex w-full items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">
                      <FileEdit className="h-4 w-4" />
                      Ver / imprimir
                    </Link>
                  )}
                </div>
              </div>
                  </>
                );
              })()}
            </CardContent>
          </Card>
        ))}
      </div>

      {quotations.length === 0 && <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">No hay cotizaciones registradas.</div>}
    </div>
  );
}
