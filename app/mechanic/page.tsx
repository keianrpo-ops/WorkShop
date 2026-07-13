import { Card, CardContent } from '@/components/ui/card';
import { VehiclePhotoUploader } from '@/components/VehiclePhotoUploader';
import { createDiagnosis, recordWorkOrderLabor, updateWorkOrderStatus } from '@/lib/actions';
import { firstRelated, type Related } from '@/lib/relations';
import { isMissingColumn, supabase } from '@/lib/supabase';
import { CarFront, CheckCircle, ClipboardCheck, Gauge, Timer, Wrench } from 'lucide-react';

export const dynamic = 'force-dynamic';

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
const VEHICLE_SELECT_WITH_IMAGE = `id, plate, make_model, type, year, mileage, condition_status, primary_image_url, ${VEHICLE_PROFILE_SELECT}, vehicle_photos(id, photo_url, label, created_at)`;
const VEHICLE_SELECT_NO_IMAGE = `id, plate, make_model, type, year, mileage, condition_status, ${VEHICLE_PROFILE_SELECT}, vehicle_photos(id, photo_url, label, created_at)`;
const VEHICLE_SELECT_LEGACY_WITH_IMAGE = 'id, plate, make_model, type, year, mileage, condition_status, primary_image_url, vehicle_photos(id, photo_url, label, created_at)';
const VEHICLE_SELECT_LEGACY_NO_IMAGE = 'id, plate, make_model, type, year, mileage, condition_status, vehicle_photos(id, photo_url, label, created_at)';

type Mechanic = {
  id: string;
  name: string;
  role: string | null;
  specialty: string | null;
  hourly_rate?: number | null;
  work_orders: Array<{
    id: string;
    status: string;
    issue_description: string | null;
    estimated_hours: number;
    hours_spent: number;
    customers: Related<{ name: string; phone?: string | null; email?: string | null }>;
    vehicle_condition?: string | null;
    diagnosis_summary?: string | null;
    vehicles: Related<{
      id: string;
      plate: string;
      make_model: string;
      type?: string | null;
      year?: number | null;
      mileage?: number | null;
      condition_status?: string | null;
      primary_image_url?: string | null;
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
  }>;
};

type MechanicDiagnosis = {
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

function relatedList<T>(value: Related<T> | undefined | null): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function missingSchemaRelation(error: { message?: string } | null | undefined) {
  return Boolean(error?.message && (error.message.includes('Could not find') || error.message.includes('schema cache')));
}

function missingVehicleProfileColumn(error: { message?: string } | null | undefined) {
  return VEHICLE_PROFILE_COLUMNS.some((column) => isMissingColumn(error, column));
}

export default async function MechanicPortalPage() {
  let result: Awaited<ReturnType<typeof supabase.from>> | any = await supabase
    .from('mechanics')
    .select(`id, name, role, specialty, hourly_rate, work_orders(id, status, vehicle_condition, diagnosis_summary, issue_description, estimated_hours, hours_spent, customers(name, phone, email), vehicles(${VEHICLE_SELECT_WITH_IMAGE}))`)
    .eq('is_active', true)
    .order('name');

  if (isMissingColumn(result.error, 'primary_image_url')) {
    result = await supabase
      .from('mechanics')
      .select(`id, name, role, specialty, hourly_rate, work_orders(id, status, vehicle_condition, diagnosis_summary, issue_description, estimated_hours, hours_spent, customers(name, phone, email), vehicles(${VEHICLE_SELECT_NO_IMAGE}))`)
      .eq('is_active', true)
      .order('name');
  }

  if (missingVehicleProfileColumn(result.error)) {
    result = await supabase
      .from('mechanics')
      .select(`id, name, role, specialty, hourly_rate, work_orders(id, status, vehicle_condition, diagnosis_summary, issue_description, estimated_hours, hours_spent, customers(name, phone, email), vehicles(${VEHICLE_SELECT_LEGACY_WITH_IMAGE}))`)
      .eq('is_active', true)
      .order('name');

    if (isMissingColumn(result.error, 'primary_image_url')) {
      result = await supabase
        .from('mechanics')
        .select(`id, name, role, specialty, hourly_rate, work_orders(id, status, vehicle_condition, diagnosis_summary, issue_description, estimated_hours, hours_spent, customers(name, phone, email), vehicles(${VEHICLE_SELECT_LEGACY_NO_IMAGE}))`)
        .eq('is_active', true)
        .order('name');
    }
  }

  if (result.error) {
    result = await supabase
      .from('mechanics')
      .select('id, name, role, specialty, hourly_rate, work_orders(id, status, issue_description, estimated_hours, hours_spent, customers(name, phone, email), vehicles(id, plate, make_model, type, year, mileage)))')
      .eq('is_active', true)
      .order('name');
  }

  const { data, error } = result;

  const mechanics = (data ?? []) as unknown as Mechanic[];
  const orderIds = mechanics.flatMap((mechanic) => mechanic.work_orders.map((job) => job.id));
  const diagnosticsByOrder = new Map<string, MechanicDiagnosis[]>();

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

    for (const diagnosis of ((diagnosticsResult.data ?? []) as unknown as MechanicDiagnosis[])) {
      const current = diagnosticsByOrder.get(diagnosis.work_order_id) ?? [];
      current.push(diagnosis);
      diagnosticsByOrder.set(diagnosis.work_order_id, current);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
      <div className="rounded-2xl bg-slate-900 p-6 text-white shadow-xl">
        <p className="mb-1 text-sm font-bold uppercase tracking-wider text-blue-400">Portal Mecanico</p>
        <h1 className="text-3xl font-black tracking-tight">Asignaciones reales del taller</h1>
        <p className="mt-1 text-sm font-medium text-slate-400">Los trabajos aparecen cuando se asignan desde el tablero.</p>
      </div>

      {error && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4 text-sm text-amber-800">{error.message}</CardContent>
        </Card>
      )}

      <div className="space-y-8">
        {mechanics.map((mechanic) => {
          const jobs = mechanic.work_orders.filter((job) => job.status !== 'Entregado');

          return (
            <section key={mechanic.id} className="space-y-4">
              <div>
                <h2 className="flex items-center gap-2 text-xl font-bold text-slate-800">
                  <Wrench className="h-5 w-5 text-blue-600" />
                  {mechanic.name}
                </h2>
                <p className="text-sm text-slate-500">{mechanic.role ?? 'Personal'} - {mechanic.specialty ?? 'Sin especialidad'}</p>
              </div>

              {jobs.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-8 text-center">
                  <CheckCircle className="mx-auto mb-3 h-10 w-10 text-green-500" />
                  <p className="font-bold text-slate-800">Sin trabajos pendientes</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {jobs.map((job) => (
                    <Card key={job.id} className="overflow-hidden border-0 bg-white shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)]">
                      {(() => {
                        const vehicle = firstRelated(job.vehicles);
                        const imageUrl = vehicle?.primary_image_url ?? firstRelated(vehicle?.vehicle_photos ?? null)?.photo_url;
                        return imageUrl ? <div className="h-40 bg-cover bg-center" style={{ backgroundImage: `url(${imageUrl})` }} /> : null;
                      })()}
                      <CardContent className="p-6">
                        {(() => {
                          const customer = firstRelated(job.customers);
                          const vehicle = firstRelated(job.vehicles);
                          const photos = relatedList(vehicle?.vehicle_photos ?? null);
                          const latestDiagnosis = diagnosticsByOrder.get(job.id)?.[0] ?? null;
                          const diagnosingMechanic = latestDiagnosis ? firstRelated(latestDiagnosis.mechanics) : null;

                          return (
                            <>
                        <div className="mb-4 flex items-start justify-between">
                          <div>
                            <h3 className="text-lg font-extrabold text-slate-900">{vehicle?.make_model ?? 'Vehiculo'}</h3>
                            <p className="mt-0.5 text-sm text-slate-500">{customer?.name ?? 'Cliente'}</p>
                          </div>
                          <span className="rounded bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase text-slate-700">{job.status}</span>
                        </div>

                        <div className="mb-6 space-y-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
                          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-700">
                            <ClipboardCheck className="h-4 w-4 text-blue-600" />
                            Paquete de asignacion
                          </p>
                          <div className="flex items-center justify-between text-sm">
                            <span className="flex items-center gap-1.5 text-slate-500">
                              <CarFront className="h-4 w-4" />
                              Placa
                            </span>
                            <span className="font-mono font-bold text-slate-800">{vehicle?.plate ?? 'N/A'}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <p className="rounded bg-white px-2 py-1">
                              <span className="font-bold text-slate-500">Tipo: </span>
                              {vehicle?.type ?? 'Vehiculo'}
                            </p>
                            <p className="rounded bg-white px-2 py-1">
                              <span className="font-bold text-slate-500">Ano: </span>
                              {vehicle?.year ?? 'Pendiente'}
                            </p>
                            <p className="rounded bg-white px-2 py-1">
                              <span className="font-bold text-slate-500">Km: </span>
                              {vehicle?.mileage ? `${Number(vehicle.mileage).toLocaleString('es-CO')} km` : 'Pendiente'}
                            </p>
                            <p className="rounded bg-white px-2 py-1">
                              <span className="font-bold text-slate-500">Fotos: </span>
                              {photos.length}
                            </p>
                          </div>
                          {(vehicle?.vin || vehicle?.color || vehicle?.fuel_type || vehicle?.transmission || vehicle?.engine) && (
                            <div className="grid grid-cols-2 gap-2 border-t border-slate-200 pt-3 text-xs">
                              {vehicle.vin && (
                                <p className="rounded bg-white px-2 py-1">
                                  <span className="font-bold text-slate-500">VIN: </span>
                                  {vehicle.vin}
                                </p>
                              )}
                              {vehicle.color && (
                                <p className="rounded bg-white px-2 py-1">
                                  <span className="font-bold text-slate-500">Color: </span>
                                  {vehicle.color}
                                </p>
                              )}
                              {vehicle.fuel_type && (
                                <p className="rounded bg-white px-2 py-1">
                                  <span className="font-bold text-slate-500">Combustible: </span>
                                  {vehicle.fuel_type}
                                </p>
                              )}
                              {vehicle.transmission && (
                                <p className="rounded bg-white px-2 py-1">
                                  <span className="font-bold text-slate-500">Transmision: </span>
                                  {vehicle.transmission}
                                </p>
                              )}
                              {vehicle.engine && (
                                <p className="rounded bg-white px-2 py-1">
                                  <span className="font-bold text-slate-500">Motor: </span>
                                  {vehicle.engine}
                                </p>
                              )}
                            </div>
                          )}
                          {(vehicle?.oil_type || vehicle?.last_oil_change_mileage || vehicle?.next_oil_change_mileage || vehicle?.battery_status || vehicle?.tire_status || vehicle?.brake_status || vehicle?.soat_expiration || vehicle?.technical_review_expiration || vehicle?.maintenance_notes) && (
                            <div className="space-y-2 border-t border-slate-200 pt-3 text-xs">
                              <p className="font-black uppercase tracking-wider text-slate-700">Mantenimiento y seguridad</p>
                              <div className="grid grid-cols-2 gap-2">
                                {vehicle.oil_type && <p className="rounded bg-white px-2 py-1"><span className="font-bold text-slate-500">Aceite: </span>{vehicle.oil_type}</p>}
                                {vehicle.last_oil_change_mileage && <p className="rounded bg-white px-2 py-1"><span className="font-bold text-slate-500">Ult. aceite: </span>{Number(vehicle.last_oil_change_mileage).toLocaleString('es-CO')} km</p>}
                                {vehicle.next_oil_change_mileage && <p className="rounded bg-white px-2 py-1"><span className="font-bold text-slate-500">Prox. aceite: </span>{Number(vehicle.next_oil_change_mileage).toLocaleString('es-CO')} km</p>}
                                {vehicle.next_oil_change_date && <p className="rounded bg-white px-2 py-1"><span className="font-bold text-slate-500">Fecha aceite: </span>{vehicle.next_oil_change_date}</p>}
                                {vehicle.battery_status && <p className="rounded bg-white px-2 py-1"><span className="font-bold text-slate-500">Bateria: </span>{vehicle.battery_status}</p>}
                                {vehicle.tire_status && <p className="rounded bg-white px-2 py-1"><span className="font-bold text-slate-500">Llantas: </span>{vehicle.tire_status}</p>}
                                {vehicle.brake_status && <p className="rounded bg-white px-2 py-1"><span className="font-bold text-slate-500">Frenos: </span>{vehicle.brake_status}</p>}
                                {vehicle.soat_expiration && <p className="rounded bg-white px-2 py-1"><span className="font-bold text-slate-500">SOAT: </span>{vehicle.soat_expiration}</p>}
                                {vehicle.technical_review_expiration && <p className="rounded bg-white px-2 py-1"><span className="font-bold text-slate-500">Tecnomecanica: </span>{vehicle.technical_review_expiration}</p>}
                              </div>
                              {vehicle.maintenance_notes && <p className="whitespace-pre-line rounded bg-white px-2 py-2 text-slate-700">{vehicle.maintenance_notes}</p>}
                            </div>
                          )}
                          <div className="flex items-center justify-between text-sm">
                            <span className="flex items-center gap-1.5 text-slate-500">
                              <Timer className="h-4 w-4" />
                              Tiempo
                            </span>
                            <span className="font-bold text-slate-800">{job.hours_spent}h / {job.estimated_hours}h</span>
                          </div>
                          {job.issue_description && <p className="border-t border-slate-200 pt-3 text-sm text-slate-600">{job.issue_description}</p>}
                          <p className="border-t border-slate-200 pt-3 text-xs font-bold uppercase tracking-wider text-amber-700">
                            Estado vehiculo: {job.vehicle_condition ?? 'Recibido'}
                          </p>
                          {customer?.phone && <p className="text-xs text-slate-500">Contacto cliente: {customer.phone}</p>}
                        </div>

                        <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50 p-4">
                          <p className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-blue-900">
                            <Gauge className="h-4 w-4" />
                            Diagnostico y pruebas previas
                          </p>
                          {latestDiagnosis ? (
                            <div className="space-y-3 text-sm">
                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-blue-900">Diagnostico recibido</p>
                                <p className="mt-1 whitespace-pre-line rounded-lg bg-white p-3 text-slate-800">{latestDiagnosis.diagnosis}</p>
                              </div>
                              {latestDiagnosis.damage_description && (
                                <div>
                                  <p className="text-[10px] font-bold uppercase tracking-wider text-blue-900">Danos encontrados</p>
                                  <p className="mt-1 whitespace-pre-line rounded-lg bg-white p-3 text-red-900">{latestDiagnosis.damage_description}</p>
                                </div>
                              )}
                              {latestDiagnosis.recommended_work && (
                                <div>
                                  <p className="text-[10px] font-bold uppercase tracking-wider text-blue-900">Trabajo recomendado</p>
                                  <p className="mt-1 whitespace-pre-line rounded-lg bg-white p-3 text-blue-900">{latestDiagnosis.recommended_work}</p>
                                </div>
                              )}
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <p className="rounded bg-white px-2 py-1">
                                  <span className="font-bold text-slate-500">Severidad: </span>
                                  {latestDiagnosis.severity ?? 'Sin clasificar'}
                                </p>
                                <p className="rounded bg-white px-2 py-1">
                                  <span className="font-bold text-slate-500">Especialidad: </span>
                                  {latestDiagnosis.recommended_specialty ?? 'General'}
                                </p>
                                <p className="rounded bg-white px-2 py-1">
                                  <span className="font-bold text-slate-500">Horas estimadas: </span>
                                  {Number(latestDiagnosis.estimated_hours ?? job.estimated_hours ?? 0).toFixed(1)}
                                </p>
                                <p className="rounded bg-white px-2 py-1">
                                  <span className="font-bold text-slate-500">Diagnosticado por: </span>
                                  {diagnosingMechanic?.name ?? 'Taller'}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <p className="rounded-lg border border-dashed border-blue-200 bg-white p-3 text-sm text-blue-900">
                              Esta orden aun no tiene diagnostico tecnico detallado. Usa el formulario de abajo para registrar pruebas, danos, severidad y especialidad recomendada antes de iniciar reparacion.
                            </p>
                          )}
                        </div>

                        {vehicle?.id && (
                          <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4">
                            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-700">Historial fotografico ({photos.length})</p>
                            {photos.length > 0 && (
                              <div className="mb-3 grid grid-cols-4 gap-2">
                                {photos.slice(0, 8).map((photo, index) => (
                                  <a
                                    key={photo.id ?? `${photo.photo_url}-${index}`}
                                    href={photo.photo_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="block overflow-hidden rounded-lg border border-slate-100 bg-slate-100"
                                    title={photo.label ?? 'Foto del vehiculo'}
                                  >
                                    <span className="block aspect-square bg-cover bg-center" style={{ backgroundImage: `url(${photo.photo_url})` }} />
                                  </a>
                                ))}
                              </div>
                            )}
                            <VehiclePhotoUploader vehicleId={vehicle.id} workOrderId={job.id} label={`Tecnico - ${mechanic.name}`} buttonLabel="Agregar evidencia fotografica" />
                          </div>
                        )}

                        <form action={createDiagnosis} className="mb-4 space-y-3 rounded-xl border border-blue-100 bg-blue-50 p-4">
                          <input type="hidden" name="workOrderId" value={job.id} />
                          <input type="hidden" name="mechanicId" value={mechanic.id} />
                          <input type="hidden" name="vehicleId" value={vehicle?.id ?? ''} />
                          <label className="block space-y-1">
                            <span className="text-xs font-bold uppercase tracking-wider text-blue-900">Estado actual del vehiculo</span>
                            <select name="vehicleCondition" defaultValue={job.vehicle_condition ?? 'En diagnostico'} className="w-full rounded border border-blue-200 bg-white px-3 py-2 text-sm">
                              <option>En diagnostico</option>
                              <option>No enciende</option>
                              <option>Requiere repuestos</option>
                              <option>En reparacion</option>
                              <option>Prueba de ruta</option>
                              <option>Listo para entrega</option>
                            </select>
                          </label>
                          <label className="block space-y-1">
                            <span className="text-xs font-bold uppercase tracking-wider text-blue-900">Diagnostico</span>
                            <textarea name="diagnosis" required className="min-h-20 w-full rounded border border-blue-200 bg-white px-3 py-2 text-sm" />
                          </label>
                          <label className="block space-y-1">
                            <span className="text-xs font-bold uppercase tracking-wider text-blue-900">Danos encontrados</span>
                            <textarea name="damageDescription" placeholder="Golpes, fugas, piezas quebradas, ruidos, testigos, desgaste, fallas visibles..." className="min-h-20 w-full rounded border border-blue-200 bg-white px-3 py-2 text-sm" />
                          </label>
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            <label className="block space-y-1">
                              <span className="text-xs font-bold uppercase tracking-wider text-blue-900">Severidad</span>
                              <select name="severity" defaultValue="Media" className="w-full rounded border border-blue-200 bg-white px-3 py-2 text-sm">
                                <option>Leve</option>
                                <option>Media</option>
                                <option>Alta</option>
                                <option>Critica</option>
                              </select>
                            </label>
                            <label className="block space-y-1">
                              <span className="text-xs font-bold uppercase tracking-wider text-blue-900">Especialidad sugerida</span>
                              <select name="recommendedSpecialty" defaultValue="General" className="w-full rounded border border-blue-200 bg-white px-3 py-2 text-sm">
                                <option>General</option>
                                <option>Diagnostico electronico</option>
                                <option>Electricidad</option>
                                <option>Motor</option>
                                <option>Frenos</option>
                                <option>Suspension</option>
                                <option>Direccion</option>
                                <option>Caja y transmision</option>
                                <option>Aire acondicionado</option>
                                <option>Latoneria y pintura</option>
                                <option>Llantas y alineacion</option>
                              </select>
                            </label>
                          </div>
                          <label className="block space-y-1">
                            <span className="text-xs font-bold uppercase tracking-wider text-blue-900">Trabajo recomendado</span>
                            <textarea name="recommendedWork" className="min-h-16 w-full rounded border border-blue-200 bg-white px-3 py-2 text-sm" />
                          </label>
                          <input name="estimatedHours" type="number" min="0" step="0.5" placeholder="Horas estimadas" className="w-full rounded border border-blue-200 bg-white px-3 py-2 text-sm" />
                          <button className="w-full rounded-lg bg-blue-600 py-2 text-sm font-bold text-white hover:bg-blue-700">
                            Guardar diagnostico
                          </button>
                        </form>

                        <form action={recordWorkOrderLabor} className="mb-4 space-y-3 rounded-xl border border-slate-200 bg-white p-4">
                          <input type="hidden" name="workOrderId" value={job.id} />
                          <input type="hidden" name="mechanicId" value={mechanic.id} />
                          <input type="hidden" name="hourlyCost" value={mechanic.hourly_rate ?? 0} />
                          <p className="text-xs font-bold uppercase tracking-wider text-slate-700">Tiempo, productividad y costo real</p>
                          <div className="grid grid-cols-2 gap-2">
                            <input name="hoursSpent" type="number" min="0" step="0.25" placeholder="Horas trabajadas" required className="rounded border border-slate-200 px-3 py-2 text-sm" />
                            <input name="billableHours" type="number" min="0" step="0.25" placeholder="Horas facturables" className="rounded border border-slate-200 px-3 py-2 text-sm" />
                            <input name="laborRevenue" type="number" min="0" step="1000" placeholder="Mano de obra $" className="rounded border border-slate-200 px-3 py-2 text-sm" />
                            <input name="commissionAmount" type="number" min="0" step="1000" placeholder="Comision $" className="rounded border border-slate-200 px-3 py-2 text-sm" />
                          </div>
                          <select name="laborRole" defaultValue="Principal" className="w-full rounded border border-slate-200 px-3 py-2 text-sm">
                            <option>Principal</option>
                            <option>Ayudante</option>
                            <option>Asesor</option>
                          </select>
                          <button className="w-full rounded-lg bg-slate-900 py-2 text-sm font-bold text-white hover:bg-slate-800">
                            Registrar tiempo real
                          </button>
                        </form>

                        <form action={updateWorkOrderStatus}>
                          <input type="hidden" name="workOrderId" value={job.id} />
                          <input type="hidden" name="status" value="Listo" />
                          <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-500 py-3 font-bold text-white shadow-md shadow-green-500/20 hover:bg-green-600">
                            <CheckCircle className="h-5 w-5" />
                            Marcar como Listo
                          </button>
                        </form>
                            </>
                          );
                        })()}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>

      {mechanics.length === 0 && <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">Agrega mecanicos en Personal para usar este portal.</div>}
    </div>
  );
}
