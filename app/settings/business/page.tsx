import { SubmitButton } from '@/components/SubmitButton';
import { updateWorkshopBusiness } from '@/lib/actions';
import { getWorkshopBusinessInfo } from '@/lib/workshop';
import { Building2, FileCheck2, Save } from 'lucide-react';

type BusinessPageProps = {
  searchParams?: Promise<{
    saved?: string;
    schema?: string;
  }>;
};

function Field({
  label,
  name,
  defaultValue,
  type = 'text',
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue?: string | number;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="space-y-1">
      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue ?? ''}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
    </label>
  );
}

export default async function BusinessSettingsPage({ searchParams }: BusinessPageProps) {
  const business = await getWorkshopBusinessInfo();
  const params = await searchParams;

  return (
    <div className="mx-auto max-w-6xl p-4 md:p-8">
      <div className="mb-8">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">Configuracion del negocio</p>
        <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">Datos del taller y documentos</h1>
        <p className="mt-2 max-w-3xl text-slate-600">
          Estos datos se usan en facturas, recibos de venta, comprobantes de nomina y liquidaciones. Para Colombia puedes registrar NIT,
          resolucion/autorizacion DIAN, prefijo y rango de numeracion.
        </p>
      </div>

      {params?.saved && (
        <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          Datos del negocio guardados correctamente.
        </div>
      )}

      {params?.schema && (
        <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Se guardaron nombre, telefono y direccion. Para guardar datos fiscales completos ejecuta
          <span className="font-mono font-bold"> supabase/16_business_settings.sql </span>
          en el SQL Editor de Supabase.
        </div>
      )}

      <form action={updateWorkshopBusiness} className="space-y-6">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-black text-slate-950">Identidad del negocio</h2>
              <p className="text-sm text-slate-500">Nombre comercial, razon social y datos de contacto.</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Nombre comercial" name="name" defaultValue={business.name} placeholder="Workshop" />
            <Field label="Razon social" name="legalName" defaultValue={business.legalName} placeholder="Razon social del taller" />
            <Field label="Sucursal / sede" name="branchName" defaultValue={business.branchName} placeholder="Centro Especializado" />
            <Field label="Tipo documento" name="documentType" defaultValue={business.documentType} placeholder="NIT" />
            <Field label="NIT / documento" name="taxId" defaultValue={business.taxId} placeholder="900000000-1" />
            <Field label="Telefono / WhatsApp" name="phone" defaultValue={business.phone} placeholder="+57 300 000 0000" />
            <Field label="Correo" name="email" type="email" defaultValue={business.email} placeholder="facturacion@taller.com" />
            <Field label="Direccion" name="address" defaultValue={business.address} placeholder="Direccion del taller" />
            <Field label="Ciudad" name="city" defaultValue={business.city} placeholder="Bogota, Medellin, Cali..." />
            <Field label="Pais" name="country" defaultValue={business.country} placeholder="Colombia" />
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <FileCheck2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-black text-slate-950">Datos fiscales y numeracion</h2>
              <p className="text-sm text-slate-500">Informacion visible en documentos profesionales y auditoria fiscal.</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Regimen tributario" name="taxRegime" defaultValue={business.taxRegime} placeholder="Responsable de IVA / No responsable de IVA" />
            <Field label="Actividad economica" name="economicActivity" defaultValue={business.economicActivity} placeholder="Mantenimiento y reparacion de vehiculos" />
            <Field label="Prefijo factura" name="invoicePrefix" defaultValue={business.invoicePrefix === 'POS' ? 'FAC' : business.invoicePrefix} placeholder="FAC" />
            <Field label="Siguiente numero" name="invoiceNextNumber" type="number" defaultValue={business.invoiceNextNumber} />
            <Field label="Resolucion DIAN" name="invoiceResolution" defaultValue={business.invoiceResolution} placeholder="Resolucion No. ..." />
            <Field label="Autorizacion / habilitacion" name="invoiceAuthorization" defaultValue={business.invoiceAuthorization} placeholder="Autorizacion de numeracion" />
            <Field label="Fecha resolucion" name="invoiceResolutionDate" type="date" defaultValue={business.invoiceResolutionDate} />
            <Field label="Valida hasta" name="invoiceResolutionValidUntil" type="date" defaultValue={business.invoiceResolutionValidUntil} />
            <Field label="Rango desde" name="invoiceRangeFrom" type="number" defaultValue={business.invoiceRangeFrom} />
            <Field label="Rango hasta" name="invoiceRangeTo" type="number" defaultValue={business.invoiceRangeTo} />
          </div>

          <label className="mt-4 block space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Texto final en documentos</span>
            <textarea
              name="documentFooter"
              defaultValue={business.documentFooter}
              rows={3}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>
        </section>

        <div className="sticky bottom-4 flex justify-end">
          <SubmitButton
            pendingText="Guardando negocio..."
            className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-lg shadow-slate-900/20 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            Guardar negocio
          </SubmitButton>
        </div>
      </form>
    </div>
  );
}
