import { NextResponse } from 'next/server';
import { createMercadoPagoPreference } from '@/lib/mercadopago';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const planId = typeof body.planId === 'string' ? body.planId : '';
    const payerEmail = typeof body.payerEmail === 'string' ? body.payerEmail : null;
    const preference = await createMercadoPagoPreference(planId, payerEmail);

    return NextResponse.json({
      ok: true,
      preferenceId: preference.id,
      checkoutUrl: preference.checkoutUrl,
      plan: preference.plan,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'No se pudo crear el pago.',
      },
      { status: 400 },
    );
  }
}
