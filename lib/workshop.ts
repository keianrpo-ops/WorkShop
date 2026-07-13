import { supabase } from '@/lib/supabase';

export const WORKSHOP_ID = '00000000-0000-0000-0000-000000000001';

export type WorkshopBusinessInfo = {
  id: string;
  name: string;
  legalName: string;
  documentType: string;
  taxId: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  country: string;
  taxRegime: string;
  economicActivity: string;
  invoicePrefix: string;
  invoiceNextNumber: number;
  invoiceResolution: string;
  invoiceAuthorization: string;
  invoiceResolutionDate: string;
  invoiceResolutionValidUntil: string;
  invoiceRangeFrom: number;
  invoiceRangeTo: number;
  documentFooter: string;
  branchName: string;
};

export const defaultWorkshopBusiness: WorkshopBusinessInfo = {
  id: WORKSHOP_ID,
  name: 'Workshop',
  legalName: 'Workshop',
  documentType: 'NIT',
  taxId: '',
  phone: '',
  email: '',
  address: '',
  city: '',
  country: 'Colombia',
  taxRegime: '',
  economicActivity: '',
  invoicePrefix: 'FAC',
  invoiceNextNumber: 1,
  invoiceResolution: '',
  invoiceAuthorization: '',
  invoiceResolutionDate: '',
  invoiceResolutionValidUntil: '',
  invoiceRangeFrom: 1,
  invoiceRangeTo: 999999,
  documentFooter: 'Gracias por confiar en nuestro taller',
  branchName: 'Centro Especializado',
};

function isMissingSchema(error: { message?: string } | null | undefined) {
  return Boolean(error?.message && (error.message.includes('does not exist') || error.message.includes('Could not find') || error.message.includes('schema cache')));
}

function text(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function numberValue(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeWorkshop(row: Record<string, unknown> | null | undefined): WorkshopBusinessInfo {
  if (!row) return defaultWorkshopBusiness;

  const name = text(row.name, defaultWorkshopBusiness.name);
  const legalName = text(row.legal_name, name);

  return {
    id: text(row.id, WORKSHOP_ID),
    name,
    legalName,
    documentType: text(row.document_type, defaultWorkshopBusiness.documentType),
    taxId: text(row.tax_id),
    phone: text(row.phone),
    email: text(row.email),
    address: text(row.address),
    city: text(row.city),
    country: text(row.country, defaultWorkshopBusiness.country),
    taxRegime: text(row.tax_regime),
    economicActivity: text(row.economic_activity),
    invoicePrefix: text(row.invoice_prefix, defaultWorkshopBusiness.invoicePrefix),
    invoiceNextNumber: numberValue(row.invoice_next_number, defaultWorkshopBusiness.invoiceNextNumber),
    invoiceResolution: text(row.invoice_resolution),
    invoiceAuthorization: text(row.invoice_authorization),
    invoiceResolutionDate: text(row.invoice_resolution_date),
    invoiceResolutionValidUntil: text(row.invoice_resolution_valid_until),
    invoiceRangeFrom: numberValue(row.invoice_range_from, defaultWorkshopBusiness.invoiceRangeFrom),
    invoiceRangeTo: numberValue(row.invoice_range_to, defaultWorkshopBusiness.invoiceRangeTo),
    documentFooter: text(row.document_footer, defaultWorkshopBusiness.documentFooter),
    branchName: text(row.branch_name, defaultWorkshopBusiness.branchName),
  };
}

export async function getWorkshopBusinessInfo() {
  let result: Awaited<ReturnType<typeof supabase.from>> | any = await supabase
    .from('workshops')
    .select('id, name, phone, address, legal_name, document_type, tax_id, email, city, country, tax_regime, economic_activity, invoice_prefix, invoice_next_number, invoice_resolution, invoice_authorization, invoice_resolution_date, invoice_resolution_valid_until, invoice_range_from, invoice_range_to, document_footer, branch_name')
    .eq('id', WORKSHOP_ID)
    .maybeSingle();

  if (isMissingSchema(result.error)) {
    result = await supabase
      .from('workshops')
      .select('id, name, phone, address')
      .eq('id', WORKSHOP_ID)
      .maybeSingle();
  }

  if (result.error) return defaultWorkshopBusiness;
  return normalizeWorkshop(result.data as Record<string, unknown> | null);
}
