'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { WORKSHOP_ID } from '@/lib/workshop';
import { randomUUID } from 'crypto';

const BOARD_ACTIVE_STATUSES = ['Recibido', 'Diagnostico', 'Presupuesto pendiente', 'Aprobacion pendiente', 'Aprobado', 'En reparacion', 'Esperando repuestos', 'Listo'];
const BOARD_DIAGNOSIS_INDEX = BOARD_ACTIVE_STATUSES.indexOf('Diagnostico');

function boardStatusNeedsMechanic(status: string) {
  if (status === 'Cancelado') return false;
  if (status === 'Entregado') return true;
  const index = BOARD_ACTIVE_STATUSES.indexOf(status);
  return index === -1 || index > BOARD_DIAGNOSIS_INDEX;
}

function textValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function lowerTextValue(formData: FormData, key: string) {
  return textValue(formData, key)?.toLowerCase() ?? null;
}

function normalizePhone(value: string | null | undefined) {
  const digits = (value ?? '').replace(/\D/g, '');
  if (!digits) return null;
  if (digits.length === 12 && digits.startsWith('57')) return digits.slice(2);
  return digits;
}

function phoneValue(formData: FormData, key: string) {
  return normalizePhone(textValue(formData, key));
}

function documentValue(formData: FormData, key: string) {
  return textValue(formData, key)?.replace(/\s+/g, '').toUpperCase() ?? null;
}

function normalizedDocumentValue(formData: FormData, key: string) {
  return textValue(formData, key)?.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() ?? null;
}

function numberValue(formData: FormData, key: string) {
  const value = textValue(formData, key);
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function dateValue(formData: FormData, key: string) {
  return textValue(formData, key);
}

function daysBetween(start: string, end: string) {
  const startDate = new Date(`${start}T00:00:00-05:00`);
  const endDate = new Date(`${end}T00:00:00-05:00`);
  const diff = endDate.getTime() - startDate.getTime();
  return Math.max(Math.floor(diff / 86400000) + 1, 0);
}

function fileValues(formData: FormData, key: string) {
  return formData
    .getAll(key)
    .filter((value): value is File => typeof value === 'object' && value !== null && 'size' in value && Number(value.size) > 0);
}

type UploadedReceptionPhoto = {
  photo_url: string;
  storage_path?: string | null;
  label?: string | null;
};

function uploadedReceptionPhotos(formData: FormData) {
  const rawValue = textValue(formData, 'uploadedPhotos');
  if (!rawValue) return [];

  try {
    const parsed = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((photo): photo is UploadedReceptionPhoto => (
      typeof photo === 'object' &&
      photo !== null &&
      'photo_url' in photo &&
      typeof photo.photo_url === 'string' &&
      photo.photo_url.trim().length > 0
    ));
  } catch {
    return [];
  }
}

function safeFileName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9.]+/g, '-').replace(/(^-|-$)/g, '');
}

async function uploadImage(file: File, folder: string) {
  const fileName = safeFileName(file.name || 'image.jpg');
  const path = `${WORKSHOP_ID}/${folder}/${randomUUID()}-${fileName}`;
  const { error } = await supabase.storage.from('vehicle-images').upload(path, file, {
    contentType: file.type || 'image/jpeg',
    upsert: false,
  });

  if (error) {
    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.byteLength > 3_000_000) {
      throw new Error(`No se pudo subir la imagen a Storage: ${error.message}. La foto pesa demasiado para guardar respaldo local.`);
    }

    return {
      path: null,
      publicUrl: `data:${file.type || 'image/jpeg'};base64,${buffer.toString('base64')}`,
    };
  }

  const { data } = supabase.storage.from('vehicle-images').getPublicUrl(path);
  return { path, publicUrl: data.publicUrl };
}

function missingColumn(error: { message?: string } | null, column: string) {
  return Boolean(
    error?.message?.includes(column) &&
      (error.message.includes('does not exist') || error.message.includes('Could not find') || error.message.includes('schema cache')),
  );
}

function missingSchemaColumn(error: { message?: string } | null | undefined) {
  return Boolean(error?.message && (error.message.includes('does not exist') || error.message.includes('Could not find') || error.message.includes('schema cache')));
}

function placeholderQuotationLine(description: string) {
  return /^(?:[^:]+:\s*)?Cambio\s+\d+\s*:\s*$/i.test(description.trim());
}

function blockedByPolicy(error: { message?: string } | null | undefined) {
  return Boolean(error?.message?.includes('row-level security policy'));
}

async function nextInvoiceNumber() {
  let result: Awaited<ReturnType<typeof supabase.from>> | any = await supabase
    .from('workshops')
    .select('invoice_prefix, invoice_next_number')
    .eq('id', WORKSHOP_ID)
    .maybeSingle();

  if (missingSchemaColumn(result.error)) {
    return `FAC-${Date.now()}`;
  }

  const rawPrefix = typeof result.data?.invoice_prefix === 'string' && result.data.invoice_prefix.trim()
    ? result.data.invoice_prefix.trim().toUpperCase()
    : 'FAC';
  const prefix = rawPrefix === 'POS' ? 'FAC' : rawPrefix;
  const nextNumber = Number.isFinite(Number(result.data?.invoice_next_number)) ? Number(result.data?.invoice_next_number) : 1;
  const folio = `${prefix}-${String(nextNumber).padStart(4, '0')}`;

  result = await supabase
    .from('workshops')
    .update({
      invoice_prefix: prefix,
      invoice_next_number: nextNumber + 1,
    })
    .eq('id', WORKSHOP_ID);

  if (missingSchemaColumn(result.error)) {
    return folio;
  }

  return folio;
}

function redirectPosError(message: string): never {
  redirect(`/pos?error=${encodeURIComponent(message)}`);
}

function redirectQuotationError(message: string): never {
  redirect(`/quotations?error=${encodeURIComponent(message)}`);
}

const VEHICLE_TECHNICAL_COLUMNS = [
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

function vehicleTechnicalPayload(formData: FormData) {
  return {
    vin: documentValue(formData, 'vin'),
    color: textValue(formData, 'color'),
    fuel_type: textValue(formData, 'fuelType'),
    transmission: textValue(formData, 'transmission'),
    engine: textValue(formData, 'engine'),
    oil_type: textValue(formData, 'oilType'),
    last_oil_change_mileage: numberValue(formData, 'lastOilChangeMileage'),
    last_oil_change_date: dateValue(formData, 'lastOilChangeDate'),
    next_oil_change_mileage: numberValue(formData, 'nextOilChangeMileage'),
    next_oil_change_date: dateValue(formData, 'nextOilChangeDate'),
    battery_status: textValue(formData, 'batteryStatus'),
    tire_status: textValue(formData, 'tireStatus'),
    brake_status: textValue(formData, 'brakeStatus'),
    soat_expiration: dateValue(formData, 'soatExpiration'),
    technical_review_expiration: dateValue(formData, 'technicalReviewExpiration'),
    maintenance_notes: textValue(formData, 'maintenanceNotes'),
  };
}

function missingVehicleTechnicalColumn(error: { message?: string } | null | undefined) {
  return VEHICLE_TECHNICAL_COLUMNS.some((column) => missingColumn(error ?? null, column));
}

function vehicleFallbackPayload<T extends Record<string, unknown>>(payload: T, error: { message?: string } | null | undefined) {
  const fallback = { ...payload };
  if (missingColumn(error ?? null, 'condition_status')) delete fallback.condition_status;
  if (missingVehicleTechnicalColumn(error)) {
    for (const column of VEHICLE_TECHNICAL_COLUMNS) delete fallback[column];
  }
  return fallback;
}

async function findExistingCustomerId({ phone, email, documentNumber }: { phone?: string | null; email?: string | null; documentNumber?: string | null }) {
  if (documentNumber) {
    const result = await supabase
      .from('customers')
      .select('id')
      .eq('workshop_id', WORKSHOP_ID)
      .eq('document_number', documentNumber)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!missingColumn(result.error, 'document_number')) {
      if (result.error) throw new Error(result.error.message);
      if (result.data?.id) return result.data.id as string;
    }
  }

  if (email) {
    const result = await supabase
      .from('customers')
      .select('id')
      .eq('workshop_id', WORKSHOP_ID)
      .eq('email', email)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (result.error) throw new Error(result.error.message);
    if (result.data?.id) return result.data.id as string;
  }

  if (phone) {
    const result = await supabase
      .from('customers')
      .select('id')
      .eq('workshop_id', WORKSHOP_ID)
      .eq('phone', phone)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (result.error) throw new Error(result.error.message);
    if (result.data?.id) return result.data.id as string;
  }

  return null;
}

async function upsertCustomerIdentity(payload: { name: string; phone?: string | null; email?: string | null; documentNumber?: string | null }) {
  const existingId = await findExistingCustomerId(payload);
  const customerPayload = {
    name: payload.name,
    phone: payload.phone,
    email: payload.email,
    document_number: payload.documentNumber,
    notes: payload.documentNumber ? `Documento: ${payload.documentNumber}` : null,
  };

  if (existingId) {
    let update = await supabase
      .from('customers')
      .update(customerPayload)
      .eq('id', existingId);

    if (missingColumn(update.error, 'document_number')) {
      const { document_number: _documentNumber, ...fallbackPayload } = customerPayload;
      update = await supabase
        .from('customers')
        .update(fallbackPayload)
        .eq('id', existingId);
    }

    if (update.error) throw new Error(update.error.message);
    return existingId;
  }

  let insert = await supabase
    .from('customers')
    .insert({
      workshop_id: WORKSHOP_ID,
      ...customerPayload,
    })
    .select('id')
    .single();

  if (missingColumn(insert.error, 'document_number')) {
    const { document_number: _documentNumber, ...fallbackPayload } = customerPayload;
    insert = await supabase
      .from('customers')
      .insert({
        workshop_id: WORKSHOP_ID,
        ...fallbackPayload,
      })
      .select('id')
      .single();
  }

  if (insert.error) throw new Error(insert.error.message);
  return insert.data.id as string;
}

async function assertCustomerIdentityAvailable(currentCustomerId: string, identity: { phone?: string | null; email?: string | null; documentNumber?: string | null }) {
  const checks = [
    { column: 'document_number', value: identity.documentNumber, label: 'documento' },
    { column: 'email', value: identity.email, label: 'correo' },
    { column: 'phone', value: identity.phone, label: 'telefono' },
  ];

  for (const check of checks) {
    if (!check.value) continue;

    const result = await supabase
      .from('customers')
      .select('id, name')
      .eq('workshop_id', WORKSHOP_ID)
      .eq(check.column, check.value)
      .limit(1)
      .maybeSingle();

    if (missingColumn(result.error, check.column)) continue;
    if (result.error) throw new Error(result.error.message);
    if (result.data?.id && result.data.id !== currentCustomerId) {
      throw new Error(`Ese ${check.label} ya esta registrado en el cliente ${result.data.name}.`);
    }
  }
}

function redirectCustomersError(message: string): never {
  redirect(`/customers?error=${encodeURIComponent(message)}`);
}

export async function updateWorkshopBusiness(formData: FormData) {
  const payload = {
    name: textValue(formData, 'name') ?? 'Workshop',
    legal_name: textValue(formData, 'legalName') ?? textValue(formData, 'name') ?? 'Workshop',
    document_type: textValue(formData, 'documentType') ?? 'NIT',
    tax_id: textValue(formData, 'taxId'),
    phone: textValue(formData, 'phone'),
    email: lowerTextValue(formData, 'email'),
    address: textValue(formData, 'address'),
    city: textValue(formData, 'city'),
    country: textValue(formData, 'country') ?? 'Colombia',
    tax_regime: textValue(formData, 'taxRegime'),
    economic_activity: textValue(formData, 'economicActivity'),
    invoice_prefix: textValue(formData, 'invoicePrefix') ?? 'FAC',
    invoice_next_number: numberValue(formData, 'invoiceNextNumber') ?? 1,
    invoice_resolution: textValue(formData, 'invoiceResolution'),
    invoice_authorization: textValue(formData, 'invoiceAuthorization'),
    invoice_resolution_date: dateValue(formData, 'invoiceResolutionDate'),
    invoice_resolution_valid_until: dateValue(formData, 'invoiceResolutionValidUntil'),
    invoice_range_from: numberValue(formData, 'invoiceRangeFrom') ?? 1,
    invoice_range_to: numberValue(formData, 'invoiceRangeTo') ?? 999999,
    document_footer: textValue(formData, 'documentFooter') ?? 'Gracias por confiar en nuestro taller',
    branch_name: textValue(formData, 'branchName') ?? 'Centro Especializado',
    updated_at: new Date().toISOString(),
  };

  let result = await supabase
    .from('workshops')
    .update(payload)
    .eq('id', WORKSHOP_ID);

  if (missingSchemaColumn(result.error)) {
    result = await supabase
      .from('workshops')
      .update({
        name: payload.name,
        phone: payload.phone,
        address: payload.address,
        updated_at: payload.updated_at,
      })
      .eq('id', WORKSHOP_ID);

    if (result.error) throw new Error(result.error.message);
    revalidatePath('/', 'layout');
    redirect('/settings/business?schema=1');
  }

  if (result.error) throw new Error(result.error.message);

  revalidatePath('/', 'layout');
  revalidatePath('/settings/business');
  revalidatePath('/documents/sale/[id]');
  revalidatePath('/documents/payroll/[id]');
  revalidatePath('/documents/liquidation/[id]');
  redirect('/settings/business?saved=1');
}

export async function updateCustomer(formData: FormData) {
  const customerId = textValue(formData, 'customerId');
  const name = textValue(formData, 'name');
  const documentNumber = normalizedDocumentValue(formData, 'documentNumber');
  const phone = phoneValue(formData, 'phone');
  const email = lowerTextValue(formData, 'email');
  const notes = textValue(formData, 'notes');

  if (!customerId || !name) {
    redirectCustomersError('Faltan datos obligatorios para actualizar el cliente.');
  }

  try {
    await assertCustomerIdentityAvailable(customerId, { phone, email, documentNumber });

    const payload = {
      name,
      document_number: documentNumber,
      phone,
      email,
      notes: notes ?? (documentNumber ? `Documento: ${documentNumber}` : null),
    };

    let result = await supabase
      .from('customers')
      .update(payload)
      .eq('id', customerId)
      .eq('workshop_id', WORKSHOP_ID);

    if (missingColumn(result.error, 'document_number')) {
      const { document_number: _documentNumber, ...fallbackPayload } = payload;
      result = await supabase
        .from('customers')
        .update(fallbackPayload)
        .eq('id', customerId)
        .eq('workshop_id', WORKSHOP_ID);
    }

    if (blockedByPolicy(result.error)) {
      redirectCustomersError('Supabase bloqueo la edicion del cliente por politicas RLS. Ejecuta supabase/21_customers_identity_dedupe.sql en el SQL Editor.');
    }
    if (result.error) throw new Error(result.error.message);
  } catch (error) {
    redirectCustomersError(error instanceof Error ? error.message : 'No se pudo actualizar el cliente.');
  }

  revalidatePath('/customers');
  revalidatePath('/board');
  revalidatePath('/quotations');
  redirect('/customers?updated=1');
}

export async function updateCustomerVehicle(formData: FormData) {
  const vehicleId = textValue(formData, 'vehicleId');
  const customerId = textValue(formData, 'customerId');
  const plate = textValue(formData, 'plate')?.replace(/\s+/g, '').toUpperCase();
  const makeModel = textValue(formData, 'makeModel');
  const vehicleType = textValue(formData, 'vehicleType') ?? 'Carro';
  const year = numberValue(formData, 'year');
  const mileage = numberValue(formData, 'mileage');
  const conditionStatus = textValue(formData, 'conditionStatus') ?? 'Registrado';

  if (!vehicleId || !customerId || !plate || !makeModel) {
    redirectCustomersError('Faltan datos obligatorios para actualizar el vehiculo.');
  }

  try {
    const duplicatePlate = await supabase
      .from('vehicles')
      .select('id')
      .eq('workshop_id', WORKSHOP_ID)
      .eq('plate', plate);

    if (!duplicatePlate.error && (duplicatePlate.data ?? []).some((vehicle) => vehicle.id !== vehicleId)) {
      redirectCustomersError(`La placa ${plate} ya existe en otro vehiculo. No se permiten placas repetidas.`);
    }

    const payload = {
      customer_id: customerId,
      type: vehicleType,
      plate,
      make_model: makeModel,
      year,
      mileage,
      condition_status: conditionStatus,
      updated_at: new Date().toISOString(),
    };

    let result = await supabase
      .from('vehicles')
      .update(payload)
      .eq('id', vehicleId)
      .eq('workshop_id', WORKSHOP_ID);

    if (missingColumn(result.error, 'condition_status')) {
      const { condition_status: _conditionStatus, ...fallbackPayload } = payload;
      result = await supabase
        .from('vehicles')
        .update(fallbackPayload)
        .eq('id', vehicleId)
        .eq('workshop_id', WORKSHOP_ID);
    }

    if (blockedByPolicy(result.error)) {
      redirectCustomersError('Supabase bloqueo la edicion del vehiculo por politicas RLS. Ejecuta supabase/21_customers_identity_dedupe.sql en el SQL Editor.');
    }
    if (result.error) throw new Error(result.error.message);
  } catch (error) {
    redirectCustomersError(error instanceof Error ? error.message : 'No se pudo actualizar el vehiculo.');
  }

  revalidatePath('/customers');
  revalidatePath('/board');
  revalidatePath('/reception');
  redirect('/customers?updated=1');
}

export async function createReception(formData: FormData) {
  const customerName = textValue(formData, 'customerName');
  const phone = phoneValue(formData, 'phone');
  const email = lowerTextValue(formData, 'email');
  const vehicleType = textValue(formData, 'vehicleType') ?? 'Carro';
  const plate = textValue(formData, 'plate')?.toUpperCase();
  const makeModel = textValue(formData, 'makeModel');
  const year = numberValue(formData, 'year');
  const mileage = numberValue(formData, 'mileage');
  const issueDescription = textValue(formData, 'issueDescription');
  const vehicleCondition = textValue(formData, 'vehicleCondition') ?? 'Recibido';
  const technicalProfile = vehicleTechnicalPayload(formData);
  const photoFiles = fileValues(formData, 'vehiclePhotos');
  const uploadedPhotos = uploadedReceptionPhotos(formData);

  if (!customerName || !plate || !makeModel) {
    throw new Error('Faltan datos obligatorios para crear la recepcion.');
  }

  let existingVehicleResult: Awaited<ReturnType<typeof supabase.from>> | any = await supabase
    .from('vehicles')
    .select('id, customer_id, primary_image_url')
    .eq('workshop_id', WORKSHOP_ID)
    .eq('plate', plate)
    .order('created_at', { ascending: true })
    .limit(1);

  if (missingColumn(existingVehicleResult.error, 'primary_image_url')) {
    existingVehicleResult = await supabase
      .from('vehicles')
      .select('id, customer_id')
      .eq('workshop_id', WORKSHOP_ID)
      .eq('plate', plate)
      .order('created_at', { ascending: true })
      .limit(1);
  }

  if (existingVehicleResult.error) throw new Error(existingVehicleResult.error.message);

  const existingVehicle = ((existingVehicleResult.data ?? [])[0] ?? null) as { id: string; customer_id?: string | null } | null;
  let customerId = existingVehicle?.customer_id as string | undefined;

  if (customerId) {
    let customerUpdate = await supabase
      .from('customers')
      .update({
        name: customerName,
        phone,
        email,
      })
      .eq('id', customerId);

    if (missingColumn(customerUpdate.error, 'document_number')) {
      customerUpdate = await supabase
        .from('customers')
        .update({
          name: customerName,
          phone,
          email,
        })
        .eq('id', customerId);
    }

    if (customerUpdate.error) throw new Error(customerUpdate.error.message);
  } else {
    customerId = await upsertCustomerIdentity({
      name: customerName,
      phone,
      email,
    });
  }

  if (!customerId) throw new Error('No se pudo asociar el cliente al vehiculo.');

  const vehiclePayload = {
    workshop_id: WORKSHOP_ID,
    customer_id: customerId,
    type: vehicleType,
    plate,
    make_model: makeModel,
    year,
    mileage,
    condition_status: vehicleCondition,
    ...technicalProfile,
  };

  let vehicleResult;

  if (existingVehicle) {
    vehicleResult = await supabase
      .from('vehicles')
      .update(vehiclePayload)
      .eq('id', existingVehicle.id)
      .select('id')
      .single();

    if (missingColumn(vehicleResult.error, 'condition_status') || missingVehicleTechnicalColumn(vehicleResult.error)) {
      const fallbackPayload = vehicleFallbackPayload(vehiclePayload, vehicleResult.error);
      vehicleResult = await supabase
        .from('vehicles')
        .update(fallbackPayload)
        .eq('id', existingVehicle.id)
        .select('id')
        .single();
    }
  } else {
    vehicleResult = await supabase
      .from('vehicles')
      .insert(vehiclePayload)
      .select('id')
      .single();

    if (missingColumn(vehicleResult.error, 'condition_status') || missingVehicleTechnicalColumn(vehicleResult.error)) {
      const fallbackPayload = vehicleFallbackPayload(vehiclePayload, vehicleResult.error);
      vehicleResult = await supabase
        .from('vehicles')
        .insert(fallbackPayload)
        .select('id')
        .single();
    }
  }

  const { data: vehicle, error: vehicleError } = vehicleResult;
  if (vehicleError) throw new Error(vehicleError.message);

  const orderPayload = {
    workshop_id: WORKSHOP_ID,
    customer_id: customerId,
    vehicle_id: vehicle.id,
    status: 'Recibido',
    vehicle_condition: vehicleCondition,
    issue_description: issueDescription,
  };

  const openOrderResult = await supabase
    .from('work_orders')
    .select('id, status')
    .eq('workshop_id', WORKSHOP_ID)
    .eq('vehicle_id', vehicle.id)
    .not('status', 'in', '("Entregado","Cancelado")')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (openOrderResult.error) throw new Error(openOrderResult.error.message);

  let order = openOrderResult.data as { id: string; status: string } | null;

  if (order) {
    let orderUpdate = await supabase
      .from('work_orders')
      .update({
        customer_id: customerId,
        vehicle_condition: vehicleCondition,
        issue_description: issueDescription,
      })
      .eq('id', order.id);

    if (missingColumn(orderUpdate.error, 'vehicle_condition')) {
      orderUpdate = await supabase
        .from('work_orders')
        .update({
          customer_id: customerId,
          issue_description: issueDescription,
        })
        .eq('id', order.id);
    }

    if (orderUpdate.error) throw new Error(orderUpdate.error.message);
  } else {
    let orderResult = await supabase
      .from('work_orders')
      .insert(orderPayload)
      .select('id, status')
      .single();

    if (missingColumn(orderResult.error, 'vehicle_condition')) {
      const { vehicle_condition: _vehicleCondition, ...fallbackPayload } = orderPayload;
      orderResult = await supabase
        .from('work_orders')
        .insert(fallbackPayload)
        .select('id, status')
        .single();
    }

    if (orderResult.error) throw new Error(orderResult.error.message);
    order = orderResult.data;
  }

  if (!order) throw new Error('No se pudo crear o actualizar la orden de trabajo.');

  let primaryImageUrl: string | null = null;

  for (const photo of uploadedPhotos) {
    primaryImageUrl = primaryImageUrl ?? photo.photo_url;

    const { error: photoError } = await supabase.from('vehicle_photos').insert({
      workshop_id: WORKSHOP_ID,
      vehicle_id: vehicle.id,
      work_order_id: order.id,
      photo_url: photo.photo_url,
      storage_path: photo.storage_path ?? null,
      label: photo.label ?? 'Recepcion',
    });

    if (photoError) throw new Error(photoError.message);
  }

  for (const file of photoFiles) {
    const uploaded = await uploadImage(file, `vehicles/${vehicle.id}`);
    primaryImageUrl = primaryImageUrl ?? uploaded.publicUrl;

    const { error: photoError } = await supabase.from('vehicle_photos').insert({
      workshop_id: WORKSHOP_ID,
      vehicle_id: vehicle.id,
      work_order_id: order.id,
      photo_url: uploaded.publicUrl,
      storage_path: uploaded.path,
      label: 'Recepcion',
    });

    if (photoError) throw new Error(photoError.message);
  }

  if (primaryImageUrl) {
    const { error: imageError } = await supabase
      .from('vehicles')
      .update({ primary_image_url: primaryImageUrl })
      .eq('id', vehicle.id);

    if (imageError && !missingColumn(imageError, 'primary_image_url')) throw new Error(imageError.message);
  }

  revalidatePath('/');
  revalidatePath('/customers');
  revalidatePath('/board');
  revalidatePath('/mechanic');
  redirect('/board');
}

export async function addVehiclePhotos(formData: FormData) {
  const vehicleId = textValue(formData, 'vehicleId');
  const workOrderId = textValue(formData, 'workOrderId');
  const label = textValue(formData, 'label') ?? 'Evidencia tecnica';
  const photoFiles = fileValues(formData, 'vehiclePhotos');
  const uploadedPhotos = uploadedReceptionPhotos(formData);

  if (!vehicleId) throw new Error('Falta el vehiculo para guardar fotografias.');
  if (!workOrderId) throw new Error('Falta la orden para guardar fotografias.');
  if (!uploadedPhotos.length && !photoFiles.length) throw new Error('Selecciona al menos una fotografia.');

  let firstPhotoUrl: string | null = null;

  for (const photo of uploadedPhotos) {
    firstPhotoUrl = firstPhotoUrl ?? photo.photo_url;

    const { error } = await supabase.from('vehicle_photos').insert({
      workshop_id: WORKSHOP_ID,
      vehicle_id: vehicleId,
      work_order_id: workOrderId,
      photo_url: photo.photo_url,
      storage_path: photo.storage_path ?? null,
      label: photo.label ?? label,
    });

    if (error) throw new Error(error.message);
  }

  for (const file of photoFiles) {
    const uploaded = await uploadImage(file, `vehicles/${vehicleId}`);
    firstPhotoUrl = firstPhotoUrl ?? uploaded.publicUrl;

    const { error } = await supabase.from('vehicle_photos').insert({
      workshop_id: WORKSHOP_ID,
      vehicle_id: vehicleId,
      work_order_id: workOrderId,
      photo_url: uploaded.publicUrl,
      storage_path: uploaded.path,
      label,
    });

    if (error) throw new Error(error.message);
  }

  if (firstPhotoUrl) {
    const vehicleResult = await supabase
      .from('vehicles')
      .select('primary_image_url')
      .eq('id', vehicleId)
      .maybeSingle();

    if (!vehicleResult.data?.primary_image_url) {
      const { error } = await supabase
        .from('vehicles')
        .update({ primary_image_url: firstPhotoUrl })
        .eq('id', vehicleId);

      if (error && !missingColumn(error, 'primary_image_url')) throw new Error(error.message);
    }
  }

  revalidatePath('/');
  revalidatePath('/board');
  revalidatePath('/mechanic');
  revalidatePath('/customers');
  revalidatePath('/employee-portal');
}

export async function createInventoryItem(formData: FormData) {
  const name = textValue(formData, 'name');
  if (!name) throw new Error('El producto necesita nombre.');

  const imageFile = fileValues(formData, 'image').at(0);
  const uploaded = imageFile ? await uploadImage(imageFile, 'inventory') : null;

  const payload = {
    workshop_id: WORKSHOP_ID,
    name,
    category: textValue(formData, 'category'),
    stock: numberValue(formData, 'stock') ?? 0,
    min_stock: numberValue(formData, 'minStock') ?? 0,
    cost_price: numberValue(formData, 'costPrice') ?? 0,
    sale_price: numberValue(formData, 'salePrice') ?? 0,
    image_url: uploaded?.publicUrl ?? null,
  };

  const { error } = await supabase.from('inventory_items').insert(payload);
  if (missingColumn(error, 'image_url')) {
    const { image_url: _imageUrl, ...fallbackPayload } = payload;
    const { error: fallbackError } = await supabase.from('inventory_items').insert(fallbackPayload);
    if (fallbackError) throw new Error(fallbackError.message);
  } else if (error) {
    throw new Error(error.message);
  }

  revalidatePath('/');
  revalidatePath('/inventory');
  revalidatePath('/pos');
}

export async function createMechanic(formData: FormData) {
  await persistMechanic(formData);
}

export type MechanicFormState = {
  status: 'idle' | 'success' | 'error';
  message: string;
};

export async function createMechanicWithState(_previousState: MechanicFormState, formData: FormData): Promise<MechanicFormState> {
  try {
    const name = await persistMechanic(formData);
    return {
      status: 'success',
      message: `${name} fue guardado correctamente.`,
    };
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'No se pudo guardar el empleado.',
    };
  }
}

async function persistMechanic(formData: FormData) {
  const name = textValue(formData, 'name');
  if (!name) throw new Error('El mecanico necesita nombre.');
  const employmentStatus = textValue(formData, 'employmentStatus') ?? 'Activo';
  const documentNumber = documentValue(formData, 'documentNumber');
  const phone = textValue(formData, 'phone');
  const email = lowerTextValue(formData, 'email');

  if (!documentNumber) {
    throw new Error('La cedula/documento del empleado es obligatoria.');
  }

  const duplicateChecks = [
    { column: 'document_number', value: documentNumber, label: 'cedula/documento' },
    { column: 'email', value: email, label: 'correo' },
    { column: 'phone', value: phone, label: 'telefono' },
  ].filter((check) => check.value);

  for (const check of duplicateChecks) {
    const { data: duplicate, error: duplicateError } = await supabase
      .from('mechanics')
      .select('id, name')
      .eq('workshop_id', WORKSHOP_ID)
      .eq(check.column, check.value)
      .limit(1)
      .maybeSingle();

    if (duplicateError && !missingColumn(duplicateError, check.column)) throw new Error(duplicateError.message);
    if (duplicate) {
      throw new Error(`Ya existe un empleado con ese ${check.label}: ${duplicate.name}.`);
    }
  }

  const payload = {
    workshop_id: WORKSHOP_ID,
    name,
    role: textValue(formData, 'role'),
    specialty: textValue(formData, 'specialty'),
    phone,
    email,
    hourly_rate: numberValue(formData, 'hourlyRate') ?? 0,
    document_number: documentNumber,
    address: textValue(formData, 'address'),
    birth_date: dateValue(formData, 'birthDate'),
    hire_date: dateValue(formData, 'hireDate'),
    employment_status: employmentStatus,
    is_active: employmentStatus === 'Activo',
    contract_type: textValue(formData, 'contractType'),
    pay_scheme: textValue(formData, 'payScheme') ?? 'Salario fijo',
    payment_frequency: textValue(formData, 'paymentFrequency') ?? 'Quincenal',
    base_salary: numberValue(formData, 'baseSalary') ?? 0,
    commission_rate: numberValue(formData, 'commissionRate') ?? 0,
    supervisor_id: textValue(formData, 'supervisorId'),
    bank_name: textValue(formData, 'bankName'),
    bank_account_type: textValue(formData, 'bankAccountType'),
    bank_account_number: textValue(formData, 'bankAccountNumber'),
    internal_notes: textValue(formData, 'internalNotes'),
  };

  const { error } = await supabase.from('mechanics').insert(payload);
  if (error?.message?.includes('does not exist')) {
    const fallbackPayload = {
      workshop_id: WORKSHOP_ID,
      name,
      role: payload.role,
      specialty: payload.specialty,
      phone: payload.phone,
      email: payload.email,
      hourly_rate: payload.hourly_rate,
      is_active: payload.is_active,
    };
    const { error: fallbackError } = await supabase.from('mechanics').insert(fallbackPayload);
    if (fallbackError?.message?.includes('does not exist')) {
      const minimalPayload = {
        workshop_id: WORKSHOP_ID,
        name,
        role: payload.role,
        specialty: payload.specialty,
      };
      const { error: minimalError } = await supabase.from('mechanics').insert(minimalPayload);
      if (minimalError) throw new Error(minimalError.message);
    } else if (fallbackError) {
      throw new Error(fallbackError.message);
    }
  } else if (error) {
    throw new Error(error.message);
  }
  revalidatePath('/team');
  revalidatePath('/board');
  revalidatePath('/mechanic');
  revalidatePath('/employee-portal');
  revalidatePath('/hr');
  revalidatePath('/payroll');
  return name;
}

export async function recordAttendance(formData: FormData) {
  const mechanicId = textValue(formData, 'mechanicId');
  const workDate = dateValue(formData, 'workDate');
  if (!mechanicId || !workDate) throw new Error('Faltan datos de asistencia.');

  const checkIn = textValue(formData, 'checkIn');
  const checkOut = textValue(formData, 'checkOut');
  const hoursWorked = numberValue(formData, 'hoursWorked') ?? 0;
  const overtimeHours = numberValue(formData, 'overtimeHours') ?? Math.max(hoursWorked - 8, 0);

  const { error } = await supabase.from('attendance_records').upsert(
    {
      workshop_id: WORKSHOP_ID,
      mechanic_id: mechanicId,
      work_date: workDate,
      check_in: checkIn ? `${workDate}T${checkIn}:00-05:00` : null,
      check_out: checkOut ? `${workDate}T${checkOut}:00-05:00` : null,
      hours_worked: hoursWorked,
      overtime_hours: overtimeHours,
      late_minutes: numberValue(formData, 'lateMinutes') ?? 0,
      status: textValue(formData, 'status') ?? 'Presente',
      notes: textValue(formData, 'notes'),
    },
    { onConflict: 'workshop_id,mechanic_id,work_date' },
  );

  if (error) throw new Error(error.message);
  revalidatePath('/hr');
  revalidatePath('/payroll');
  revalidatePath('/employee-portal');
}

export async function createEmployeeAdvance(formData: FormData) {
  const mechanicId = textValue(formData, 'mechanicId');
  const amount = numberValue(formData, 'amount') ?? 0;
  if (!mechanicId || amount <= 0) throw new Error('Faltan datos del anticipo.');
  const deductionInstallments = Math.max(numberValue(formData, 'deductionInstallments') ?? 1, 1);
  const deductionAmount = numberValue(formData, 'deductionAmount') ?? amount / deductionInstallments;
  const advanceDate = dateValue(formData, 'advanceDate') ?? new Date().toISOString().slice(0, 10);

  const payload = {
    workshop_id: WORKSHOP_ID,
    mechanic_id: mechanicId,
    advance_date: advanceDate,
    amount,
    balance: amount,
    deduction_amount: deductionAmount,
    deduction_installments: deductionInstallments,
    deduction_period: textValue(formData, 'deductionPeriod') ?? 'Quincenal',
    deduction_start_date: dateValue(formData, 'deductionStartDate') ?? advanceDate,
    reason: textValue(formData, 'reason'),
    notes: textValue(formData, 'notes'),
    status: 'Pendiente',
  };

  let result = await supabase.from('employee_advances').insert(payload);
  if (missingSchemaColumn(result.error)) {
    const { balance: _balance, deduction_amount: _deductionAmount, deduction_installments: _deductionInstallments, deduction_period: _deductionPeriod, deduction_start_date: _deductionStartDate, notes: _notes, ...fallbackPayload } = payload;
    result = await supabase.from('employee_advances').insert(fallbackPayload);
  }

  if (result.error) throw new Error(result.error.message);
  revalidatePath('/hr');
  revalidatePath('/payroll');
}

export async function createEmployeeLoan(formData: FormData) {
  const mechanicId = textValue(formData, 'mechanicId');
  const principal = numberValue(formData, 'principal') ?? 0;
  const installments = numberValue(formData, 'installments') ?? 1;
  if (!mechanicId || principal <= 0 || installments <= 0) throw new Error('Faltan datos del prestamo.');

  const installmentAmount = numberValue(formData, 'installmentAmount') ?? principal / installments;
  const loanDate = dateValue(formData, 'loanDate') ?? new Date().toISOString().slice(0, 10);
  const payload = {
    workshop_id: WORKSHOP_ID,
    mechanic_id: mechanicId,
    loan_date: loanDate,
    principal,
    installments,
    installment_amount: installmentAmount,
    deduction_period: textValue(formData, 'deductionPeriod') ?? 'Quincenal',
    deduction_start_date: dateValue(formData, 'deductionStartDate') ?? loanDate,
    notes: textValue(formData, 'notes'),
    balance: principal,
    status: 'Activo',
  };

  let result = await supabase.from('employee_loans').insert(payload);
  if (missingSchemaColumn(result.error)) {
    const { deduction_period: _deductionPeriod, deduction_start_date: _deductionStartDate, notes: _notes, ...fallbackPayload } = payload;
    result = await supabase.from('employee_loans').insert(fallbackPayload);
  }

  if (result.error) throw new Error(result.error.message);
  revalidatePath('/hr');
  revalidatePath('/payroll');
}

export async function recordEmployeeLoanPayment(formData: FormData) {
  const loanId = textValue(formData, 'loanId');
  const mechanicId = textValue(formData, 'mechanicId');
  const amount = numberValue(formData, 'amount') ?? 0;
  if (!loanId || amount <= 0) throw new Error('Faltan datos del abono.');

  const loanResult = await supabase
    .from('employee_loans')
    .select('balance')
    .eq('id', loanId)
    .maybeSingle();

  if (loanResult.error) throw new Error(loanResult.error.message);
  if (!loanResult.data) throw new Error('No se encontro el prestamo.');

  const currentBalance = Number(loanResult.data.balance ?? 0);
  const appliedAmount = Math.min(amount, currentBalance);
  const nextBalance = Math.max(currentBalance - appliedAmount, 0);

  const paymentResult = await supabase.from('employee_loan_payments').insert({
    workshop_id: WORKSHOP_ID,
    loan_id: loanId,
    mechanic_id: mechanicId || null,
    payment_date: dateValue(formData, 'paymentDate') ?? new Date().toISOString().slice(0, 10),
    amount: appliedAmount,
    payment_method: textValue(formData, 'paymentMethod') ?? 'Nomina',
    reference: textValue(formData, 'reference'),
    notes: textValue(formData, 'notes'),
  });

  if (paymentResult.error) throw new Error(paymentResult.error.message);

  const { error } = await supabase
    .from('employee_loans')
    .update({
      balance: nextBalance,
      status: nextBalance === 0 ? 'Pagado' : 'Activo',
      updated_at: new Date().toISOString(),
    })
    .eq('id', loanId);

  if (missingColumn(error, 'updated_at')) {
    const fallback = await supabase
      .from('employee_loans')
      .update({
        balance: nextBalance,
        status: nextBalance === 0 ? 'Pagado' : 'Activo',
      })
      .eq('id', loanId);

    if (fallback.error) throw new Error(fallback.error.message);
  } else if (error) {
    throw new Error(error.message);
  }

  revalidatePath('/hr');
  revalidatePath('/payroll');
  revalidatePath('/employee-portal');
}

export async function createCommissionRule(formData: FormData) {
  const name = textValue(formData, 'name');
  const percent = numberValue(formData, 'percent') ?? 0;
  if (!name || percent <= 0) throw new Error('Faltan datos de la regla de comision.');

  const { error } = await supabase.from('commission_rules').insert({
    workshop_id: WORKSHOP_ID,
    name,
    applies_to: textValue(formData, 'appliesTo') ?? 'LABOR',
    percent,
    is_active: true,
  });

  if (error) throw new Error(error.message);
  revalidatePath('/payroll');
}

export async function updatePayrollParameters(formData: FormData) {
  const payload = {
    workshop_id: WORKSHOP_ID,
    minimum_wage: numberValue(formData, 'minimumWage') ?? 1423500,
    transport_allowance: numberValue(formData, 'transportAllowance') ?? 200000,
    month_base_days: numberValue(formData, 'monthBaseDays') ?? 30,
    health_rate_employee: numberValue(formData, 'healthRateEmployee') ?? 0.04,
    pension_rate_employee: numberValue(formData, 'pensionRateEmployee') ?? 0.04,
    solidarity_rate: numberValue(formData, 'solidarityRate') ?? 0.01,
    solidarity_salary_limit_smmlv: numberValue(formData, 'solidaritySalaryLimitSmmlv') ?? 4,
    arl_rate: numberValue(formData, 'arlRate') ?? 0.00522,
    compensation_rate: numberValue(formData, 'compensationRate') ?? 0.04,
    severance_rate: numberValue(formData, 'severanceRate') ?? 0.0833,
    severance_interest_rate_annual: numberValue(formData, 'severanceInterestRateAnnual') ?? 0.12,
    service_bonus_rate: numberValue(formData, 'serviceBonusRate') ?? 0.0833,
    vacation_rate: numberValue(formData, 'vacationRate') ?? 0.0417,
    transport_salary_limit_smmlv: numberValue(formData, 'transportSalaryLimitSmmlv') ?? 2,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('payroll_parameters').upsert(payload, { onConflict: 'workshop_id' });
  if (error) throw new Error(error.message);

  revalidatePath('/payroll');
}

export async function recordWorkOrderLabor(formData: FormData) {
  const workOrderId = textValue(formData, 'workOrderId');
  const mechanicId = textValue(formData, 'mechanicId');
  if (!workOrderId || !mechanicId) throw new Error('Faltan datos para registrar tiempo de la orden.');

  const hoursSpent = numberValue(formData, 'hoursSpent') ?? 0;
  const billableHours = numberValue(formData, 'billableHours') ?? hoursSpent;
  const laborRevenue = numberValue(formData, 'laborRevenue') ?? 0;
  const hourlyCost = numberValue(formData, 'hourlyCost') ?? 0;
  const commissionAmount = numberValue(formData, 'commissionAmount') ?? 0;
  const laborCost = hoursSpent * hourlyCost;

  const { error } = await supabase.from('work_order_labor').insert({
    workshop_id: WORKSHOP_ID,
    work_order_id: workOrderId,
    mechanic_id: mechanicId,
    role: textValue(formData, 'laborRole') ?? 'Principal',
    hours_spent: hoursSpent,
    billable_hours: billableHours,
    hourly_cost: hourlyCost,
    commission_amount: commissionAmount,
  });

  if (error) throw new Error(error.message);

  const existing = await supabase
    .from('work_orders')
    .select('hours_spent, labor_revenue, labor_cost, commission_cost')
    .eq('id', workOrderId)
    .single();

  if (existing.data) {
    const { error: updateError } = await supabase
      .from('work_orders')
      .update({
        hours_spent: Number(existing.data.hours_spent ?? 0) + hoursSpent,
        labor_revenue: Number(existing.data.labor_revenue ?? 0) + laborRevenue,
        labor_cost: Number(existing.data.labor_cost ?? 0) + laborCost,
        commission_cost: Number(existing.data.commission_cost ?? 0) + commissionAmount,
      })
      .eq('id', workOrderId);

    if (updateError && !updateError.message.includes('does not exist')) throw new Error(updateError.message);
  }

  revalidatePath('/board');
  revalidatePath('/mechanic');
  revalidatePath('/hr');
}

export async function createPayrollRun(formData: FormData) {
  const periodType = textValue(formData, 'periodType') ?? 'Mensual';
  const periodStart = dateValue(formData, 'periodStart');
  const periodEnd = dateValue(formData, 'periodEnd');
  if (!periodStart || !periodEnd) throw new Error('Falta el periodo de nomina.');
  const daysPaid = numberValue(formData, 'daysPaid') ?? daysBetween(periodStart, periodEnd);

  const existing = await supabase
    .from('payroll_runs')
    .select('id')
    .eq('workshop_id', WORKSHOP_ID)
    .eq('period_type', periodType)
    .eq('period_start', periodStart)
    .eq('period_end', periodEnd)
    .maybeSingle();

  if (existing.data) throw new Error('Ya existe una nomina para ese periodo.');

  let employeesResult: Awaited<ReturnType<typeof supabase.from>> | any = await supabase
    .from('mechanics')
    .select('id, name, base_salary, hourly_rate, commission_rate, pay_scheme')
    .eq('is_active', true);

  if (missingColumn(employeesResult.error, 'pay_scheme')) {
    employeesResult = await supabase
      .from('mechanics')
      .select('id, name, base_salary, hourly_rate, commission_rate')
      .eq('is_active', true);
  }

  const [attendanceResult, laborResult, advancesResult, loansResult] = await Promise.all([
    supabase.from('attendance_records').select('mechanic_id, hours_worked, overtime_hours').gte('work_date', periodStart).lte('work_date', periodEnd),
    supabase.from('work_order_labor').select('mechanic_id, billable_hours, hours_spent, commission_amount').gte('created_at', `${periodStart}T00:00:00`).lte('created_at', `${periodEnd}T23:59:59`),
    supabase.from('employee_advances').select('id, mechanic_id, amount, balance, deduction_amount, deduction_start_date').eq('status', 'Pendiente').lte('deduction_start_date', periodEnd),
    supabase.from('employee_loans').select('id, mechanic_id, installment_amount, balance, deduction_start_date').eq('status', 'Activo').lte('deduction_start_date', periodEnd),
  ]);

  const parametersResult = await supabase.from('payroll_parameters').select('*').eq('workshop_id', WORKSHOP_ID).maybeSingle();
  const parameters = parametersResult.data ?? {
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
    service_bonus_rate: 0.0833,
    vacation_rate: 0.0417,
    transport_salary_limit_smmlv: 2,
  };

  if (employeesResult.error) throw new Error(employeesResult.error.message);

  const employees = (employeesResult.data ?? []) as Array<{
    id: string;
    name?: string | null;
    base_salary?: number | null;
    hourly_rate?: number | null;
    commission_rate?: number | null;
    pay_scheme?: string | null;
  }>;
  const attendance = (attendanceResult.data ?? []) as Array<{ mechanic_id: string; hours_worked: number; overtime_hours: number }>;
  const labor = (laborResult.data ?? []) as Array<{ mechanic_id: string; billable_hours: number; hours_spent: number; commission_amount: number }>;
  let advances = (advancesResult.data ?? []) as Array<{ id: string; mechanic_id: string; amount: number; balance?: number | null; deduction_amount?: number | null; deduction_start_date?: string | null }>;
  let loans = (loansResult.data ?? []) as Array<{ id: string; mechanic_id: string; installment_amount: number; balance: number; deduction_start_date?: string | null }>;

  if (missingSchemaColumn(advancesResult.error)) {
    const fallbackAdvances = await supabase.from('employee_advances').select('id, mechanic_id, amount').eq('status', 'Pendiente').lte('advance_date', periodEnd);
    if (fallbackAdvances.error) throw new Error(fallbackAdvances.error.message);
    advances = (fallbackAdvances.data ?? []) as Array<{ id: string; mechanic_id: string; amount: number }>;
  } else if (advancesResult.error) {
    throw new Error(advancesResult.error.message);
  }

  if (missingSchemaColumn(loansResult.error)) {
    const fallbackLoans = await supabase.from('employee_loans').select('id, mechanic_id, installment_amount, balance').eq('status', 'Activo');
    if (fallbackLoans.error) throw new Error(fallbackLoans.error.message);
    loans = (fallbackLoans.data ?? []) as Array<{ id: string; mechanic_id: string; installment_amount: number; balance: number }>;
  } else if (loansResult.error) {
    throw new Error(loansResult.error.message);
  }

  const { data: run, error: runError } = await supabase
    .from('payroll_runs')
    .insert({
      workshop_id: WORKSHOP_ID,
      period_type: periodType,
      period_start: periodStart,
      period_end: periodEnd,
      status: 'Aprobada',
    })
    .select('id')
    .single();

  if (runError) throw new Error(runError.message);

  const payrollItems = employees.map((employee) => {
    const employeeAttendance = attendance.filter((row) => row.mechanic_id === employee.id);
    const employeeLabor = labor.filter((row) => row.mechanic_id === employee.id);
    const employeeAdvances = advances.filter((row) => row.mechanic_id === employee.id);
    const employeeLoans = loans.filter((row) => row.mechanic_id === employee.id);

    const regularHours = employeeAttendance.reduce((sum, row) => sum + Number(row.hours_worked), 0);
    const overtimeHours = employeeAttendance.reduce((sum, row) => sum + Number(row.overtime_hours), 0);
    const billableHours = employeeLabor.reduce((sum, row) => sum + Number(row.billable_hours), 0);
    const hoursSpent = employeeLabor.reduce((sum, row) => sum + Number(row.hours_spent), 0);
    const baseSalary = Number(employee.base_salary ?? 0);
    const hourlyRate = Number(employee.hourly_rate ?? 0);
    const payScheme = employee.pay_scheme ?? 'Salario fijo';
    const monthBaseDays = Number(parameters.month_base_days ?? 30) || 30;
    const salaryAmount = ['Salario fijo', 'Salario + comision'].includes(payScheme) ? (baseSalary / monthBaseDays) * daysPaid : 0;
    const hourlyAmount = ['Por hora', 'Hora + comision'].includes(payScheme) ? regularHours * hourlyRate : 0;
    const overtimeAmount = overtimeHours * hourlyRate * 1.25;
    const commissions = employeeLabor.reduce((sum, row) => sum + Number(row.commission_amount), 0);
    const advanceTotal = employeeAdvances.reduce((sum, row) => {
      const balance = Number(row.balance ?? row.amount ?? 0);
      const installment = Number(row.deduction_amount ?? row.amount ?? 0);
      return sum + Math.min(installment, balance);
    }, 0);
    const loanDeduction = employeeLoans.reduce((sum, row) => sum + Math.min(Number(row.installment_amount), Number(row.balance)), 0);
    const baseForContributions = salaryAmount + hourlyAmount + overtimeAmount;
    const transportLimit = Number(parameters.minimum_wage ?? 0) * Number(parameters.transport_salary_limit_smmlv ?? 2);
    const transportAllowance = baseSalary > 0 && baseSalary <= transportLimit ? (Number(parameters.transport_allowance ?? 0) / monthBaseDays) * daysPaid : 0;
    const healthDeduction = baseForContributions * Number(parameters.health_rate_employee ?? 0.04);
    const pensionDeduction = baseForContributions * Number(parameters.pension_rate_employee ?? 0.04);
    const solidarityDeduction = baseForContributions >= Number(parameters.minimum_wage ?? 0) * Number(parameters.solidarity_salary_limit_smmlv ?? 4)
      ? baseForContributions * Number(parameters.solidarity_rate ?? 0.01)
      : 0;
    const grossPay = salaryAmount + hourlyAmount + overtimeAmount + commissions + transportAllowance;
    const totalDeductions = healthDeduction + pensionDeduction + solidarityDeduction + advanceTotal + loanDeduction;
    const employerBenefits = baseForContributions * (
      Number(parameters.arl_rate ?? 0) +
      Number(parameters.compensation_rate ?? 0) +
      Number(parameters.severance_rate ?? 0) +
      Number(parameters.service_bonus_rate ?? 0) +
      Number(parameters.vacation_rate ?? 0)
    );
    const netPay = Math.max(grossPay - totalDeductions, 0);
    const productivity = regularHours > 0 ? (billableHours / regularHours) * 100 : hoursSpent > 0 ? (billableHours / hoursSpent) * 100 : 0;

    return {
      payroll_run_id: run.id,
      workshop_id: WORKSHOP_ID,
      mechanic_id: employee.id,
      pay_scheme: payScheme,
      base_salary: salaryAmount + hourlyAmount,
      days_paid: daysPaid,
      regular_hours: regularHours,
      overtime_hours: overtimeHours,
      overtime_amount: overtimeAmount,
      transport_allowance: transportAllowance,
      health_deduction: healthDeduction,
      pension_deduction: pensionDeduction,
      solidarity_deduction: solidarityDeduction,
      commissions,
      advances: advanceTotal,
      loan_deductions: loanDeduction,
      total_deductions: totalDeductions,
      employer_benefits: employerBenefits,
      gross_pay: grossPay,
      net_pay: netPay,
      productivity,
    };
  });

  if (payrollItems.length) {
    const { error: itemError } = await supabase.from('payroll_items').insert(payrollItems);
    if (itemError?.message?.includes('does not exist')) {
      const fallbackItems = payrollItems.map(({
        pay_scheme: _payScheme,
        days_paid: _daysPaid,
        transport_allowance: _transportAllowance,
        health_deduction: _healthDeduction,
        pension_deduction: _pensionDeduction,
        solidarity_deduction: _solidarityDeduction,
        total_deductions: _totalDeductions,
        employer_benefits: _employerBenefits,
        ...item
      }) => item);
      const { error: fallbackError } = await supabase.from('payroll_items').insert(fallbackItems);
      if (fallbackError) throw new Error(fallbackError.message);
    } else if (itemError) {
      throw new Error(itemError.message);
    }
  }

  const grossTotal = payrollItems.reduce((sum, item) => sum + item.gross_pay, 0);
  const deductionsTotal = payrollItems.reduce((sum, item) => sum + item.advances + item.loan_deductions, 0);
  const netTotal = payrollItems.reduce((sum, item) => sum + item.net_pay, 0);
  const reference = `PAY-${periodType}-${periodStart}-${periodEnd}`;

  const { data: tx, error: txError } = await supabase
    .from('financial_transactions')
    .insert({
      workshop_id: WORKSHOP_ID,
      type: 'EXPENSE',
      amount: netTotal,
      category: 'Nomina',
      description: `Nomina ${periodType} ${periodStart} a ${periodEnd}`,
      reference,
      source: 'payroll',
    })
    .select('id')
    .single();

  if (txError) throw new Error(txError.message);

  const account = await supabase.from('treasury_accounts').select('id').eq('workshop_id', WORKSHOP_ID).eq('name', 'Caja General').maybeSingle();
  await supabase.from('treasury_transactions').insert({
    workshop_id: WORKSHOP_ID,
    account_id: account.data?.id ?? null,
    type: 'EXPENSE',
    amount: netTotal,
    category: 'Nomina',
    description: `Pago nomina ${periodType}`,
    reference,
    source: 'payroll',
    financial_transaction_id: tx.id,
  });

  await supabase
    .from('payroll_runs')
    .update({
      gross_total: grossTotal,
      deductions_total: deductionsTotal,
      net_total: netTotal,
      financial_transaction_id: tx.id,
      paid_at: new Date().toISOString(),
    })
    .eq('id', run.id);

  for (const advance of advances) {
    const balance = Number(advance.balance ?? advance.amount ?? 0);
    const installment = Math.min(Number(advance.deduction_amount ?? advance.amount ?? 0), balance);
    const nextBalance = Math.max(balance - installment, 0);

    let advanceUpdate = await supabase
      .from('employee_advances')
      .update({
        balance: nextBalance,
        status: nextBalance === 0 ? 'Descontado' : 'Pendiente',
        updated_at: new Date().toISOString(),
      })
      .eq('id', advance.id);

    if (missingSchemaColumn(advanceUpdate.error)) {
      advanceUpdate = await supabase
        .from('employee_advances')
        .update({ status: 'Descontado' })
        .eq('id', advance.id);
    }
  }

  for (const loan of loans) {
    const installment = Math.min(Number(loan.installment_amount), Number(loan.balance));
    const nextBalance = Math.max(Number(loan.balance) - installment, 0);
    await supabase.from('employee_loans').update({ balance: nextBalance, status: nextBalance === 0 ? 'Pagado' : 'Activo' }).eq('id', loan.id);

    if (installment > 0) {
      const loanPaymentResult = await supabase.from('employee_loan_payments').insert({
        workshop_id: WORKSHOP_ID,
        loan_id: loan.id,
        mechanic_id: loan.mechanic_id,
        payment_date: periodEnd,
        amount: installment,
        payment_method: 'Nomina',
        reference: `Nomina ${periodStart} a ${periodEnd}`,
      });

      if (loanPaymentResult.error && !missingSchemaColumn(loanPaymentResult.error)) {
        throw new Error(loanPaymentResult.error.message);
      }
    }
  }

  revalidatePath('/');
  revalidatePath('/accounting');
  revalidatePath('/hr');
  revalidatePath('/payroll');
  revalidatePath('/employee-portal');
}

export async function createEmployeeLiquidation(formData: FormData) {
  const mechanicId = textValue(formData, 'mechanicId');
  const startDate = dateValue(formData, 'startDate');
  const endDate = dateValue(formData, 'endDate');
  if (!mechanicId || !startDate || !endDate) throw new Error('Faltan datos para liquidar empleado.');

  const [employeeResult, parametersResult] = await Promise.all([
    supabase.from('mechanics').select('id, base_salary').eq('id', mechanicId).single(),
    supabase.from('payroll_parameters').select('*').eq('workshop_id', WORKSHOP_ID).maybeSingle(),
  ]);
  if (employeeResult.error) throw new Error(employeeResult.error.message);

  const parameters = parametersResult.data ?? {
    minimum_wage: 1423500,
    transport_allowance: 200000,
    month_base_days: 30,
    severance_rate: 0.0833,
    severance_interest_rate_annual: 0.12,
    service_bonus_rate: 0.0833,
    vacation_rate: 0.0417,
    transport_salary_limit_smmlv: 2,
  };

  const daysWorked = daysBetween(startDate, endDate);
  const baseSalary = numberValue(formData, 'baseSalary') ?? Number(employeeResult.data.base_salary ?? 0);
  const monthlyTransport = baseSalary <= Number(parameters.minimum_wage ?? 0) * Number(parameters.transport_salary_limit_smmlv ?? 2)
    ? Number(parameters.transport_allowance ?? 0)
    : 0;
  const salaryBase = baseSalary + monthlyTransport;
  const severance = (salaryBase * daysWorked) / 360;
  const severanceInterest = severance * Number(parameters.severance_interest_rate_annual ?? 0.12) * (daysWorked / 360);
  const serviceBonus = (salaryBase * daysWorked) / 360;
  const vacations = (baseSalary * daysWorked) / 720;
  const deductions = numberValue(formData, 'deductions') ?? 0;
  const netTotal = severance + severanceInterest + serviceBonus + vacations - deductions;

  const { data, error } = await supabase
    .from('employee_liquidations')
    .insert({
      workshop_id: WORKSHOP_ID,
      mechanic_id: mechanicId,
      start_date: startDate,
      end_date: endDate,
      days_worked: daysWorked,
      base_salary: baseSalary,
      transport_allowance: monthlyTransport,
      severance,
      severance_interest: severanceInterest,
      service_bonus: serviceBonus,
      vacations,
      deductions,
      net_total: netTotal,
      reason: textValue(formData, 'reason'),
    })
    .select('id')
    .single();

  if (error) throw new Error(error.message);

  revalidatePath('/payroll');
  redirect(`/documents/liquidation/${data.id}`);
}

export async function assignWorkOrder(formData: FormData) {
  const id = textValue(formData, 'workOrderId');
  const mechanicId = textValue(formData, 'mechanicId');
  if (!id) throw new Error('Falta la orden.');
  if (!mechanicId) throw new Error('Selecciona un mecanico para asignar la orden.');

  const { error } = await supabase
    .from('work_orders')
    .update({
      mechanic_id: mechanicId,
      estimated_hours: numberValue(formData, 'estimatedHours') ?? 0,
      status: textValue(formData, 'status') ?? 'En reparacion',
    })
    .eq('id', id);

  if (error) throw new Error(error.message);
  revalidatePath('/board');
  revalidatePath('/mechanic');
}

export async function unassignWorkOrder(formData: FormData) {
  const id = textValue(formData, 'workOrderId');
  if (!id) throw new Error('Falta la orden.');
  const currentStatus = textValue(formData, 'status') ?? 'Recibido';
  const nextStatus = boardStatusNeedsMechanic(currentStatus) ? 'Diagnostico' : currentStatus;

  const { error } = await supabase
    .from('work_orders')
    .update({
      mechanic_id: null,
      status: nextStatus,
    })
    .eq('id', id);

  if (error) throw new Error(error.message);
  revalidatePath('/board');
  revalidatePath('/mechanic');
}

export async function deleteWorkOrder(formData: FormData) {
  const id = textValue(formData, 'workOrderId');
  if (!id) throw new Error('Falta la orden.');

  const { error } = await supabase
    .from('work_orders')
    .delete()
    .eq('id', id)
    .eq('workshop_id', WORKSHOP_ID);

  if (error) throw new Error(error.message);
  revalidatePath('/board');
  revalidatePath('/customers');
  revalidatePath('/mechanic');
  revalidatePath('/quotations');
}

export async function updateWorkOrderStatus(formData: FormData) {
  const id = textValue(formData, 'workOrderId');
  const status = textValue(formData, 'status');
  if (!id || !status) throw new Error('Faltan datos para actualizar la orden.');

  if (boardStatusNeedsMechanic(status)) {
    const result = await supabase
      .from('work_orders')
      .update({ status })
      .eq('id', id)
      .not('mechanic_id', 'is', null)
      .select('id')
      .maybeSingle();

    if (result.error) throw new Error(result.error.message);
    if (!result.data) throw new Error('Asigna un mecanico antes de mover la orden despues de Diagnostico.');
  } else {
    const { error } = await supabase.from('work_orders').update({ status }).eq('id', id);
    if (error) throw new Error(error.message);
  }

  revalidatePath('/board');
}

export async function updateWorkOrderDetails(formData: FormData) {
  const workOrderId = textValue(formData, 'workOrderId');
  const customerId = textValue(formData, 'customerId');
  const vehicleId = textValue(formData, 'vehicleId');
  const customerName = textValue(formData, 'customerName');
  const phone = phoneValue(formData, 'phone');
  const email = lowerTextValue(formData, 'email');
  const plate = textValue(formData, 'plate')?.toUpperCase();
  const makeModel = textValue(formData, 'makeModel');
  const vehicleType = textValue(formData, 'vehicleType') ?? 'Carro';
  const year = numberValue(formData, 'year');
  const mileage = numberValue(formData, 'mileage');
  const vehicleCondition = textValue(formData, 'vehicleCondition') ?? 'Recibido';
  const issueDescription = textValue(formData, 'issueDescription');
  const technicalProfile = vehicleTechnicalPayload(formData);

  if (!workOrderId || !customerId || !vehicleId || !customerName || !plate || !makeModel) {
    throw new Error('Faltan datos para editar el ingreso.');
  }

  const { data: plateOwners, error: plateOwnerError } = await supabase
    .from('vehicles')
    .select('id')
    .eq('workshop_id', WORKSHOP_ID)
    .eq('plate', plate);

  if (plateOwnerError) throw new Error(plateOwnerError.message);
  if ((plateOwners ?? []).some((owner) => owner.id !== vehicleId)) {
    throw new Error(`La placa ${plate} ya esta registrada en otro vehiculo.`);
  }

  const { error: customerError } = await supabase
    .from('customers')
    .update({
      name: customerName,
      phone,
      email,
    })
    .eq('id', customerId);

  if (customerError) throw new Error(customerError.message);

  const vehicleUpdatePayload = {
    plate,
    make_model: makeModel,
    type: vehicleType,
    year,
    mileage,
    condition_status: vehicleCondition,
    ...technicalProfile,
  };

  let vehicleUpdate = await supabase
    .from('vehicles')
    .update(vehicleUpdatePayload)
    .eq('id', vehicleId);

  if (missingColumn(vehicleUpdate.error, 'condition_status') || missingVehicleTechnicalColumn(vehicleUpdate.error)) {
    const fallbackPayload = vehicleFallbackPayload(vehicleUpdatePayload, vehicleUpdate.error);
    vehicleUpdate = await supabase
      .from('vehicles')
      .update(fallbackPayload)
      .eq('id', vehicleId);
  }

  if (vehicleUpdate.error) throw new Error(vehicleUpdate.error.message);

  let orderUpdate = await supabase
    .from('work_orders')
    .update({
      vehicle_condition: vehicleCondition,
      issue_description: issueDescription,
    })
    .eq('id', workOrderId);

  if (missingColumn(orderUpdate.error, 'vehicle_condition')) {
    orderUpdate = await supabase
      .from('work_orders')
      .update({
        issue_description: issueDescription,
      })
      .eq('id', workOrderId);
  }

  if (orderUpdate.error) throw new Error(orderUpdate.error.message);

  revalidatePath('/');
  revalidatePath('/board');
  revalidatePath('/customers');
  revalidatePath('/mechanic');
}

export async function createDiagnosis(formData: FormData) {
  const workOrderId = textValue(formData, 'workOrderId');
  const mechanicId = textValue(formData, 'mechanicId');
  const vehicleId = textValue(formData, 'vehicleId');
  const vehicleCondition = textValue(formData, 'vehicleCondition');
  const diagnosis = textValue(formData, 'diagnosis');
  const damageDescription = textValue(formData, 'damageDescription');
  const severity = textValue(formData, 'severity');
  const recommendedSpecialty = textValue(formData, 'recommendedSpecialty');
  const recommendedWork = textValue(formData, 'recommendedWork');
  const estimatedHours = numberValue(formData, 'estimatedHours') ?? 0;

  if (!workOrderId || !vehicleCondition || !diagnosis) {
    throw new Error('Faltan datos para guardar el diagnostico.');
  }

  const diagnosisPayload = {
    workshop_id: WORKSHOP_ID,
    work_order_id: workOrderId,
    mechanic_id: mechanicId,
    vehicle_condition: vehicleCondition,
    diagnosis,
    damage_description: damageDescription,
    severity,
    recommended_specialty: recommendedSpecialty,
    recommended_work: recommendedWork,
    estimated_hours: estimatedHours,
  };

  let diagnosisResult = await supabase.from('work_order_diagnostics').insert(diagnosisPayload);

  if (
    missingColumn(diagnosisResult.error, 'damage_description') ||
    missingColumn(diagnosisResult.error, 'severity') ||
    missingColumn(diagnosisResult.error, 'recommended_specialty')
  ) {
    const fallbackRecommendedWork = [
      recommendedWork,
      damageDescription ? `Danos observados: ${damageDescription}` : null,
      severity ? `Severidad: ${severity}` : null,
      recommendedSpecialty ? `Especialidad recomendada: ${recommendedSpecialty}` : null,
    ].filter(Boolean).join('\n\n');

    const {
      damage_description: _damageDescription,
      severity: _severity,
      recommended_specialty: _recommendedSpecialty,
      ...fallbackPayload
    } = {
      ...diagnosisPayload,
      recommended_work: fallbackRecommendedWork || recommendedWork,
    };

    diagnosisResult = await supabase.from('work_order_diagnostics').insert(fallbackPayload);
  }

  if (diagnosisResult.error) throw new Error(diagnosisResult.error.message);

  const diagnosisSummary = [
    diagnosis,
    damageDescription ? `Danos: ${damageDescription}` : null,
    severity ? `Severidad: ${severity}` : null,
    recommendedSpecialty ? `Especialidad sugerida: ${recommendedSpecialty}` : null,
  ].filter(Boolean).join(' | ');

  let orderUpdate = await supabase
    .from('work_orders')
    .update({
      status: 'Diagnostico',
      vehicle_condition: vehicleCondition,
      diagnosis_summary: diagnosisSummary,
      estimated_hours: estimatedHours,
    })
    .eq('id', workOrderId);

  if (missingColumn(orderUpdate.error, 'vehicle_condition') || missingColumn(orderUpdate.error, 'diagnosis_summary')) {
    orderUpdate = await supabase
      .from('work_orders')
      .update({
        status: 'Diagnostico',
        estimated_hours: estimatedHours,
      })
      .eq('id', workOrderId);
  }

  if (orderUpdate.error) throw new Error(orderUpdate.error.message);

  if (vehicleId) {
    const { error: vehicleError } = await supabase
      .from('vehicles')
      .update({ condition_status: vehicleCondition })
      .eq('id', vehicleId);

    if (vehicleError && !missingColumn(vehicleError, 'condition_status')) throw new Error(vehicleError.message);
  }

  revalidatePath('/');
  revalidatePath('/board');
  revalidatePath('/mechanic');
}

export async function createFinancialTransaction(formData: FormData) {
  const type = textValue(formData, 'type') ?? 'EXPENSE';
  const amount = numberValue(formData, 'amount') ?? 0;
  const category = textValue(formData, 'category') ?? 'General';
  const description = textValue(formData, 'description');
  if (!description || amount <= 0) throw new Error('Faltan datos del movimiento.');

  const { error } = await supabase.from('financial_transactions').insert({
    workshop_id: WORKSHOP_ID,
    type,
    amount,
    category,
    description,
    reference: textValue(formData, 'reference'),
    source: 'manual',
  });

  if (error) throw new Error(error.message);
  revalidatePath('/');
  revalidatePath('/accounting');
}

export async function createTreasuryTransaction(formData: FormData) {
  const type = textValue(formData, 'type') ?? 'EXPENSE';
  const amount = numberValue(formData, 'amount') ?? 0;
  const category = textValue(formData, 'category') ?? 'General';
  const description = textValue(formData, 'description');
  const accountId = textValue(formData, 'accountId');
  if (!description || amount <= 0) throw new Error('Faltan datos del movimiento de tesoreria.');

  const reference = textValue(formData, 'reference') ?? `TES-${Date.now()}`;
  const { data: tx, error: txError } = await supabase
    .from('financial_transactions')
    .insert({
      workshop_id: WORKSHOP_ID,
      type,
      amount,
      category,
      description,
      reference,
      source: 'treasury',
    })
    .select('id')
    .single();

  if (txError) throw new Error(txError.message);

  const { error } = await supabase.from('treasury_transactions').insert({
    workshop_id: WORKSHOP_ID,
    account_id: accountId,
    type,
    amount,
    category,
    description,
    reference,
    source: 'manual',
    financial_transaction_id: tx.id,
  });

  if (error) throw new Error(error.message);
  await updateTreasuryAccountBalance(accountId, type, amount);
  revalidatePath('/');
  revalidatePath('/accounting');
  revalidatePath('/expenses');
  revalidatePath('/reports');
  revalidatePath('/treasury');
}

async function updateTreasuryAccountBalance(accountId: string | null, type: string, amount: number) {
  if (!accountId || amount <= 0 || !['INCOME', 'EXPENSE'].includes(type)) return;

  const account = await supabase
    .from('treasury_accounts')
    .select('balance')
    .eq('id', accountId)
    .maybeSingle();

  if (account.error || !account.data) return;

  const currentBalance = Number(account.data.balance ?? 0);
  const nextBalance = type === 'INCOME' ? currentBalance + amount : currentBalance - amount;
  await supabase.from('treasury_accounts').update({ balance: nextBalance }).eq('id', accountId);
}

export async function createOperatingExpense(formData: FormData) {
  const amount = numberValue(formData, 'amount') ?? 0;
  const category = textValue(formData, 'category') ?? 'Gasto operativo';
  const description = textValue(formData, 'description');
  const accountId = textValue(formData, 'accountId');
  const transactionDate = dateValue(formData, 'transactionDate') ?? new Date().toISOString().slice(0, 10);
  const reference = textValue(formData, 'reference') ?? `GTO-${Date.now()}`;
  const receiptFile = fileValues(formData, 'receipt').at(0);
  const receipt = receiptFile ? await uploadImage(receiptFile, 'expenses') : null;

  if (!description || amount <= 0) throw new Error('Faltan datos del gasto.');

  const payload = {
    workshop_id: WORKSHOP_ID,
    type: 'EXPENSE',
    amount,
    category,
    description,
    reference,
    source: 'expense',
    transaction_date: transactionDate,
    vendor: textValue(formData, 'vendor'),
    responsible: textValue(formData, 'responsible'),
    payment_method: textValue(formData, 'paymentMethod') ?? 'Caja',
    approval_status: textValue(formData, 'approvalStatus') ?? 'Aprobado',
    receipt_url: receipt?.publicUrl ?? null,
    receipt_storage_path: receipt?.path ?? null,
    affects_cash: Boolean(accountId),
    notes: textValue(formData, 'notes'),
  };

  let txResult = await supabase
    .from('financial_transactions')
    .insert(payload)
    .select('id')
    .single();

  if (missingSchemaColumn(txResult.error)) {
    const {
      transaction_date: _transactionDate,
      vendor: _vendor,
      responsible: _responsible,
      payment_method: _paymentMethod,
      approval_status: _approvalStatus,
      receipt_url: _receiptUrl,
      receipt_storage_path: _receiptStoragePath,
      affects_cash: _affectsCash,
      notes: _notes,
      ...fallbackPayload
    } = payload;

    txResult = await supabase
      .from('financial_transactions')
      .insert(fallbackPayload)
      .select('id')
      .single();
  }

  if (txResult.error) throw new Error(txResult.error.message);

  if (accountId) {
    const treasuryPayload = {
      workshop_id: WORKSHOP_ID,
      account_id: accountId,
      type: 'EXPENSE',
      amount,
      category,
      description,
      reference,
      source: 'expense',
      financial_transaction_id: txResult.data.id,
      transaction_date: transactionDate,
      vendor: payload.vendor,
      responsible: payload.responsible,
      payment_method: payload.payment_method,
      receipt_url: payload.receipt_url,
      receipt_storage_path: payload.receipt_storage_path,
      notes: payload.notes,
    };

    let treasuryResult = await supabase.from('treasury_transactions').insert(treasuryPayload);

    if (missingSchemaColumn(treasuryResult.error)) {
      const {
        transaction_date: _transactionDate,
        vendor: _vendor,
        responsible: _responsible,
        payment_method: _paymentMethod,
        receipt_url: _receiptUrl,
        receipt_storage_path: _receiptStoragePath,
        notes: _notes,
        ...fallbackTreasuryPayload
      } = treasuryPayload;

      treasuryResult = await supabase.from('treasury_transactions').insert(fallbackTreasuryPayload);
    }

    if (treasuryResult.error) throw new Error(treasuryResult.error.message);
    await updateTreasuryAccountBalance(accountId, 'EXPENSE', amount);
  }

  revalidatePath('/');
  revalidatePath('/expenses');
  revalidatePath('/accounting');
  revalidatePath('/treasury');
  revalidatePath('/reports');
}

export async function createQuotation(formData: FormData) {
  const customerId = textValue(formData, 'customerId');
  const workOrderId = textValue(formData, 'workOrderId');
  const description = textValue(formData, 'description');
  const quantity = numberValue(formData, 'quantity') ?? 1;
  const unitPrice = numberValue(formData, 'unitPrice') ?? 0;
  const itemsPayload = textValue(formData, 'itemsJson');

  let items: Array<{ description: string; quantity: number; unitPrice: number; taxRate: number }> = [];

  if (itemsPayload) {
    try {
      const parsed = JSON.parse(itemsPayload);
      if (Array.isArray(parsed)) {
        items = parsed
          .map((item) => ({
            description: typeof item.description === 'string' ? item.description.trim() : '',
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice),
            taxRate: Number(item.taxRate ?? 0),
          }))
          .filter((item) => (
            item.description &&
            !placeholderQuotationLine(item.description) &&
            Number.isFinite(item.quantity) &&
            item.quantity > 0 &&
            Number.isFinite(item.unitPrice) &&
            item.unitPrice >= 0 &&
            Number.isFinite(item.taxRate) &&
            item.taxRate >= 0
          ));
      }
    } catch {
      items = [];
    }
  }

  if (!items.length && description) {
    items = [{ description, quantity, unitPrice, taxRate: 0 }];
  }

  if (!items.length || items.some((item) => item.quantity <= 0 || item.unitPrice < 0)) {
    throw new Error('La cotizacion necesita al menos un trabajo o repuesto con cantidad y precio validos.');
  }

  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const taxes = items.reduce((sum, item) => sum + item.quantity * item.unitPrice * (item.taxRate / 100), 0);
  const total = subtotal + taxes;

  const { data: quote, error: quoteError } = await supabase
    .from('quotations')
    .insert({
      workshop_id: WORKSHOP_ID,
      customer_id: customerId,
      work_order_id: workOrderId,
      status: 'Pendiente',
      subtotal,
      taxes,
      total,
    })
    .select('id')
    .single();

  if (blockedByPolicy(quoteError)) {
    redirectQuotationError('Supabase bloqueo la cotizacion por politicas RLS. Ejecuta supabase/20_quotation_rls_policies.sql en el SQL Editor.');
  }
  if (quoteError) throw new Error(quoteError.message);

  const itemRows = items.map((item) => {
    const lineSubtotal = item.quantity * item.unitPrice;
    const taxAmount = lineSubtotal * (item.taxRate / 100);

    return {
      quotation_id: quote.id,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      subtotal: lineSubtotal,
      tax_rate: item.taxRate,
      tax_amount: taxAmount,
      total: lineSubtotal + taxAmount,
    };
  });

  let itemResult = await supabase.from('quotation_items').insert(itemRows);

  if (missingSchemaColumn(itemResult.error)) {
    itemResult = await supabase.from('quotation_items').insert(
      itemRows.map(({ subtotal: _subtotal, tax_rate: _taxRate, tax_amount: _taxAmount, ...item }) => item),
    );
  }

  const { error: itemError } = itemResult;

  if (blockedByPolicy(itemError)) {
    redirectQuotationError('Supabase bloqueo los items de la cotizacion por politicas RLS. Ejecuta supabase/20_quotation_rls_policies.sql en el SQL Editor.');
  }
  if (itemError) throw new Error(itemError.message);

  if (workOrderId) {
    await supabase.from('work_orders').update({ status: 'Presupuesto pendiente', total_amount: total }).eq('id', workOrderId);
  }

  revalidatePath('/');
  revalidatePath('/board');
  revalidatePath('/quotations');
  redirect(`/documents/quotation/${quote.id}`);
}

export async function updateQuotationStatus(formData: FormData) {
  const quotationId = textValue(formData, 'quotationId');
  const status = textValue(formData, 'status');
  if (!quotationId || !status) throw new Error('Faltan datos de la cotizacion.');

  const { error } = await supabase.from('quotations').update({ status }).eq('id', quotationId);
  if (blockedByPolicy(error)) {
    redirectQuotationError('Supabase bloqueo la actualizacion de la cotizacion por politicas RLS. Ejecuta supabase/20_quotation_rls_policies.sql en el SQL Editor.');
  }
  if (error) throw new Error(error.message);

  revalidatePath('/quotations');
}

export async function checkoutSale(formData: FormData) {
  const payload = textValue(formData, 'payload');
  const paymentMethod = textValue(formData, 'paymentMethod') ?? 'cash';
  const customerName = textValue(formData, 'customerName') ?? 'Consumidor final';
  const customerDocument = normalizedDocumentValue(formData, 'customerDocument');
  const customerPhone = phoneValue(formData, 'customerPhone');
  const customerEmail = lowerTextValue(formData, 'customerEmail');
  if (!payload) redirectPosError('El carrito esta vacio. Selecciona al menos un producto.');

  let items: Array<{
      id: string;
      name: string;
      quantity: number;
      costPrice: number;
      salePrice: number;
      stock: number;
      imageUrl?: string | null;
    }> = [];

  try {
    items = JSON.parse(payload) as typeof items;
  } catch {
    redirectPosError('No se pudo leer el carrito. Recarga el POS e intenta de nuevo.');
  }

  if (!items.length) redirectPosError('El carrito esta vacio. Selecciona al menos un producto.');

  const fastCheckout = await supabase.rpc('pos_checkout_fast', {
    p_workshop_id: WORKSHOP_ID,
    p_payment_method: paymentMethod,
    p_customer_name: customerName,
    p_customer_document: customerDocument,
    p_customer_phone: customerPhone,
    p_customer_email: customerEmail,
    p_items: items,
  });

  if (!fastCheckout.error) {
    const fastSale = Array.isArray(fastCheckout.data) ? fastCheckout.data[0] : fastCheckout.data;
    if (fastSale?.sale_id) {
      revalidatePath('/');
      revalidatePath('/pos');
      revalidatePath('/inventory');
      revalidatePath('/accounting');
      redirect(`/documents/sale/${fastSale.sale_id}`);
    }
  } else {
    const message = fastCheckout.error.message ?? '';
    const canUseLegacyCheckout = message.includes('Could not find the function') || message.includes('schema cache') || message.includes('does not exist');
    if (!canUseLegacyCheckout) {
      redirectPosError(message);
    }
  }

  const ids = [...new Set(items.map((item) => item.id))];
  let stockResult: Awaited<ReturnType<ReturnType<typeof supabase.from>['select']>> | any = await supabase
    .from('inventory_items')
    .select('id, stock, image_url')
    .in('id', ids);

  if (missingColumn(stockResult.error, 'image_url')) {
    stockResult = await supabase
      .from('inventory_items')
      .select('id, stock')
      .in('id', ids);
  }

  const { data: currentProducts, error: stockReadError } = stockResult;
  if (stockReadError && !missingColumn(stockReadError, 'image_url')) {
    redirectPosError(`No se pudo validar el inventario: ${stockReadError.message}`);
  }

  const stockMap = new Map<string, number>((currentProducts ?? []).map((product: any) => [String(product.id), Number(product.stock ?? 0)]));
  const imageMap = new Map<string, string | null>((currentProducts ?? []).map((product: any) => [String(product.id), typeof product.image_url === 'string' ? product.image_url : null]));

  for (const item of items) {
    if (!item.id || item.quantity <= 0) redirectPosError('Hay un producto invalido en el carrito.');
    const currentStock = stockMap.get(item.id) ?? Number(item.stock ?? 0);
    if (currentStock < item.quantity) {
      redirectPosError(`Stock insuficiente para ${item.name}. Disponible: ${currentStock}.`);
    }
  }

  let customerId: string | null = null;
  const shouldCreateCustomer = customerName !== 'Consumidor final' || Boolean(customerPhone || customerEmail || customerDocument);

  if (shouldCreateCustomer) {
    try {
      customerId = await upsertCustomerIdentity({
        name: customerName,
        phone: customerPhone,
        email: customerEmail,
        documentNumber: customerDocument,
      });
    } catch {
      customerId = null;
    }
  }

  const subtotal = items.reduce((sum, item) => sum + item.salePrice * item.quantity, 0);
  const costTotal = items.reduce((sum, item) => sum + item.costPrice * item.quantity, 0);
  const folio = await nextInvoiceNumber();

  const salePayload = {
    workshop_id: WORKSHOP_ID,
    folio,
    payment_method: paymentMethod,
    subtotal,
    cost_total: costTotal,
    total: subtotal,
    customer_id: customerId,
    customer_name: customerName,
    customer_document: customerDocument,
    customer_phone: customerPhone,
    customer_email: customerEmail,
  };

  let saleResult = await supabase
    .from('sales')
    .insert(salePayload)
    .select('id')
    .single();

  if (missingSchemaColumn(saleResult.error)) {
    const {
      customer_id: _customerId,
      customer_name: _customerName,
      customer_document: _customerDocument,
      customer_phone: _customerPhone,
      customer_email: _customerEmail,
      ...fallbackSalePayload
    } = salePayload;

    saleResult = await supabase
      .from('sales')
      .insert(fallbackSalePayload)
      .select('id')
      .single();
  }

  const { data: sale, error: saleError } = saleResult;
  if (blockedByPolicy(saleError)) {
    redirectPosError('Supabase bloqueo la venta por politicas RLS. Ejecuta supabase/15_pos_customer_invoice_images.sql en el SQL Editor.');
  }
  if (saleError) redirectPosError(`No se pudo crear la factura: ${saleError.message}`);

  const saleItems = items.map((item) => ({
    sale_id: sale.id,
    inventory_item_id: item.id,
    description: item.name,
    quantity: item.quantity,
    unit_price: item.salePrice,
    unit_cost: item.costPrice,
    total: item.salePrice * item.quantity,
    image_url: item.imageUrl ?? imageMap.get(item.id) ?? null,
  }));

  let itemsResult = await supabase.from('sale_items').insert(saleItems);
  if (missingSchemaColumn(itemsResult.error)) {
    itemsResult = await supabase.from('sale_items').insert(
      saleItems.map(({ image_url: _imageUrl, ...item }) => item),
    );
  }
  const { error: itemsError } = itemsResult;
  if (blockedByPolicy(itemsError)) {
    redirectPosError('Supabase bloqueo los items de la venta por politicas RLS. Ejecuta supabase/15_pos_customer_invoice_images.sql en el SQL Editor.');
  }
  if (itemsError) redirectPosError(`No se pudieron guardar los productos de la factura: ${itemsError.message}`);

  const stockUpdates = await Promise.all(
    items.map(async (item) => {
      const nextStock = Math.max((stockMap.get(item.id) ?? item.stock) - item.quantity, 0);
      const { error } = await supabase.from('inventory_items').update({ stock: nextStock }).eq('id', item.id);
      return { item, error };
    }),
  );

  for (const { item, error: stockError } of stockUpdates) {
    if (blockedByPolicy(stockError)) {
      redirectPosError('Supabase bloqueo el descuento de inventario por politicas RLS. Ejecuta supabase/15_pos_customer_invoice_images.sql en el SQL Editor.');
    }
    if (stockError) redirectPosError(`No se pudo descontar inventario de ${item.name}: ${stockError.message}`);
  }

  const movementRows = items.map((item) => ({
      workshop_id: WORKSHOP_ID,
      inventory_item_id: item.id,
      movement_type: 'SALE',
      quantity: -item.quantity,
      reason: folio,
    }));

  const movementResult = await supabase.from('stock_movements').insert(movementRows);
  if (blockedByPolicy(movementResult.error)) {
    console.warn('Supabase bloqueo el movimiento de inventario POS por politicas RLS. Ejecuta supabase/15_pos_customer_invoice_images.sql.');
  }
  if (movementResult.error) console.warn(`La venta se registro, pero no se pudo registrar el movimiento de inventario: ${movementResult.error.message}`);

  const { error: txError } = await supabase.from('financial_transactions').insert({
    workshop_id: WORKSHOP_ID,
    type: 'INCOME',
    amount: subtotal,
    category: 'Venta POS',
    description: `Venta mostrador ${folio} - ${customerName}`,
    reference: folio,
    source: 'pos',
  });

  if (missingSchemaColumn(txError)) {
    const { error: fallbackTxError } = await supabase.from('financial_transactions').insert({
      workshop_id: WORKSHOP_ID,
      type: 'INCOME',
      amount: subtotal,
      category: 'Venta POS',
      description: `Venta mostrador ${folio} - ${customerName}`,
      reference: folio,
    });
    if (blockedByPolicy(fallbackTxError)) {
      console.warn('Supabase bloqueo el ingreso contable POS por politicas RLS. Ejecuta supabase/15_pos_customer_invoice_images.sql.');
    }
    if (fallbackTxError) console.warn(`La venta se registro, pero no se pudo crear el ingreso contable: ${fallbackTxError.message}`);
  } else if (txError) {
    if (blockedByPolicy(txError)) {
      console.warn('Supabase bloqueo el ingreso contable POS por politicas RLS. Ejecuta supabase/15_pos_customer_invoice_images.sql.');
    }
    console.warn(`La venta se registro, pero no se pudo crear el ingreso contable: ${txError.message}`);
  }

  revalidatePath('/');
  revalidatePath('/pos');
  revalidatePath('/inventory');
  revalidatePath('/accounting');
  redirect(`/documents/sale/${sale.id}`);
}
