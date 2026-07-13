alter table public.workshops add column if not exists legal_name text;
alter table public.workshops add column if not exists document_type text not null default 'NIT';
alter table public.workshops add column if not exists tax_id text;
alter table public.workshops add column if not exists email text;
alter table public.workshops add column if not exists city text;
alter table public.workshops add column if not exists country text not null default 'Colombia';
alter table public.workshops add column if not exists tax_regime text;
alter table public.workshops add column if not exists economic_activity text;
alter table public.workshops add column if not exists invoice_prefix text not null default 'FAC';
alter table public.workshops add column if not exists invoice_next_number integer not null default 1;
alter table public.workshops add column if not exists invoice_resolution text;
alter table public.workshops add column if not exists invoice_authorization text;
alter table public.workshops add column if not exists invoice_resolution_date date;
alter table public.workshops add column if not exists invoice_resolution_valid_until date;
alter table public.workshops add column if not exists invoice_range_from integer not null default 1;
alter table public.workshops add column if not exists invoice_range_to integer not null default 999999;
alter table public.workshops add column if not exists document_footer text not null default 'Gracias por confiar en nuestro taller';

update public.workshops
set
  legal_name = coalesce(legal_name, name),
  document_type = coalesce(document_type, 'NIT'),
  country = coalesce(country, 'Colombia'),
  invoice_prefix = case when upper(coalesce(invoice_prefix, '')) = 'POS' then 'FAC' else coalesce(invoice_prefix, 'FAC') end,
  invoice_next_number = coalesce(invoice_next_number, 1),
  invoice_range_from = coalesce(invoice_range_from, 1),
  invoice_range_to = coalesce(invoice_range_to, 999999),
  document_footer = coalesce(document_footer, 'Gracias por confiar en nuestro taller')
where id = '00000000-0000-0000-0000-000000000001';

drop policy if exists "Workshop update business settings" on public.workshops;
create policy "Workshop update business settings" on public.workshops for update using (true) with check (true);
