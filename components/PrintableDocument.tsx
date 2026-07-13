import { ReactNode } from 'react';
import { PrintButton } from './PrintButton';
import { defaultWorkshopBusiness, type WorkshopBusinessInfo } from '@/lib/workshop';

export function PrintableDocument({
  title,
  subtitle,
  children,
  business = defaultWorkshopBusiness,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  business?: WorkshopBusinessInfo;
}) {
  const taxLabel = business.taxId ? `${business.documentType}: ${business.taxId}` : `${business.documentType}: pendiente`;
  const location = [business.address, business.city, business.country].filter(Boolean).join(', ');

  return (
    <div className="print-document-shell min-h-screen bg-slate-200 p-4 print:bg-white print:p-0">
      <div className="print-document mx-auto max-w-4xl bg-white p-8 shadow-xl print:max-w-none print:shadow-none">
        <div className="print-hidden mb-6 flex justify-end gap-2">
          <PrintButton />
        </div>
        <header className="print-document-header mb-8 border-b-4 border-slate-900 pb-5">
          <div className="print-document-header-grid flex items-start justify-between gap-6">
            <div className="print-document-title">
              <div className="print-document-logo mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900 text-2xl font-black text-white">
                {business.name.slice(0, 2).toUpperCase()}
              </div>
              <p className="print-document-brand text-sm font-bold uppercase tracking-[0.2em] text-slate-500">{business.name}</p>
              <h1 className="print-document-heading mt-2 text-3xl font-black text-slate-950">{title}</h1>
              {subtitle && <p className="print-document-subtitle mt-1 text-sm text-slate-500">{subtitle}</p>}
            </div>
            <div className="print-document-business text-right text-sm text-slate-600">
              <p className="font-black text-slate-900">{business.legalName || business.name}</p>
              <p>{taxLabel}</p>
              {business.phone && <p>Telefono: {business.phone}</p>}
              {business.email && <p>Correo: {business.email}</p>}
              {location && <p>Direccion: {location}</p>}
              {business.taxRegime && <p>Regimen: {business.taxRegime}</p>}
              {business.invoiceResolution && <p>Resolucion DIAN: {business.invoiceResolution}</p>}
              {business.invoiceAuthorization && <p>Autorizacion: {business.invoiceAuthorization}</p>}
              <p>{new Date().toLocaleDateString('es-CO')}</p>
            </div>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}

export function DocumentRow({ label, value, strong = false }: { label: string; value: string | number; strong?: boolean }) {
  return (
    <div className="document-row flex justify-between gap-4 border-b border-slate-100 py-2 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className={strong ? 'font-black text-slate-950' : 'font-bold text-slate-800'}>{value}</span>
    </div>
  );
}

export function money(value: number | null | undefined) {
  return `COP $${Number(value ?? 0).toLocaleString('es-CO', { maximumFractionDigits: 0 })}`;
}
