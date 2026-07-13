'use client';

import { addVehiclePhotos } from '@/lib/actions';
import { supabase } from '@/lib/supabase';
import { Camera, X } from 'lucide-react';
import { ChangeEvent, useRef, useState } from 'react';
import { SubmitButton } from './SubmitButton';

const WORKSHOP_ID = '00000000-0000-0000-0000-000000000001';

type UploadedPhoto = {
  previewUrl: string;
  publicUrl?: string;
  storagePath?: string;
  name: string;
  status: 'subiendo' | 'lista' | 'error';
  error?: string;
};

type VehiclePhotoUploaderProps = {
  vehicleId: string;
  workOrderId: string;
  label: string;
  buttonLabel?: string;
};

async function compressImage(file: File) {
  if (!file.type.startsWith('image/')) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const maxSize = 1200;
    const ratio = Math.min(maxSize / bitmap.width, maxSize / bitmap.height, 1);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(Math.round(bitmap.width * ratio), 1);
    canvas.height = Math.max(Math.round(bitmap.height * ratio), 1);
    const context = canvas.getContext('2d');
    if (!context) return file;

    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.68));
    bitmap.close();
    if (!blob) return file;

    const name = file.name.replace(/\.[^.]+$/, '') || 'vehiculo';
    return new File([blob], `${name}.jpg`, { type: 'image/jpeg' });
  } catch {
    return file;
  }
}

function safeFileName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9.]+/g, '-').replace(/(^-|-$)/g, '') || 'vehiculo.jpg';
}

export function VehiclePhotoUploader({ vehicleId, workOrderId, label, buttonLabel = 'Agregar fotos' }: VehiclePhotoUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePhotos = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;

    setIsProcessing(true);
    try {
      for (const file of files) {
        const compressed = await compressImage(file);
        const previewUrl = URL.createObjectURL(compressed);
        const localId = crypto.randomUUID();
        const storagePath = `${WORKSHOP_ID}/vehicles/${vehicleId}/evidence/${localId}-${safeFileName(compressed.name)}`;

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

  const readyPhotos = photos.filter((photo) => photo.status === 'lista' && photo.publicUrl);
  const uploadedPhotos = JSON.stringify(
    readyPhotos.map((photo) => ({
      photo_url: photo.publicUrl,
      storage_path: photo.storagePath,
      label,
    })),
  );
  const hasPendingUploads = isProcessing || photos.some((photo) => photo.status === 'subiendo');

  return (
    <form action={addVehiclePhotos} className="space-y-2 rounded border border-blue-100 bg-blue-50 p-2">
      <input type="hidden" name="workOrderId" value={workOrderId} />
      <input type="hidden" name="vehicleId" value={vehicleId} />
      <input type="hidden" name="label" value={label} />
      <input type="hidden" name="uploadedPhotos" value={uploadedPhotos} />

      <label className="block cursor-pointer rounded border border-dashed border-blue-200 bg-white p-2 text-center text-[11px] font-medium text-slate-600 hover:bg-blue-50">
        <Camera className="mx-auto mb-1 h-4 w-4 text-blue-600" />
        Seleccionar fotos
        <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handlePhotos} className="mt-2 w-full text-[11px]" />
      </label>

      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((photo) => (
            <div key={photo.previewUrl} className="relative overflow-hidden rounded border border-slate-100 bg-white">
              <span className="block aspect-square bg-cover bg-center" style={{ backgroundImage: `url(${photo.previewUrl})` }} />
              <span className="absolute left-1 top-1 rounded bg-slate-950/70 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
                {photo.status === 'subiendo' ? 'Subiendo' : photo.status === 'lista' ? 'Lista' : 'Error'}
              </span>
              <button type="button" onClick={() => removePhoto(photo.previewUrl)} className="absolute right-1 top-1 rounded-full bg-white/90 p-1 text-slate-700 shadow">
                <X className="h-3 w-3" />
              </button>
              {photo.error && <p className="p-1 text-[9px] font-bold text-red-600">{photo.error}</p>}
            </div>
          ))}
        </div>
      )}

      {hasPendingUploads && <p className="rounded bg-blue-100 px-2 py-1 text-[11px] font-bold text-blue-700">Subiendo fotografias...</p>}

      <SubmitButton
        pendingText="Guardando..."
        disabled={hasPendingUploads || readyPhotos.length === 0}
        className="w-full rounded bg-blue-600 py-1.5 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {buttonLabel}
      </SubmitButton>
    </form>
  );
}
