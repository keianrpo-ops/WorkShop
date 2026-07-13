import { getPlanById } from '@/lib/plans';

const MERCADOPAGO_PREFERENCES_URL = 'https://api.mercadopago.com/checkout/preferences';

type MercadoPagoPreferenceResponse = {
  id?: string;
  init_point?: string;
  sandbox_init_point?: string;
  message?: string;
  error?: string;
};

export async function createMercadoPagoPreference(planId: string, payerEmail?: string | null) {
  const plan = getPlanById(planId);
  if (!plan) {
    throw new Error('Plan no valido.');
  }

  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error('Falta configurar MERCADOPAGO_ACCESS_TOKEN en .env.local.');
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const isSandbox = process.env.MERCADOPAGO_ENV === 'test' || accessToken.includes('TEST');
  const canAutoReturn = siteUrl.startsWith('https://');

  const response = await fetch(MERCADOPAGO_PREFERENCES_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      items: [
        {
          id: plan.id,
          title: `Workshop - Plan ${plan.name}`,
          description: plan.description,
          quantity: 1,
          currency_id: 'COP',
          unit_price: plan.priceCop,
        },
      ],
      payer: payerEmail ? { email: payerEmail } : undefined,
      external_reference: `workshop-plan-${plan.id}`,
      statement_descriptor: 'WORKSHOP',
      back_urls: {
        success: `${siteUrl}/settings/plans?payment=success&plan=${plan.id}`,
        pending: `${siteUrl}/settings/plans?payment=pending&plan=${plan.id}`,
        failure: `${siteUrl}/settings/plans?payment=failure&plan=${plan.id}`,
      },
      auto_return: canAutoReturn ? 'approved' : undefined,
      notification_url: process.env.MERCADOPAGO_WEBHOOK_URL || undefined,
      metadata: {
        plan_id: plan.id,
        source: 'workshop_plans',
      },
    }),
    cache: 'no-store',
  });

  const preference = (await response.json()) as MercadoPagoPreferenceResponse;

  if (!response.ok) {
    throw new Error(preference.message ?? preference.error ?? 'Mercado Pago rechazo la preferencia.');
  }

  const checkoutUrl = isSandbox ? preference.sandbox_init_point ?? preference.init_point : preference.init_point ?? preference.sandbox_init_point;
  if (!checkoutUrl) {
    throw new Error('Mercado Pago no devolvio el link de pago.');
  }

  return {
    id: preference.id,
    checkoutUrl,
    plan,
  };
}
