import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type MercadoPagoNotification = {
  id?: string | number;
  live_mode?: boolean;
  type?: string;
  action?: string;
  data?: {
    id?: string | number;
  };
};

type MercadoPagoPayment = {
  id?: number;
  status?: string;
  status_detail?: string;
  external_reference?: string | null;
  transaction_amount?: number;
  currency_id?: string;
  date_approved?: string | null;
  payer?: {
    email?: string | null;
  };
  metadata?: {
    plan_id?: string;
    source?: string;
  };
};

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) return null;

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function getPaymentId(url: URL, body: MercadoPagoNotification) {
  const queryId = url.searchParams.get('id') ?? url.searchParams.get('data.id');
  const bodyId = body.data?.id ?? body.id;
  const id = queryId ?? (bodyId ? String(bodyId) : null);
  return id && /^\d+$/.test(id) ? id : null;
}

function getTopic(url: URL, body: MercadoPagoNotification) {
  return url.searchParams.get('topic') ?? url.searchParams.get('type') ?? body.type ?? body.action ?? 'unknown';
}

async function getPayment(paymentId: string): Promise<MercadoPagoPayment | null> {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) return null;

  const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: 'no-store',
  });

  if (!response.ok) return null;
  return (await response.json()) as MercadoPagoPayment;
}

async function saveWebhookEvent(input: {
  paymentId: string | null;
  topic: string;
  status: string | null;
  externalReference: string | null;
  payload: MercadoPagoNotification;
  payment: MercadoPagoPayment | null;
}) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  await supabase.from('mercadopago_webhook_events').insert({
    payment_id: input.paymentId,
    topic: input.topic,
    payment_status: input.status,
    external_reference: input.externalReference,
    payload: input.payload,
    payment_payload: input.payment,
  });
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const body = (await request.json().catch(() => ({}))) as MercadoPagoNotification;
  const topic = getTopic(url, body);
  const paymentId = getPaymentId(url, body);

  try {
    const payment = paymentId ? await getPayment(paymentId) : null;

    await saveWebhookEvent({
      paymentId,
      topic,
      status: payment?.status ?? null,
      externalReference: payment?.external_reference ?? null,
      payload: body,
      payment,
    }).catch(() => undefined);

    return NextResponse.json({
      ok: true,
      received: true,
      topic,
      paymentId,
      paymentStatus: payment?.status ?? null,
      externalReference: payment?.external_reference ?? null,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        received: true,
        error: error instanceof Error ? error.message : 'No se pudo procesar el webhook.',
      },
      { status: 200 },
    );
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: 'Mercado Pago webhook',
    message: 'Endpoint activo. Mercado Pago debe enviar notificaciones por POST.',
  });
}
