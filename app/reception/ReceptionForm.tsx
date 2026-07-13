'use client';

import { createReception } from '@/lib/actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { Camera, Car, ClipboardList, Save, User, X } from 'lucide-react';
import { ChangeEvent, useRef, useState } from 'react';

type ReceptionDefaults = {
  customerName?: string;
  phone?: string;
  email?: string;
  vehicleType?: string;
  plate?: string;
  makeModel?: string;
  year?: string;
  mileage?: string;
};

async function compressImage(file: File) {
  if (!file.type.startsWith('image/')) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const maxSize = 1000;
    const ratio = Math.min(maxSize / bitmap.width, maxSize / bitmap.height, 1);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * ratio);
    canvas.height = Math.round(bitmap.height * ratio);
    const context = canvas.getContext('2d');
    if (!context) return file;

    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.62));
    bitmap.close();
    if (!blob) return file;

    const name = file.name.replace(/\.[^.]+$/, '') || 'vehiculo';
    return new File([blob], `${name}.jpg`, { type: 'image/jpeg' });
  } catch {
    return file;
  }
}

export function ReceptionForm({ defaults }: { defaults?: ReceptionDefaults }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<Array<{ previewUrl: string; publicUrl?: string; storagePath?: string; name: string; status: 'subiendo' | 'lista' | 'error'; error?: string }>>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePhotos = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;

    setIsProcessing(true);
    try {
      for (const file of files) {
        const compressed = await compressImage(file);
        const previewUrl = URL.createObjectURL(compressed);
        const localId = crypto.randomUUID();
        const safeName = compressed.name.toLowerCase().replace(/[^a-z0-9.]+/g, '-').replace(/(^-|-$)/g, '') || 'vehiculo.jpg';
        const storagePath = `00000000-0000-0000-0000-000000000001/reception-pending/${localId}-${safeName}`;

        setPhotos((current) => [...current, { previewUrl, name: compressed.name, status: 'subiendo' }]);

        const { error } = await supabase.storage.from('vehicle-images').upload(storagePath, compressed, {
          contentType: compressed.type || 'image/jpeg',
          upsert: false,
        });

        if (error) {
          setPhotos((current) =>
            current.map((photo) => (photo.previewUrl === previewUrl ? { ...photo, status: 'error', error: error.message } : photo)),
          );
          continue;
        }

        const { data } = supabase.storage.from('vehicle-images').getPublicUrl(storagePath);
        setPhotos((current) =>
          current.map((photo) =>
            photo.previewUrl === previewUrl
              ? { ...photo, status: 'lista', publicUrl: data.publicUrl, storagePath }
              : photo,
          ),
        );
      }
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removePhoto = (previewUrl: string) => {
    URL.revokeObjectURL(previewUrl);
    setPhotos((current) => current.filter((photo) => photo.previewUrl !== previewUrl));
  };

  const uploadedPhotos = JSON.stringify(
    photos
      .filter((photo) => photo.status === 'lista' && photo.publicUrl)
      .map((photo) => ({ photo_url: photo.publicUrl, storage_path: photo.storagePath, label: 'Recepcion' })),
  );

  return (
    <div className="mx-auto max-w-4xl p-4 md:p-8">
      <div className="mb-8 lg:hidden">
        <h1 className="text-2xl font-bold tracking-tight text-slate-800">Recepcion de Vehiculo</h1>
        <p className="text-slate-500">Registra cliente, vehiculo y orden de trabajo en un solo ingreso.</p>
      </div>

      <div className="mb-6 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
        <div className="flex gap-3">
          <ClipboardList className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
          <div>
            <p className="font-bold">Flujo de recepcion</p>
            <p className="mt-1">Primero ingresa los datos del cliente, luego los datos del vehiculo, agrega fotos de ingreso y guarda la orden para enviarla al tablero.</p>
          </div>
        </div>
      </div>

      {defaults?.customerName && (
        <div className="mb-6 rounded-2xl border border-green-100 bg-green-50 p-4 text-sm text-green-900">
          <p className="font-bold">Recepcion conectada al cliente</p>
          <p className="mt-1">
            Se cargaron los datos de {defaults.customerName}. Completa placa, diagnostico, fotos y guarda la nueva entrada.
          </p>
        </div>
      )}

      <form action={createReception} onSubmit={() => setIsSubmitting(true)} className="space-y-8">
        <input type="hidden" name="uploadedPhotos" value={uploadedPhotos} />
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-blue-600" />
              Datos del Cliente
            </CardTitle>
            <p className="text-sm text-slate-500">Introduce la informacion de contacto para historial, WhatsApp y futuras cotizaciones.</p>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Nombre Completo</span>
              <input name="customerName" required type="text" defaultValue={defaults?.customerName ?? ''} className="w-full rounded-md border border-slate-300 p-2 outline-none focus:ring-2 focus:ring-blue-500" />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Telefono / WhatsApp</span>
              <input name="phone" type="text" defaultValue={defaults?.phone ?? ''} className="w-full rounded-md border border-slate-300 p-2 outline-none focus:ring-2 focus:ring-blue-500" />
            </label>
            <label className="space-y-2 sm:col-span-2">
              <span className="text-sm font-medium text-slate-700">Correo Electronico</span>
              <input name="email" type="email" defaultValue={defaults?.email ?? ''} className="w-full rounded-md border border-slate-300 p-2 outline-none focus:ring-2 focus:ring-blue-500" />
            </label>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-blue-600" />
              Ficha tecnica y mantenimiento
            </CardTitle>
            <p className="text-sm text-slate-500">Registra datos relevantes para diagnostico, historial, cambios de aceite y vencimientos del vehiculo.</p>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">VIN / Serie</span>
              <input name="vin" type="text" className="w-full rounded-md border border-slate-300 p-2 uppercase outline-none focus:ring-2 focus:ring-blue-500" />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Color</span>
              <input name="color" type="text" className="w-full rounded-md border border-slate-300 p-2 outline-none focus:ring-2 focus:ring-blue-500" />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Combustible</span>
              <select name="fuelType" className="w-full rounded-md border border-slate-300 p-2 outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Seleccionar</option>
                <option>Gasolina</option>
                <option>Diesel</option>
                <option>Gas</option>
                <option>Hibrido</option>
                <option>Electrico</option>
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Transmision</span>
              <select name="transmission" className="w-full rounded-md border border-slate-300 p-2 outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Seleccionar</option>
                <option>Mecanica</option>
                <option>Automatica</option>
                <option>CVT</option>
                <option>Doble embrague</option>
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Motor</span>
              <input name="engine" type="text" placeholder="Ej. 1.6, 2.0 turbo" className="w-full rounded-md border border-slate-300 p-2 outline-none focus:ring-2 focus:ring-blue-500" />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Aceite actual</span>
              <input name="oilType" type="text" placeholder="Ej. 10W-30 sintetico" className="w-full rounded-md border border-slate-300 p-2 outline-none focus:ring-2 focus:ring-blue-500" />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Ultimo cambio aceite km</span>
              <input name="lastOilChangeMileage" type="number" className="w-full rounded-md border border-slate-300 p-2 outline-none focus:ring-2 focus:ring-blue-500" />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Ultimo cambio aceite fecha</span>
              <input name="lastOilChangeDate" type="date" className="w-full rounded-md border border-slate-300 p-2 outline-none focus:ring-2 focus:ring-blue-500" />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Proximo cambio aceite km</span>
              <input name="nextOilChangeMileage" type="number" className="w-full rounded-md border border-slate-300 p-2 outline-none focus:ring-2 focus:ring-blue-500" />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Proximo cambio aceite fecha</span>
              <input name="nextOilChangeDate" type="date" className="w-full rounded-md border border-slate-300 p-2 outline-none focus:ring-2 focus:ring-blue-500" />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Estado bateria</span>
              <select name="batteryStatus" className="w-full rounded-md border border-slate-300 p-2 outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Seleccionar</option>
                <option>Buena</option>
                <option>Regular</option>
                <option>Descargada</option>
                <option>Requiere cambio</option>
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Estado llantas</span>
              <select name="tireStatus" className="w-full rounded-md border border-slate-300 p-2 outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Seleccionar</option>
                <option>Buenas</option>
                <option>Desgaste normal</option>
                <option>Desgaste irregular</option>
                <option>Requiere cambio</option>
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Estado frenos</span>
              <select name="brakeStatus" className="w-full rounded-md border border-slate-300 p-2 outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Seleccionar</option>
                <option>Buenos</option>
                <option>Revision recomendada</option>
                <option>Desgaste alto</option>
                <option>Critico</option>
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Vencimiento SOAT</span>
              <input name="soatExpiration" type="date" className="w-full rounded-md border border-slate-300 p-2 outline-none focus:ring-2 focus:ring-blue-500" />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Vencimiento tecnomecanica</span>
              <input name="technicalReviewExpiration" type="date" className="w-full rounded-md border border-slate-300 p-2 outline-none focus:ring-2 focus:ring-blue-500" />
            </label>
            <label className="space-y-2 lg:col-span-3">
              <span className="text-sm font-medium text-slate-700">Notas de mantenimiento</span>
              <textarea name="maintenanceNotes" placeholder="Cambios recientes, testigos encendidos, fugas, ruidos, pendientes del cliente, repuestos instalados..." className="min-h-[90px] w-full rounded-md border border-slate-300 p-2 outline-none focus:ring-2 focus:ring-blue-500" />
            </label>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Car className="h-5 w-5 text-blue-600" />
              Detalles del Vehiculo
            </CardTitle>
            <p className="text-sm text-slate-500">Introduce placa, marca, modelo y estado inicial. Puedes escribir un tipo nuevo si no aparece en la lista.</p>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Tipo de Vehiculo</span>
              <input name="vehicleType" list="vehicle-types" defaultValue={defaults?.vehicleType ?? 'Carro'} className="w-full rounded-md border border-slate-300 p-2 outline-none focus:ring-2 focus:ring-blue-500" />
              <datalist id="vehicle-types">
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
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Matricula / Placa</span>
              <input name="plate" required type="text" defaultValue={defaults?.plate ?? ''} className="w-full rounded-md border border-slate-300 p-2 uppercase outline-none focus:ring-2 focus:ring-blue-500" />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Marca y Modelo</span>
              <input name="makeModel" required type="text" defaultValue={defaults?.makeModel ?? ''} className="w-full rounded-md border border-slate-300 p-2 outline-none focus:ring-2 focus:ring-blue-500" />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Ano</span>
              <input name="year" type="number" defaultValue={defaults?.year ?? ''} className="w-full rounded-md border border-slate-300 p-2 outline-none focus:ring-2 focus:ring-blue-500" />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Kilometraje</span>
              <input name="mileage" type="number" defaultValue={defaults?.mileage ?? ''} className="w-full rounded-md border border-slate-300 p-2 outline-none focus:ring-2 focus:ring-blue-500" />
            </label>
            <label className="space-y-2 lg:col-span-3">
              <span className="text-sm font-medium text-slate-700">Estado fisico inicial</span>
              <select name="vehicleCondition" className="w-full rounded-md border border-slate-300 p-2 outline-none focus:ring-2 focus:ring-blue-500">
                <option>Recibido</option>
                <option>Con danos visibles</option>
                <option>No enciende</option>
                <option>En diagnostico</option>
                <option>Operativo con observaciones</option>
              </select>
            </label>
            <label className="space-y-2 lg:col-span-3">
              <span className="text-sm font-medium text-slate-700">Motivo de ingreso</span>
              <textarea name="issueDescription" className="min-h-[110px] w-full rounded-md border border-slate-300 p-2 outline-none focus:ring-2 focus:ring-blue-500" />
            </label>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-blue-600" />
              Inspeccion Visual
            </CardTitle>
            <p className="text-sm text-slate-500">Carga evidencia del estado en que llega el vehiculo al taller.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="block cursor-pointer rounded-lg border-2 border-dashed border-slate-300 p-8 text-center text-slate-500 hover:bg-slate-50">
              <Camera className="mx-auto mb-3 h-8 w-8 text-slate-400" />
              <p className="text-sm font-medium text-slate-800">Subir fotos del vehiculo</p>
              <p className="mt-1 text-xs text-slate-500">Puedes cargar muchas fotos. Cada imagen se optimiza y se sube por separado.</p>
              <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handlePhotos} className="mt-4 w-full rounded border border-slate-200 bg-white p-2 text-sm" />
            </label>

            {isProcessing && <p className="rounded-lg bg-blue-50 p-3 text-sm font-bold text-blue-700">Subiendo fotografias...</p>}

            {photos.length > 0 && (
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-bold text-slate-800">
                    {photos.filter((photo) => photo.status === 'lista').length} de {photos.length} foto(s) listas
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  {photos.map((photo) => (
                    <div key={photo.previewUrl} className="relative overflow-hidden rounded-lg border border-slate-100">
                      <span className="block aspect-[4/3] bg-cover bg-center" style={{ backgroundImage: `url(${photo.previewUrl})` }} />
                      <span className="absolute left-2 top-2 rounded bg-slate-950/70 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                        {photo.status === 'subiendo' ? 'Subiendo' : photo.status === 'lista' ? 'Lista' : 'Error'}
                      </span>
                      <button type="button" onClick={() => removePhoto(photo.previewUrl)} className="absolute right-2 top-2 rounded-full bg-white/90 p-1 text-slate-700 shadow">
                        <X className="h-3 w-3" />
                      </button>
                      {photo.error && <p className="p-2 text-[10px] font-bold text-red-600">{photo.error}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <input required type="checkbox" id="terms" className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600" />
          <label htmlFor="terms" className="text-sm text-slate-700">
            El cliente autoriza la inspeccion y diagnostico del vehiculo.
          </label>
        </div>

        <div className="flex justify-end">
          <button type="submit" disabled={isSubmitting || isProcessing || photos.some((photo) => photo.status === 'subiendo')} className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
            <Save className="h-4 w-4" />
            {isSubmitting ? 'Guardando...' : 'Guardar e Ingresar'}
          </button>
        </div>
      </form>
    </div>
  );
}
