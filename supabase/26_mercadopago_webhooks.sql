create table if not exists public.mercadopago_webhook_events (
  id uuid primary key default gen_random_uuid(),
  payment_id text,
  topic text not null default 'unknown',
  payment_status text,
  external_reference text,
  payload jsonb not null default '{}'::jsonb,
  payment_payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_mercadopago_webhook_events_payment_id
on public.mercadopago_webhook_events(payment_id);

create index if not exists idx_mercadopago_webhook_events_external_reference
on public.mercadopago_webhook_events(external_reference);

create index if not exists idx_mercadopago_webhook_events_created_at
on public.mercadopago_webhook_events(created_at desc);

alter table public.mercadopago_webhook_events enable row level security;

drop policy if exists "Service role manages mercadopago webhook events" on public.mercadopago_webhook_events;
create policy "Service role manages mercadopago webhook events"
on public.mercadopago_webhook_events
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
