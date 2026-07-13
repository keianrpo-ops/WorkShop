import { Card, CardContent } from '@/components/ui/card';
import { updateCustomer, updateCustomerVehicle } from '@/lib/actions';
import { firstRelated, type Related } from '@/lib/relations';
import { isMissingColumn, supabase } from '@/lib/supabase';
import { Calendar, CarFront, ExternalLink, FileText, Mail, MessageSquare, Phone, PlusCircle, ReceiptText, Save, Users, Wrench } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';
const CUSTOMER_PAGE_LIMIT = 200;
const CUSTOMER_HISTORY_LIMIT = 300;

type CustomerRow = {
  id: string;
  source_ids?: string[];
  name: string;
  document_number: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  created_at: string;
  vehicles: {
    id?: string;
    plate: string;
    make_model: string;
    type?: string | null;
    year?: number | null;
    mileage?: number | null;
    primary_image_url?: string | null;
    condition_status?: string | null;
    vehicle_photos?: Related<{ photo_url: string }>;
  }[];
  work_orders?: CustomerWorkOrder[];
  sales?: CustomerSale[];
  quotations?: CustomerQuotation[];
};

type CustomerWorkOrder = {
  id: string;
  customer_id: string | null;
  status: string;
  created_at: string;
  issue_description: string | null;
  diagnosis_summary?: string | null;
  total_amount?: number | null;
  vehicles?: Related<{ plate: string; make_model: string }>;
};

type CustomerSale = {
  id: string;
  customer_id: string | null;
  folio: string;
  payment_method: string | null;
  total: number;
  created_at: string;
};

type CustomerQuotation = {
  id: string;
  customer_id: string | null;
  status: string;
  total: number;
  created_at: string;
};

async function getCustomers() {
  let result: Awaited<ReturnType<typeof supabase.from>> | any = await supabase
    .from('customers')
    .select('id, name, document_number, email, phone, notes, created_at, vehicles(id, plate, make_model, type, year, mileage, primary_image_url, condition_status)')
    .order('created_at', { ascending: false })
    .limit(CUSTOMER_PAGE_LIMIT);

  if (isMissingColumn(result.error, 'document_number')) {
    result = await supabase
      .from('customers')
      .select('id, name, email, phone, notes, created_at, vehicles(id, plate, make_model, type, year, mileage, primary_image_url, condition_status)')
      .order('created_at', { ascending: false })
      .limit(CUSTOMER_PAGE_LIMIT);
  }

  if (isMissingColumn(result.error, 'primary_image_url')) {
    result = await supabase
      .from('customers')
      .select('id, name, email, phone, notes, created_at, vehicles(id, plate, make_model, type, year, mileage, condition_status, vehicle_photos(photo_url))')
      .order('created_at', { ascending: false })
      .limit(CUSTOMER_PAGE_LIMIT);
  }

  if (result.error) {
    result = await supabase
      .from('customers')
      .select('id, name, email, phone, notes, created_at, vehicles(id, plate, make_model, type, year, mileage)')
      .order('created_at', { ascending: false })
      .limit(CUSTOMER_PAGE_LIMIT);
  }

  const { data, error } = result;

  if (error) {
    return { customers: [] as CustomerRow[], error: error.message };
  }

  const customers = ((data ?? []) as CustomerRow[]).map((customer) => ({
    ...customer,
    source_ids: [customer.id],
    work_orders: [],
    sales: [],
    quotations: [],
  }));

  await attachCustomerHistory(customers);

  return { customers: mergeDuplicateCustomers(customers), error: null };
}

async function attachCustomerHistory(customers: CustomerRow[]) {
  const customerIds = customers.map((customer) => customer.id);
  if (customerIds.length === 0) return;

  const byId = new Map(customers.map((customer) => [customer.id, customer]));

  let ordersResult: Awaited<ReturnType<typeof supabase.from>> | any = await supabase
    .from('work_orders')
    .select('id, customer_id, status, created_at, issue_description, diagnosis_summary, total_amount, vehicles(plate, make_model)')
    .in('customer_id', customerIds)
    .order('created_at', { ascending: false })
    .limit(CUSTOMER_HISTORY_LIMIT);

  if (ordersResult.error) {
    ordersResult = await supabase
      .from('work_orders')
      .select('id, customer_id, status, created_at, issue_description, total_amount')
      .in('customer_id', customerIds)
      .order('created_at', { ascending: false })
      .limit(CUSTOMER_HISTORY_LIMIT);
  }

  for (const order of ((ordersResult.data ?? []) as CustomerWorkOrder[])) {
    const customer = order.customer_id ? byId.get(order.customer_id) : null;
    if (customer) customer.work_orders = [...(customer.work_orders ?? []), order];
  }

  const salesResult = await supabase
    .from('sales')
    .select('id, customer_id, folio, payment_method, total, created_at')
    .in('customer_id', customerIds)
    .order('created_at', { ascending: false })
    .limit(CUSTOMER_HISTORY_LIMIT);

  if (!salesResult.error) {
    for (const sale of ((salesResult.data ?? []) as CustomerSale[])) {
      const customer = sale.customer_id ? byId.get(sale.customer_id) : null;
      if (customer) customer.sales = [...(customer.sales ?? []), sale];
    }
  }

  const quotationsResult = await supabase
    .from('quotations')
    .select('id, customer_id, status, total, created_at')
    .in('customer_id', customerIds)
    .order('created_at', { ascending: false })
    .limit(CUSTOMER_HISTORY_LIMIT);

  if (!quotationsResult.error) {
    for (const quotation of ((quotationsResult.data ?? []) as CustomerQuotation[])) {
      const customer = quotation.customer_id ? byId.get(quotation.customer_id) : null;
      if (customer) customer.quotations = [...(customer.quotations ?? []), quotation];
    }
  }
}

function normalizePhone(phone: string | null) {
  const digits = (phone ?? '').replace(/\D/g, '');
  if (!digits) return null;
  if (digits.length === 12 && digits.startsWith('57')) return digits.slice(2);
  return digits;
}

function normalizeDocument(customer: CustomerRow) {
  const fromNotes = customer.notes?.match(/Documento:\s*([A-Za-z0-9.-]+)/i)?.[1] ?? null;
  return (customer.document_number ?? fromNotes ?? '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase() || null;
}

function customerIdentityKeys(customer: CustomerRow) {
  return [
    normalizeDocument(customer) ? `document:${normalizeDocument(customer)}` : null,
    customer.email ? `email:${customer.email.trim().toLowerCase()}` : null,
    normalizePhone(customer.phone) ? `phone:${normalizePhone(customer.phone)}` : null,
  ].filter((key): key is string => Boolean(key));
}

function mergeVehicles(left: CustomerRow['vehicles'], right: CustomerRow['vehicles']) {
  const map = new Map<string, CustomerRow['vehicles'][number]>();

  for (const vehicle of [...left, ...right]) {
    const key = vehicle.plate?.trim().toUpperCase() || vehicle.make_model;
    const current = map.get(key);
    map.set(key, {
      ...vehicle,
      primary_image_url: current?.primary_image_url ?? vehicle.primary_image_url,
      condition_status: current?.condition_status ?? vehicle.condition_status,
      vehicle_photos: current?.vehicle_photos ?? vehicle.vehicle_photos,
    });
  }

  return [...map.values()];
}

function mergeCustomer(base: CustomerRow, next: CustomerRow): CustomerRow {
  return {
    ...base,
    source_ids: [...new Set([...(base.source_ids ?? [base.id]), ...(next.source_ids ?? [next.id])])],
    name: base.name || next.name,
    document_number: base.document_number ?? normalizeDocument(base) ?? next.document_number ?? normalizeDocument(next),
    email: base.email ?? next.email,
    phone: base.phone ?? next.phone,
    notes: base.notes ?? next.notes,
    created_at: new Date(base.created_at) < new Date(next.created_at) ? base.created_at : next.created_at,
    vehicles: mergeVehicles(base.vehicles ?? [], next.vehicles ?? []),
    work_orders: [...(base.work_orders ?? []), ...(next.work_orders ?? [])].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    sales: [...(base.sales ?? []), ...(next.sales ?? [])].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    quotations: [...(base.quotations ?? []), ...(next.quotations ?? [])].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
  };
}

function mergeDuplicateCustomers(customers: CustomerRow[]) {
  const groups: CustomerRow[] = [];
  const keyToIndex = new Map<string, number>();

  for (const customer of customers) {
    const normalizedCustomer = {
      ...customer,
      document_number: customer.document_number ?? normalizeDocument(customer),
      email: customer.email?.trim().toLowerCase() || null,
      phone: normalizePhone(customer.phone),
      vehicles: customer.vehicles ?? [],
      work_orders: customer.work_orders ?? [],
      sales: customer.sales ?? [],
      quotations: customer.quotations ?? [],
      source_ids: customer.source_ids ?? [customer.id],
    };
    const keys = customerIdentityKeys(normalizedCustomer);
    const existingIndex = keys.map((key) => keyToIndex.get(key)).find((index) => index !== undefined);

    if (existingIndex === undefined) {
      const index = groups.length;
      groups.push(normalizedCustomer);
      keys.forEach((key) => keyToIndex.set(key, index));
      continue;
    }

    groups[existingIndex] = mergeCustomer(groups[existingIndex], normalizedCustomer);
    customerIdentityKeys(groups[existingIndex]).forEach((key) => keyToIndex.set(key, existingIndex));
  }

  return groups;
}

const formatCOP = (value: number | null | undefined) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('es-CO');
}

function receptionHref(customer: CustomerRow, vehicle?: CustomerRow['vehicles'][number]) {
  const params = new URLSearchParams();
  params.set('customerName', customer.name);
  if (customer.phone) params.set('phone', customer.phone);
  if (customer.email) params.set('email', customer.email);
  if (vehicle?.plate) params.set('plate', vehicle.plate);
  if (vehicle?.make_model) params.set('makeModel', vehicle.make_model);
  if (vehicle?.type) params.set('vehicleType', vehicle.type);
  if (vehicle?.year) params.set('year', String(vehicle.year));
  if (vehicle?.mileage) params.set('mileage', String(vehicle.mileage));
  return `/reception?${params.toString()}`;
}

export default async function CustomersPage({ searchParams }: { searchParams?: Promise<{ error?: string; updated?: string }> }) {
  const params = searchParams ? await searchParams : {};
  const { customers, error } = await getCustomers();

  return (
    <div className="p-4 md:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-800">Directorio de Clientes</h1>
        <p className="text-slate-500">Historial, datos de contacto y vehiculos asociados.</p>
      </div>

      {params.updated && (
        <Card className="mb-6 border-green-200 bg-green-50">
          <CardContent className="p-4 text-sm font-semibold text-green-800">Cliente actualizado correctamente.</CardContent>
        </Card>
      )}

      {params.error && (
        <Card className="mb-6 border-amber-200 bg-amber-50">
          <CardContent className="p-4 text-sm font-semibold text-amber-800">{params.error}</CardContent>
        </Card>
      )}

      {error && (
        <Card className="mb-6 border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <p className="font-bold text-amber-900">Supabase todavia no devolvio clientes.</p>
            <p className="mt-1 text-sm text-amber-800">Revisa que la migracion de columnas y politicas este aplicada.</p>
            <p className="mt-2 text-xs font-mono text-amber-700">{error}</p>
          </CardContent>
        </Card>
      )}

      {!error && customers.length === 0 && (
        <Card className="mb-6 border-slate-200 bg-white">
          <CardContent className="p-6 text-center">
            <Users className="mx-auto mb-3 h-8 w-8 text-slate-400" />
            <p className="font-bold text-slate-800">No hay clientes registrados.</p>
            <p className="mt-1 text-sm text-slate-500">Cuando guardemos el primer ingreso, aparecera aqui.</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {customers.map((customer) => (
          <Card key={customer.id} className="transition-shadow hover:shadow-md">
            <CardContent className="p-6">
              <div className="mb-4 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-lg font-bold text-blue-600">
                    {customer.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold leading-tight text-slate-800">{customer.name}</h3>
                    <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                      <Calendar className="h-3 w-3" />
                      Registrado: {new Date(customer.created_at).toLocaleDateString('es-ES')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mb-4 space-y-3">
                <div className="flex justify-between gap-4 text-sm">
                  <span className="flex items-center gap-2 text-slate-500">
                    <Phone className="h-4 w-4" />
                    Telefono
                  </span>
                  <span className="text-right font-medium text-slate-800">{customer.phone ?? 'Sin telefono'}</span>
                </div>
                <div className="flex justify-between gap-4 text-sm">
                  <span className="flex items-center gap-2 text-slate-500">
                    <Mail className="h-4 w-4" />
                    Email
                  </span>
                  <span className="text-right font-medium text-slate-800">{customer.email ?? 'Sin correo'}</span>
                </div>
                <div className="flex justify-between gap-4 text-sm">
                  <span className="flex items-center gap-2 text-slate-500">
                    <MessageSquare className="h-4 w-4" />
                    Documento
                  </span>
                  <span className="text-right font-medium text-slate-800">{customer.document_number ?? 'Sin documento'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-2 text-slate-500">
                    <CarFront className="h-4 w-4" />
                    Vehiculos
                  </span>
                  <span className="font-medium text-slate-800">{customer.vehicles.length}</span>
                </div>
              </div>

              <div className="mb-4 rounded-md border border-slate-100 bg-slate-50 p-3">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Matriculas
                  </p>
                  <Link
                    href={receptionHref(customer)}
                    className="inline-flex items-center gap-1 rounded bg-blue-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-blue-700"
                  >
                    <PlusCircle className="h-3.5 w-3.5" />
                    Agregar vehiculo
                  </Link>
                </div>

                {customer.vehicles.length === 0 && (
                  <p className="rounded-md border border-dashed border-slate-200 bg-white p-3 text-center text-xs text-slate-500">
                    Este cliente aun no tiene vehiculos. Puedes crear uno desde recepcion.
                  </p>
                )}

                <div className="space-y-2">
                  {customer.vehicles.map((vehicle) => {
                    const imageUrl = vehicle.primary_image_url ?? firstRelated(vehicle.vehicle_photos ?? null)?.photo_url;

                    return (
                      <details key={vehicle.id ?? vehicle.plate} className="rounded-md border border-slate-200 bg-white">
                        <summary className="flex cursor-pointer list-none items-center gap-2 px-2.5 py-2 text-xs text-slate-700 marker:hidden">
                          {imageUrl && (
                            <span
                              className="h-9 w-9 flex-shrink-0 rounded bg-slate-100 bg-cover bg-center"
                              style={{ backgroundImage: `url(${imageUrl})` }}
                            />
                          )}
                          <span className="min-w-0 flex-1">
                            <span className="block font-mono font-bold">{vehicle.plate}</span>
                            <span className="block truncate text-[10px] text-slate-400">
                              {vehicle.make_model} - {vehicle.condition_status ?? 'Registrado'}
                            </span>
                          </span>
                          <span className="rounded bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700">Editar</span>
                        </summary>

                        <div className="border-t border-slate-100 p-3">
                          {vehicle.id ? (
                            <form action={updateCustomerVehicle} className="grid gap-2">
                              <input type="hidden" name="vehicleId" value={vehicle.id} />
                              <input type="hidden" name="customerId" value={customer.id} />
                              <div className="grid grid-cols-2 gap-2">
                                <label className="grid gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                  Placa
                                  <input name="plate" required defaultValue={vehicle.plate} className="rounded border border-slate-300 px-2 py-1.5 text-xs font-normal uppercase text-slate-900" />
                                </label>
                                <label className="grid gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                  Tipo
                                  <input name="vehicleType" list="customer-vehicle-types" defaultValue={vehicle.type ?? 'Carro'} className="rounded border border-slate-300 px-2 py-1.5 text-xs font-normal normal-case text-slate-900" />
                                </label>
                              </div>
                              <label className="grid gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                Marca y modelo
                                <input name="makeModel" required defaultValue={vehicle.make_model} className="rounded border border-slate-300 px-2 py-1.5 text-xs font-normal normal-case text-slate-900" />
                              </label>
                              <div className="grid grid-cols-2 gap-2">
                                <label className="grid gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                  Ano
                                  <input name="year" type="number" defaultValue={vehicle.year ?? ''} className="rounded border border-slate-300 px-2 py-1.5 text-xs font-normal text-slate-900" />
                                </label>
                                <label className="grid gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                  Kilometraje
                                  <input name="mileage" type="number" defaultValue={vehicle.mileage ?? ''} className="rounded border border-slate-300 px-2 py-1.5 text-xs font-normal text-slate-900" />
                                </label>
                              </div>
                              <label className="grid gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                Estado
                                <input name="conditionStatus" defaultValue={vehicle.condition_status ?? 'Registrado'} className="rounded border border-slate-300 px-2 py-1.5 text-xs font-normal normal-case text-slate-900" />
                              </label>
                              <button className="inline-flex items-center justify-center gap-2 rounded bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700">
                                <Save className="h-3.5 w-3.5" />
                                Guardar vehiculo
                              </button>
                            </form>
                          ) : (
                            <p className="rounded border border-amber-100 bg-amber-50 p-2 text-xs font-semibold text-amber-800">
                              Este registro no devolvio ID del vehiculo. Revisa permisos RLS o vuelve a abrir la pagina.
                            </p>
                          )}

                          <div className="mt-2 grid grid-cols-2 gap-2">
                            <Link href={receptionHref(customer, vehicle)} className="inline-flex items-center justify-center gap-1 rounded bg-slate-100 px-2 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200">
                              <PlusCircle className="h-3.5 w-3.5" />
                              Nueva entrada
                            </Link>
                            <Link href="/board" className="inline-flex items-center justify-center gap-1 rounded bg-slate-900 px-2 py-1.5 text-xs font-bold text-white hover:bg-slate-800">
                              <ExternalLink className="h-3.5 w-3.5" />
                              Tablero
                            </Link>
                          </div>
                        </div>
                      </details>
                    );
                  })}
                </div>
                <datalist id="customer-vehicle-types">
                  <option value="Carro" />
                  <option value="Moto" />
                  <option value="Camioneta" />
                  <option value="Taxi" />
                  <option value="Campero" />
                  <option value="Van" />
                  <option value="Camion" />
                  <option value="Buseta" />
                  <option value="Motocarro" />
                </datalist>
              </div>

              {customer.notes && !/^Documento:/i.test(customer.notes.trim()) && (
                <div className="mb-4 flex items-start gap-2 rounded-md border border-yellow-100 bg-yellow-50 p-3 text-sm italic text-slate-600">
                  <MessageSquare className="mt-0.5 h-4 w-4 flex-shrink-0 text-yellow-600" />
                  {customer.notes}
                </div>
              )}

              <div className="space-y-3 border-t border-slate-100 pt-4">
                <details className="rounded-lg border border-slate-200 bg-slate-50">
                  <summary className="cursor-pointer px-3 py-2 text-sm font-bold text-slate-800">Editar cliente</summary>
                  <form action={updateCustomer} className="grid gap-2 border-t border-slate-200 p-3">
                    <input type="hidden" name="customerId" value={customer.id} />
                    <label className="grid gap-1 text-xs font-bold uppercase tracking-wider text-slate-500">
                      Nombre
                      <input name="name" required defaultValue={customer.name} className="rounded border border-slate-300 px-3 py-2 text-sm font-normal normal-case tracking-normal text-slate-900" />
                    </label>
                    <label className="grid gap-1 text-xs font-bold uppercase tracking-wider text-slate-500">
                      Documento / Cedula
                      <input name="documentNumber" defaultValue={customer.document_number ?? ''} className="rounded border border-slate-300 px-3 py-2 text-sm font-normal normal-case tracking-normal text-slate-900" />
                    </label>
                    <label className="grid gap-1 text-xs font-bold uppercase tracking-wider text-slate-500">
                      WhatsApp
                      <input name="phone" defaultValue={customer.phone ?? ''} className="rounded border border-slate-300 px-3 py-2 text-sm font-normal normal-case tracking-normal text-slate-900" />
                    </label>
                    <label className="grid gap-1 text-xs font-bold uppercase tracking-wider text-slate-500">
                      Correo
                      <input name="email" type="email" defaultValue={customer.email ?? ''} className="rounded border border-slate-300 px-3 py-2 text-sm font-normal normal-case tracking-normal text-slate-900" />
                    </label>
                    <label className="grid gap-1 text-xs font-bold uppercase tracking-wider text-slate-500">
                      Notas
                      <textarea name="notes" defaultValue={!customer.notes || /^Documento:/i.test(customer.notes.trim()) ? '' : customer.notes} className="min-h-20 rounded border border-slate-300 px-3 py-2 text-sm font-normal normal-case tracking-normal text-slate-900" />
                    </label>
                    <button className="mt-1 inline-flex items-center justify-center gap-2 rounded bg-blue-600 px-3 py-2 text-sm font-bold text-white hover:bg-blue-700">
                      <Save className="h-4 w-4" />
                      Guardar cambios
                    </button>
                  </form>
                </details>

                <details className="rounded-lg border border-slate-200 bg-white">
                  <summary className="cursor-pointer px-3 py-2 text-sm font-bold text-slate-800">Ver historial</summary>
                  <div className="space-y-4 border-t border-slate-200 p-3">
                    <div>
                      <p className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500">
                        <Wrench className="h-4 w-4" />
                        Ordenes de trabajo
                      </p>
                      <div className="space-y-2">
                        {(customer.work_orders ?? []).map((order) => {
                          const vehicle = firstRelated(order.vehicles ?? null);

                          return (
                            <Link key={order.id} href="/board" className="block rounded-md border border-slate-100 bg-slate-50 p-2 text-xs hover:bg-white">
                              <span className="flex justify-between gap-2 font-bold text-slate-800">
                                <span>{vehicle?.plate ?? 'Sin placa'} {vehicle?.make_model ? `- ${vehicle.make_model}` : ''}</span>
                                <span>{order.status}</span>
                              </span>
                              <span className="mt-1 block text-slate-500">{formatDate(order.created_at)} - {order.issue_description ?? order.diagnosis_summary ?? 'Sin descripcion'}</span>
                              <span className="mt-1 block font-bold text-slate-700">{formatCOP(order.total_amount)}</span>
                            </Link>
                          );
                        })}
                        {(customer.work_orders ?? []).length === 0 && <p className="rounded-md border border-dashed border-slate-200 p-3 text-center text-xs text-slate-500">Sin ordenes registradas.</p>}
                      </div>
                    </div>

                    <div>
                      <p className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500">
                        <ReceiptText className="h-4 w-4" />
                        Ventas
                      </p>
                      <div className="space-y-2">
                        {(customer.sales ?? []).map((sale) => (
                          <Link key={sale.id} href={`/documents/sale/${sale.id}`} className="flex justify-between rounded-md border border-slate-100 bg-slate-50 p-2 text-xs hover:bg-white">
                            <span>
                              <span className="block font-bold text-slate-800">{sale.folio}</span>
                              <span className="block text-slate-500">{formatDate(sale.created_at)} - {sale.payment_method ?? 'Pago'}</span>
                            </span>
                            <span className="font-black text-slate-900">{formatCOP(sale.total)}</span>
                          </Link>
                        ))}
                        {(customer.sales ?? []).length === 0 && <p className="rounded-md border border-dashed border-slate-200 p-3 text-center text-xs text-slate-500">Sin ventas registradas.</p>}
                      </div>
                    </div>

                    <div>
                      <p className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500">
                        <FileText className="h-4 w-4" />
                        Cotizaciones
                      </p>
                      <div className="space-y-2">
                        {(customer.quotations ?? []).map((quote) => (
                          <Link key={quote.id} href={`/documents/quotation/${quote.id}`} className="flex justify-between rounded-md border border-slate-100 bg-slate-50 p-2 text-xs hover:bg-white">
                            <span>
                              <span className="block font-bold text-slate-800">COT-{quote.id.slice(0, 8).toUpperCase()}</span>
                              <span className="block text-slate-500">{formatDate(quote.created_at)} - {quote.status}</span>
                            </span>
                            <span className="font-black text-slate-900">{formatCOP(quote.total)}</span>
                          </Link>
                        ))}
                        {(customer.quotations ?? []).length === 0 && <p className="rounded-md border border-dashed border-slate-200 p-3 text-center text-xs text-slate-500">Sin cotizaciones registradas.</p>}
                      </div>
                    </div>
                  </div>
                </details>

                {customer.phone ? (
                  <a
                    href={`https://wa.me/57${normalizePhone(customer.phone)}`}
                    target="_blank"
                    className="block rounded bg-blue-50 py-2 text-center text-sm font-medium text-blue-600 transition-colors hover:bg-blue-100"
                  >
                    WhatsApp
                  </a>
                ) : (
                  <span className="block rounded bg-slate-100 py-2 text-center text-sm font-medium text-slate-400">
                    WhatsApp sin telefono
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
