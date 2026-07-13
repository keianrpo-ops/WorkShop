'use client';

import { AlertTriangle, RefreshCcw } from 'lucide-react';

export default function PosError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-6">
      <div className="max-w-md rounded-2xl border border-amber-200 bg-white p-6 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h1 className="text-xl font-black text-slate-900">No se pudo cargar el punto de venta</h1>
        <p className="mt-2 text-sm text-slate-500">La pantalla recibio datos incompletos o una version antigua del navegador.</p>
        <button onClick={reset} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800">
          <RefreshCcw className="h-4 w-4" />
          Reintentar
        </button>
      </div>
    </div>
  );
}
