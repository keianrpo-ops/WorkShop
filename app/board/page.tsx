import { Card, CardContent } from '@/components/ui/card';
import { SubmitButton } from '@/components/SubmitButton';
import { VehiclePhotoUploader } from '@/components/VehiclePhotoUploader';
import { assignWorkOrder, deleteWorkOrder, unassignWorkOrder, updateWorkOrderDetails, updateWorkOrderStatus } from '@/lib/actions';
import { firstRelated, type Related } from '@/lib/relations';
import { isMissingColumn, supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { CarFront, ClipboardCheck, Clock, Pencil, Trash2, UserMinus } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const ACTIVE_COLUMNS = ['Recibido', 'Diagnostico', 'Presupuesto pendiente', 'Aprobacion pendiente', 'Aprobado', 'En reparacion', 'Esperando repuestos', 'Listo', 'Entregado'];
const WORKFLOW_STATUSES = [...ACTIVE_COLUMNS, 'Cancelado'];
const DIAGNOSIS_INDEX = ACTIVE_COLUMNS.indexOf('Diagnostico');
const VEHICLE_PROFILE_COLUMNS = [
  'vin',
  'color',
  'fuel_type',
  'transmission',
  'engine',
  'oil_type',
  'last_oil_change_mileage',
  'last_oil_change_date',
  'next_oil_change_mileage',
  'next_oil_change_date',
  'battery_status',
  'tire_status',
  'brake_status',
  'soat_expiration',
  'technical_review_expiration',
  'maintenance_notes',
] as const;
const VEHICLE_PROFILE_SELECT = VEHICLE_PROFILE_COLUMNS.join(', ');
const VEHICLE_SELECT_WITH_IMAGE = `id, plate, make_model, type, year, mileage, primary_image_url, condition_status, ${VEHICLE_PROFILE_SELECT}, vehicle_photos(id, photo_url, label, created_at)`;
const VEHICLE_SELECT_NO_IMAGE = `id, plate, make_model, type, year, mileage, condition_status, ${VEHICLE_PROFILE_SELECT}, vehicle_photos(id, photo_url, label, created_at)`;
const VEHICLE_SELECT_LEGACY_WITH_IMAGE = 'id, plate, make_model, type, year, mileage, primary_image_url, condition_status, vehicle_photos(id, photo_url, label, created_at)';
const VEHICLE_SELECT_LEGACY_NO_IMAGE = 'id, plate, make_model, type, year, mileage, condition_status, vehicle_photos(id, photo_url, label, created_at)';

function statusNeedsMechanic(status: string) {
  if (status === 'Cancelado') return false;
  if (status === 'Entregado') return true;
  const index = ACTIVE_COLUMNS.indexOf(status);
  return index === -1 || index > DIAGNOSIS_INDEX;
}

function missingSchemaRelation(error: { message?: string } | null | undefined) {
  return Boolean(error?.message && (error.message.includes('Could not find') || error.message.includes('schema cache')));
}

function missingVehicleProfileColumn(error: { message?: string } | null | undefined) {
  return VEHICLE_PROFILE_COLUMNS.some((column) => isMissingColumn(error, column));
}

function relatedList<T>(value: Related<T> | undefined | null): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

type WorkOrder = {
  id: string;
  created_at?: string | null;
  status: string;
  vehicle_condition?: string | null;
  issue_description: string | null;
  diagnosis_summary?: string | null;
  estimated_delivery: string | null;
  estimated_hours: number;
  hours_spent: number;
  total_amount: number;
  labor_revenue?: number | null;
  parts_revenue?: number | null;
  parts_cost?: number | null;
  labor_cost?: number | null;
  commission_cost?: number | null;
  customers: Related<{ id: string; name: string; phone?: string | null; email?: string | null }>;
  vehicles: Related<{
    id: string;
    plate: string;
    make_model: string;
    type: string;
    year?: number | null;
    mileage?: number | null;
    primary_image_url?: string | null;
    condition_status?: string | null;
    vin?: string | null;
    color?: string | null;
    fuel_type?: string | null;
    transmission?: string | null;
    engine?: string | null;
    oil_type?: string | null;
    last_oil_change_mileage?: number | null;
    last_oil_change_date?: string | null;
    next_oil_change_mileage?: number | null;
    next_oil_change_date?: string | null;
    battery_status?: string | null;
    tire_status?: string | null;
    brake_status?: string | null;
    soat_expiration?: string | null;
    technical_review_expiration?: string | null;
    maintenance_notes?: string | null;
    vehicle_photos?: Related<{ id?: string; photo_url: string; label?: string | null; created_at?: string | null }>;
  }>;
  mechanics: Related<{ id: string; name: string }>;
  diagnostics?: BoardDiagnosis[];
};

type BoardDiagnosis = {
  id: string;
  work_order_id: string;
  vehicle_condition?: string | null;
  diagnosis: string;
  damage_description?: string | null;
  severity?: string | null;
  recommended_specialty?: string | null;
  recommended_work?: string | null;
  estimated_hours?: number | null;
  created_at?: string | null;
  mechanics?: Related<{ id: string; name: string; specialty?: string | null }>;
};

type Mechanic = {
  id: string;
  name: string;
  role: string | null;
  employment_status?: string | null;
};

async function getBoardData() {
  let ordersResult: Awaited<ReturnType<typeof supabase.from>> | any = await supabase
    .from('work_orders')
    .select(`id, created_at, status, vehicle_condition, issue_description, diagnosis_summary, estimated_delivery, estimated_hours, hours_spent, total_amount, labor_revenue, parts_revenue, parts_cost, labor_cost, commission_cost, customers(id, name, phone, email), vehicles(${VEHICLE_SELECT_WITH_IMAGE}), mechanics(id, name)`)
    .neq('status', 'Cancelado')
    .order('created_at', { ascending: false });

  if (isMissingColumn(ordersResult.error, 'primary_image_url')) {
    ordersResult = await supabase
      .from('work_orders')
      .select(`id, created_at, status, vehicle_condition, issue_description, diagnosis_summary, estimated_delivery, estimated_hours, hours_spent, total_amount, labor_revenue, parts_revenue, parts_cost, labor_cost, commission_cost, customers(id, name, phone, email), vehicles(${VEHICLE_SELECT_NO_IMAGE}), mechanics(id, name)`)
      .neq('status', 'Cancelado')
      .order('created_at', { ascending: false });
  }

  if (missingVehicleProfileColumn(ordersResult.error)) {
    ordersResult = await supabase
      .from('work_orders')
      .select(`id, created_at, status, vehicle_condition, issue_description, diagnosis_summary, estimated_delivery, estimated_hours, hours_spent, total_amount, labor_revenue, parts_revenue, parts_cost, labor_cost, commission_cost, customers(id, name, phone, email), vehicles(${VEHICLE_SELECT_LEGACY_WITH_IMAGE}), mechanics(id, name)`)
      .neq('status', 'Cancelado')
      .order('created_at', { ascending: false });

    if (isMissingColumn(ordersResult.error, 'primary_image_url')) {
      ordersResult = await supabase
        .from('work_orders')
        .select(`id, created_at, status, vehicle_condition, issue_description, diagnosis_summary, estimated_delivery, estimated_hours, hours_spent, total_amount, labor_revenue, parts_revenue, parts_cost, labor_cost, commission_cost, customers(id, name, phone, email), vehicles(${VEHICLE_SELECT_LEGACY_NO_IMAGE}), mechanics(id, name)`)
        .neq('status', 'Cancelado')
        .order('created_at', { ascending: false });
    }
  }

  if (ordersResult.error) {
    ordersResult = await supabase
      .from('work_orders')
      .select('id, created_at, status, issue_description, estimated_delivery, estimated_hours, hours_spent, total_amount, customers(id, name, phone, email), vehicles(id, plate, make_model, type, year, mileage), mechanics(id, name)')
      .neq('status', 'Cancelado')
      .order('created_at', { ascending: false });
  }

  let mechanicsResult: Awaited<ReturnType<typeof supabase.from>> | any = await supabase
    .from('mechanics')
    .select('id, name, role, employment_status')
    .order('name');

  if (isMissingColumn(mechanicsResult.error, 'employment_status')) {
    mechanicsResult = await supabase
      .from('mechanics')
      .select('id, name, role, is_active')
      .order('name');
  }

  const mechanics = ((mechanicsResult.data ?? []) as Mechanic[]).filter((mechanic) => (
    mechanic.employment_status ? mechanic.employment_status === 'Activo' : true
  ));

  const orders = (ordersResult.data ?? []) as unknown as WorkOrder[];
  const orderIds = orders.map((order) => order.id);
  const diagnosticsByOrder = new Map<string, BoardDiagnosis[]>();

  if (orderIds.length > 0) {
    let diagnosticsResult: Awaited<ReturnType<typeof supabase.from>> | any = await supabase
      .from('work_order_diagnostics')
      .select('id, work_order_id, vehicle_condition, diagnosis, damage_description, severity, recommended_specialty, recommended_work, estimated_hours, created_at, mechanics(id, name, specialty)')
      .in('work_order_id', orderIds)
      .order('created_at', { ascending: false });

    if (
      isMissingColumn(diagnosticsResult.error, 'damage_description') ||
      isMissingColumn(diagnosticsResult.error, 'severity') ||
      isMissingColumn(diagnosticsResult.error, 'recommended_specialty') ||
      missingSchemaRelation(diagnosticsResult.error)
    ) {
      diagnosticsResult = await supabase
        .from('work_order_diagnostics')
        .select('id, work_order_id, vehicle_condition, diagnosis, recommended_work, estimated_hours, created_at')
        .in('work_order_id', orderIds)
        .order('created_at', { ascending: false });
    }

    for (const diagnosis of ((diagnosticsResult.data ?? []) as unknown as BoardDiagnosis[])) {
      const current = diagnosticsByOrder.get(diagnosis.work_order_id) ?? [];
      current.push(diagnosis);
      diagnosticsByOrder.set(diagnosis.work_order_id, current);
    }
  }

  return {
    orders: orders.map((order) => ({ ...order, diagnostics: diagnosticsByOrder.get(order.id) ?? [] })),
    mechanics,
    error: ordersResult.error?.message ?? mechanicsResult.error?.message ?? null,
  };
}

export default async function BoardPage() {
  const { orders, mechanics, error } = await getBoardData();
  const activeOrders = orders.filter((order) => order.status !== 'Cancelado');
  const visibleOrders: WorkOrder[] = [];
  const duplicateOrders: WorkOrder[] = [];
  const seenPlates = new Set<string>();

  for (const order of activeOrders) {
    const plate = firstRelated(order.vehicles)?.plate;
    if (!plate) {
      visibleOrders.push(order);
      continue;
    }

    if (seenPlates.has(plate)) {
      duplicateOrders.push(order);
      continue;
    }

    seenPlates.add(plate);
    visibleOrders.push(order);
  }

  return (
    <div className="relative flex h-[calc(100vh-4rem)] flex-col overflow-hidden bg-slate-100 p-4 md:p-6 lg:p-8">
      <div className="mb-6 flex-shrink-0 lg:hidden">
        <h1 className="text-2xl font-bold tracking-tight text-slate-800">Tablero de Trabajo</h1>
        <p className="text-slate-500">Ordenes reales creadas desde recepcion.</p>
      </div>

      {error && (
        <Card className="mb-4 border-amber-200 bg-amber-50">
          <CardContent className="p-4 text-sm text-amber-800">{error}</CardContent>
        </Card>
      )}

      {!error && orders.length === 0 && (
        <Card className="mb-4">
          <CardContent className="flex items-center justify-between gap-4 p-5">
            <div>
              <p className="font-bold text-slate-800">No hay ordenes de trabajo.</p>
              <p className="text-sm text-slate-500">Registra el primer vehiculo para iniciar el flujo.</p>
            </div>
            <Link href="/reception" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700">
              Nueva recepcion
            </Link>
          </CardContent>
        </Card>
      )}

      {duplicateOrders.length > 0 && (
        <Card className="mb-4 border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="mb-3">
              <p className="font-bold text-red-900">Hay ingresos duplicados por placa.</p>
              <p className="text-sm text-red-700">
                El tablero operativo ya muestra una sola tarjeta por placa. Elimina estos ingresos duplicados para dejar la base limpia.
              </p>
            </div>
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {duplicateOrders.map((order) => {
                const vehicle = firstRelated(order.vehicles);
                const customer = firstRelated(order.customers);

                return (
                  <form key={order.id} action={deleteWorkOrder} className="rounded border border-red-200 bg-white p-3 text-sm">
                    <input type="hidden" name="workOrderId" value={order.id} />
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <div>
                        <p className="font-mono font-bold text-slate-900">{vehicle?.plate ?? 'Sin placa'}</p>
                        <p className="text-xs text-slate-500">{vehicle?.make_model ?? 'Vehiculo'} · {customer?.name ?? 'Cliente'}</p>
                      </div>
                      <span className="rounded bg-red-100 px-2 py-0.5 text-[10px] font-bold uppercase text-red-700">{order.status}</span>
                    </div>
                    <SubmitButton pendingText="Eliminando..." className="w-full rounded bg-red-600 py-1.5 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-60">
                      Eliminar duplicado
                    </SubmitButton>
                  </form>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-1 snap-x gap-4 overflow-x-auto pb-4">
        {ACTIVE_COLUMNS.map((column) => {
          const columnOrders = visibleOrders.filter((order) => order.status === column);

          return (
            <div key={column} className="flex w-80 flex-shrink-0 snap-start flex-col">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-700">{column}</h3>
                <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600">{columnOrders.length}</span>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-2">
                {columnOrders.map((order) => (
                  <Card key={order.id} className="overflow-hidden rounded-lg border border-slate-200 shadow-sm">
                    {(() => {
                      const vehicle = firstRelated(order.vehicles);
                      const imageUrl = vehicle?.primary_image_url ?? firstRelated(vehicle?.vehicle_photos ?? null)?.photo_url;
                      return imageUrl ? <div className="h-32 border-b border-slate-100 bg-cover bg-center" style={{ backgroundImage: `url(${imageUrl})` }} /> : null;
                    })()}
                    <CardContent className="space-y-3 p-3">
                      {(() => {
                        const customer = firstRelated(order.customers);
                        const vehicle = firstRelated(order.vehicles);
                        const mechanic = firstRelated(order.mechanics);
                        const photos = relatedList(vehicle?.vehicle_photos ?? null);
                        const latestDiagnosis = order.diagnostics?.[0] ?? null;
                        const diagnosingMechanic = latestDiagnosis ? firstRelated(latestDiagnosis.mechanics) : null;
                        const revenue = Number(order.total_amount || 0) || Number(order.labor_revenue || 0) + Number(order.parts_revenue || 0);
                        const cost = Number(order.parts_cost || 0) + Number(order.labor_cost || 0) + Number(order.commission_cost || 0);
                        const profit = revenue - cost;
                        const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
                        const availableStatuses = WORKFLOW_STATUSES.filter((status) => mechanic || !statusNeedsMechanic(status));
                        const isIncoherentStatus = !mechanic && statusNeedsMechanic(order.status);

                        return (
                          <>
                      <div className="flex items-start justify-between">
                        <span className={cn('rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider', vehicle?.type === 'Moto' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700')}>
                          {vehicle?.type ?? 'Vehiculo'}
                        </span>
                        <span className="rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-500">
                          {vehicle?.plate ?? 'Sin placa'}
                        </span>
                      </div>

                      <div>
                        <h4 className="text-sm font-bold leading-tight text-slate-800">{vehicle?.make_model ?? 'Vehiculo sin detalle'}</h4>
                        <p className="mt-0.5 text-xs text-slate-500">{customer?.name ?? 'Cliente sin nombre'}</p>
                        <p className="mt-1 text-[11px] font-medium text-slate-500">
                          {vehicle?.year ? `Ano ${vehicle.year}` : 'Ano pendiente'} · {vehicle?.mileage ? `${Number(vehicle.mileage).toLocaleString('es-CO')} km` : 'Km pendiente'}
                        </p>
                        {(vehicle?.oil_type || vehicle?.next_oil_change_mileage || vehicle?.battery_status || vehicle?.tire_status || vehicle?.brake_status || vehicle?.soat_expiration || vehicle?.technical_review_expiration) && (
                          <div className="mt-2 grid grid-cols-2 gap-1 text-[10px] text-slate-600">
                            {vehicle.oil_type && <span className="rounded bg-slate-50 px-2 py-1">Aceite: {vehicle.oil_type}</span>}
                            {vehicle.next_oil_change_mileage && <span className="rounded bg-slate-50 px-2 py-1">Prox. aceite: {Number(vehicle.next_oil_change_mileage).toLocaleString('es-CO')} km</span>}
                            {vehicle.battery_status && <span className="rounded bg-slate-50 px-2 py-1">Bateria: {vehicle.battery_status}</span>}
                            {vehicle.tire_status && <span className="rounded bg-slate-50 px-2 py-1">Llantas: {vehicle.tire_status}</span>}
                            {vehicle.brake_status && <span className="rounded bg-slate-50 px-2 py-1">Frenos: {vehicle.brake_status}</span>}
                            {vehicle.soat_expiration && <span className="rounded bg-slate-50 px-2 py-1">SOAT: {vehicle.soat_expiration}</span>}
                            {vehicle.technical_review_expiration && <span className="rounded bg-slate-50 px-2 py-1">Tecnomecanica: {vehicle.technical_review_expiration}</span>}
                          </div>
                        )}
                        <p className="mt-2 rounded bg-amber-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-700">
                          Estado vehiculo: {order.vehicle_condition ?? vehicle?.condition_status ?? 'Sin estado'}
                        </p>
                        {order.issue_description && <p className="mt-2 line-clamp-2 text-xs text-slate-500">{order.issue_description}</p>}
                        {order.diagnosis_summary && (
                          <p className="mt-2 line-clamp-3 rounded border border-blue-100 bg-blue-50 p-2 text-xs text-blue-900">
                            Diagnostico: {order.diagnosis_summary}
                          </p>
                        )}
                      </div>

                      {vehicle?.id && (
                        <details className="rounded border border-slate-200 bg-white">
                          <summary className="cursor-pointer px-2 py-1.5 text-xs font-bold text-slate-700 marker:text-slate-400">
                            Historial fotografico ({photos.length})
                          </summary>
                          <div className="space-y-3 border-t border-slate-100 p-2">
                            {photos.length > 0 ? (
                              <div className="grid grid-cols-3 gap-2">
                                {photos.slice(0, 9).map((photo, index) => (
                                  <a
                                    key={photo.id ?? `${photo.photo_url}-${index}`}
                                    href={photo.photo_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="block overflow-hidden rounded border border-slate-100 bg-slate-100"
                                    title={photo.label ?? 'Foto del vehiculo'}
                                  >
                                    <span className="block aspect-square bg-cover bg-center" style={{ backgroundImage: `url(${photo.photo_url})` }} />
                                  </a>
                                ))}
                              </div>
                            ) : (
                              <p className="text-[11px] text-slate-500">Aun no hay fotos adicionales en el historial.</p>
                            )}

                            <VehiclePhotoUploader vehicleId={vehicle.id} workOrderId={order.id} label="Tablero" buttonLabel="Agregar fotos" />
                          </div>
                        </details>
                      )}

                      {customer?.id && vehicle?.id && (
                        <details className="rounded border border-slate-200 bg-white">
                          <summary className="flex cursor-pointer items-center gap-2 px-2 py-1.5 text-xs font-bold text-slate-700 marker:hidden">
                            <Pencil className="h-3.5 w-3.5 text-blue-600" />
                            Editar ingreso
                          </summary>
                          <form action={updateWorkOrderDetails} className="space-y-2 border-t border-slate-100 p-2">
                            <input type="hidden" name="workOrderId" value={order.id} />
                            <input type="hidden" name="customerId" value={customer.id} />
                            <input type="hidden" name="vehicleId" value={vehicle.id} />

                            <div className="grid grid-cols-2 gap-2">
                              <input name="customerName" defaultValue={customer.name} required placeholder="Cliente" className="rounded border border-slate-200 px-2 py-1 text-xs" />
                              <input name="phone" defaultValue={customer.phone ?? ''} placeholder="WhatsApp" className="rounded border border-slate-200 px-2 py-1 text-xs" />
                              <input name="email" defaultValue={customer.email ?? ''} type="email" placeholder="Correo" className="col-span-2 rounded border border-slate-200 px-2 py-1 text-xs" />
                              <input name="plate" defaultValue={vehicle.plate} required placeholder="Placa" className="rounded border border-slate-200 px-2 py-1 text-xs uppercase" />
                              <input name="vehicleType" defaultValue={vehicle.type ?? 'Carro'} list={`vehicle-types-${order.id}`} className="rounded border border-slate-200 px-2 py-1 text-xs" />
                              <datalist id={`vehicle-types-${order.id}`}>
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
                              <input name="year" type="number" defaultValue={vehicle.year ?? ''} placeholder="Ano" className="rounded border border-slate-200 px-2 py-1 text-xs" />
                              <input name="mileage" type="number" defaultValue={vehicle.mileage ?? ''} placeholder="Kilometraje" className="rounded border border-slate-200 px-2 py-1 text-xs" />
                              <input name="makeModel" defaultValue={vehicle.make_model} required placeholder="Marca y modelo" className="col-span-2 rounded border border-slate-200 px-2 py-1 text-xs" />
                              <input name="vin" defaultValue={vehicle.vin ?? ''} placeholder="VIN / serie" className="rounded border border-slate-200 px-2 py-1 text-xs uppercase" />
                              <input name="color" defaultValue={vehicle.color ?? ''} placeholder="Color" className="rounded border border-slate-200 px-2 py-1 text-xs" />
                              <input name="fuelType" defaultValue={vehicle.fuel_type ?? ''} placeholder="Combustible" className="rounded border border-slate-200 px-2 py-1 text-xs" />
                              <input name="transmission" defaultValue={vehicle.transmission ?? ''} placeholder="Transmision" className="rounded border border-slate-200 px-2 py-1 text-xs" />
                              <input name="engine" defaultValue={vehicle.engine ?? ''} placeholder="Motor" className="rounded border border-slate-200 px-2 py-1 text-xs" />
                              <input name="oilType" defaultValue={vehicle.oil_type ?? ''} placeholder="Aceite actual" className="rounded border border-slate-200 px-2 py-1 text-xs" />
                              <input name="lastOilChangeMileage" type="number" defaultValue={vehicle.last_oil_change_mileage ?? ''} placeholder="Ult. aceite km" className="rounded border border-slate-200 px-2 py-1 text-xs" />
                              <input name="lastOilChangeDate" type="date" defaultValue={vehicle.last_oil_change_date ?? ''} className="rounded border border-slate-200 px-2 py-1 text-xs" />
                              <input name="nextOilChangeMileage" type="number" defaultValue={vehicle.next_oil_change_mileage ?? ''} placeholder="Prox. aceite km" className="rounded border border-slate-200 px-2 py-1 text-xs" />
                              <input name="nextOilChangeDate" type="date" defaultValue={vehicle.next_oil_change_date ?? ''} className="rounded border border-slate-200 px-2 py-1 text-xs" />
                              <input name="batteryStatus" defaultValue={vehicle.battery_status ?? ''} placeholder="Bateria" className="rounded border border-slate-200 px-2 py-1 text-xs" />
                              <input name="tireStatus" defaultValue={vehicle.tire_status ?? ''} placeholder="Llantas" className="rounded border border-slate-200 px-2 py-1 text-xs" />
                              <input name="brakeStatus" defaultValue={vehicle.brake_status ?? ''} placeholder="Frenos" className="rounded border border-slate-200 px-2 py-1 text-xs" />
                              <input name="soatExpiration" type="date" defaultValue={vehicle.soat_expiration ?? ''} className="rounded border border-slate-200 px-2 py-1 text-xs" />
                              <input name="technicalReviewExpiration" type="date" defaultValue={vehicle.technical_review_expiration ?? ''} className="rounded border border-slate-200 px-2 py-1 text-xs" />
                              <select name="vehicleCondition" defaultValue={order.vehicle_condition ?? vehicle.condition_status ?? 'Recibido'} className="col-span-2 rounded border border-slate-200 px-2 py-1 text-xs">
                                <option>Recibido</option>
                                <option>Con danos visibles</option>
                                <option>No enciende</option>
                                <option>En diagnostico</option>
                                <option>Operativo con observaciones</option>
                              </select>
                            </div>

                            <textarea name="maintenanceNotes" defaultValue={vehicle.maintenance_notes ?? ''} placeholder="Notas de mantenimiento, aceite, ruidos, fugas, pendientes..." className="min-h-16 w-full rounded border border-slate-200 px-2 py-1 text-xs" />
                            <textarea name="issueDescription" defaultValue={order.issue_description ?? ''} placeholder="Motivo de ingreso" className="min-h-16 w-full rounded border border-slate-200 px-2 py-1 text-xs" />
                            <SubmitButton pendingText="Guardando..." className="w-full rounded bg-slate-900 py-1.5 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-60">
                              Guardar cambios
                            </SubmitButton>
                          </form>
                        </details>
                      )}

                      <details className={cn('rounded border bg-white', latestDiagnosis ? 'border-blue-200' : 'border-slate-200')}>
                        <summary className="flex cursor-pointer items-center gap-2 px-2 py-1.5 text-xs font-bold text-slate-800 marker:hidden">
                          <ClipboardCheck className={cn('h-3.5 w-3.5', latestDiagnosis ? 'text-blue-600' : 'text-slate-400')} />
                          Diagnostico tecnico
                          {latestDiagnosis?.recommended_specialty && (
                            <span className="ml-auto rounded bg-blue-50 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-blue-700">
                              {latestDiagnosis.recommended_specialty}
                            </span>
                          )}
                        </summary>
                        <div className="space-y-2 border-t border-slate-100 p-2 text-xs">
                          {latestDiagnosis ? (
                            <>
                              <div className="grid gap-2">
                                <div>
                                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Lo que reporta el mecanico</p>
                                  <p className="mt-1 whitespace-pre-line rounded bg-slate-50 p-2 text-slate-800">{latestDiagnosis.diagnosis}</p>
                                </div>
                                {latestDiagnosis.damage_description && (
                                  <div>
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Danos encontrados</p>
                                    <p className="mt-1 whitespace-pre-line rounded bg-red-50 p-2 text-red-900">{latestDiagnosis.damage_description}</p>
                                  </div>
                                )}
                                {latestDiagnosis.recommended_work && (
                                  <div>
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Trabajo recomendado</p>
                                    <p className="mt-1 whitespace-pre-line rounded bg-blue-50 p-2 text-blue-900">{latestDiagnosis.recommended_work}</p>
                                  </div>
                                )}
                              </div>

                              <div className="grid grid-cols-2 gap-2 text-[11px]">
                                <p className="rounded bg-slate-50 px-2 py-1">
                                  <span className="font-bold text-slate-500">Estado: </span>
                                  {latestDiagnosis.vehicle_condition ?? order.vehicle_condition ?? 'Sin estado'}
                                </p>
                                <p className="rounded bg-slate-50 px-2 py-1">
                                  <span className="font-bold text-slate-500">Severidad: </span>
                                  {latestDiagnosis.severity ?? 'Sin clasificar'}
                                </p>
                                <p className="rounded bg-slate-50 px-2 py-1">
                                  <span className="font-bold text-slate-500">Horas: </span>
                                  {Number(latestDiagnosis.estimated_hours ?? order.estimated_hours ?? 0).toFixed(1)}
                                </p>
                                <p className="rounded bg-slate-50 px-2 py-1">
                                  <span className="font-bold text-slate-500">Diagnostico por: </span>
                                  {diagnosingMechanic?.name ?? 'Sin mecanico'}
                                </p>
                              </div>

                              <p className="rounded border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-800">
                                Usa la asignacion de abajo para reasignar este trabajo al especialista recomendado.
                              </p>
                            </>
                          ) : (
                            <div className="rounded border border-dashed border-slate-200 bg-slate-50 p-3 text-[11px] text-slate-600">
                              Aun no hay diagnostico tecnico guardado. Asigna un mecanico para diagnostico y luego podras decidir si se reasigna a otro especialista.
                            </div>
                          )}
                        </div>
                      </details>

                      <div className="rounded border border-slate-200 bg-slate-50 p-2">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Asignacion</p>
                            <p className="truncate text-xs font-bold text-slate-800">{mechanic?.name ?? 'Sin mecanico asignado'}</p>
                          </div>
                          {mechanic && (
                            <form action={unassignWorkOrder}>
                              <input type="hidden" name="workOrderId" value={order.id} />
                              <input type="hidden" name="status" value={order.status} />
                              <SubmitButton pendingText="Quitando..." className="flex items-center gap-1 rounded border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-700 hover:bg-amber-100 disabled:opacity-60">
                                <UserMinus className="h-3 w-3" />
                                Quitar
                              </SubmitButton>
                            </form>
                          )}
                        </div>

                        {mechanics.length === 0 && (
                          <div className="rounded border border-amber-200 bg-amber-50 p-2 text-[11px] font-medium text-amber-800">
                            No hay mecanicos activos. Crea personal en la seccion Personal antes de asignar trabajos.
                            <Link href="/team" className="mt-1 block font-bold text-amber-900 underline">Ir a Personal</Link>
                          </div>
                        )}

                        <form action={assignWorkOrder} className="space-y-2">
                          <input type="hidden" name="workOrderId" value={order.id} />
                          <input type="hidden" name="status" value={order.status} />
                          <select name="mechanicId" defaultValue={mechanic?.id ?? ''} required disabled={mechanics.length === 0} className="w-full rounded border border-slate-200 px-2 py-1 text-xs disabled:bg-slate-100">
                            <option value="">Sin mecanico</option>
                            {mechanics.map((mechanicOption) => (
                              <option key={mechanicOption.id} value={mechanicOption.id}>
                                {mechanicOption.name}
                              </option>
                            ))}
                          </select>
                          <input name="estimatedHours" type="number" step="0.5" defaultValue={order.estimated_hours || ''} disabled={mechanics.length === 0} placeholder="Horas estimadas" className="w-full rounded border border-slate-200 px-2 py-1 text-xs disabled:bg-slate-100" />
                          <SubmitButton pendingText="Asignando..." disabled={mechanics.length === 0} className="w-full rounded bg-blue-600 py-1.5 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-60">
                            {mechanic ? 'Reasignar' : 'Asignar'}
                          </SubmitButton>
                        </form>
                        {!mechanic && (
                          <p className="rounded border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-800">
                            Asigna un mecanico para avanzar despues de Diagnostico.
                          </p>
                        )}
                      </div>

                      <details className="rounded border border-red-100 bg-red-50">
                        <summary className="flex cursor-pointer items-center gap-2 px-2 py-1.5 text-xs font-bold text-red-700 marker:hidden">
                          <Trash2 className="h-3.5 w-3.5" />
                          Eliminar del tablero
                        </summary>
                        <form action={deleteWorkOrder} className="space-y-2 border-t border-red-100 p-2">
                          <input type="hidden" name="workOrderId" value={order.id} />
                          <p className="text-[11px] leading-snug text-red-700">
                            Borra este ingreso/orden del tablero. Usalo para registros duplicados o asignaciones creadas por error.
                          </p>
                          <SubmitButton pendingText="Eliminando..." className="w-full rounded bg-red-600 py-1.5 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-60">
                            Eliminar ingreso
                          </SubmitButton>
                        </form>
                      </details>

                      {(revenue > 0 || cost > 0) && (
                        <div className="rounded border border-emerald-100 bg-emerald-50 p-2 text-[10px]">
                          <div className="mb-1 flex items-center justify-between font-bold text-emerald-900">
                            <span>Rentabilidad OT</span>
                            <span>{margin.toFixed(1)}%</span>
                          </div>
                          <div className="grid grid-cols-3 gap-1 text-slate-600">
                            <span>Ing. ${revenue.toLocaleString('es-CO')}</span>
                            <span>Costo ${cost.toLocaleString('es-CO')}</span>
                            <span>Util. ${profit.toLocaleString('es-CO')}</span>
                          </div>
                        </div>
                      )}

                      <form action={updateWorkOrderStatus} className="flex gap-2 border-t border-slate-100 pt-3">
                        <input type="hidden" name="workOrderId" value={order.id} />
                        <select name="status" defaultValue={isIncoherentStatus ? 'Diagnostico' : order.status} className="min-w-0 flex-1 rounded border border-slate-200 px-2 py-1 text-xs">
                          {availableStatuses.map((status) => (
                            <option key={status}>{status}</option>
                          ))}
                        </select>
                        <SubmitButton pendingText="Moviendo..." className="rounded bg-slate-900 px-2 py-1 text-xs font-bold text-white disabled:opacity-60">
                          Mover
                        </SubmitButton>
                      </form>
                      {isIncoherentStatus && (
                        <p className="rounded border border-red-200 bg-red-50 px-2 py-1 text-[11px] font-bold text-red-700">
                          Estado incoherente: reasigna un mecanico o mueve la orden a Diagnostico.
                        </p>
                      )}

                      <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-[10px] font-medium text-slate-400">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {order.estimated_delivery ? new Date(order.estimated_delivery).toLocaleDateString('es-ES') : 'Sin fecha'}
                        </span>
                        <CarFront className="h-3 w-3" />
                      </div>
                          </>
                        );
                      })()}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
