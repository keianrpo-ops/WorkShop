'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { PlanId } from '@/lib/plans';

export function PlanCheckoutButton({ planId, popular }: { planId: PlanId; popular?: boolean }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCheckout = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/mercadopago/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      });
      const data = await response.json();

      if (!response.ok || !data.checkoutUrl) {
        throw new Error(data.error ?? 'No se pudo crear el link de pago.');
      }

      window.location.href = data.checkoutUrl;
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : 'No se pudo iniciar el pago.');
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={startCheckout}
        disabled={loading}
        className={`flex w-full items-center justify-center gap-2 rounded-lg py-3 text-center text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
          popular
            ? 'bg-blue-600 text-white hover:bg-blue-700'
            : 'border-2 border-blue-100 bg-white text-blue-600 hover:border-blue-200 hover:bg-blue-50'
        }`}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {loading ? 'Creando link de pago...' : 'Pagar con Mercado Pago'}
      </button>
      {error && <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">{error}</p>}
    </div>
  );
}
