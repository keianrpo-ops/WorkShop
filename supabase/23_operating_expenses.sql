alter table if exists public.financial_transactions
  add column if not exists transaction_date date,
  add column if not exists vendor text,
  add column if not exists responsible text,
  add column if not exists payment_method text,
  add column if not exists approval_status text not null default 'Aprobado',
  add column if not exists receipt_url text,
  add column if not exists receipt_storage_path text,
  add column if not exists affects_cash boolean not null default true,
  add column if not exists notes text,
  add column if not exists updated_at timestamptz not null default now();

update public.financial_transactions
set transaction_date = coalesce(transaction_date, created_at::date)
where transaction_date is null;

alter table if exists public.treasury_transactions
  add column if not exists transaction_date date,
  add column if not exists vendor text,
  add column if not exists responsible text,
  add column if not exists payment_method text,
  add column if not exists receipt_url text,
  add column if not exists receipt_storage_path text,
  add column if not exists notes text;

update public.treasury_transactions
set transaction_date = coalesce(transaction_date, created_at::date)
where transaction_date is null;

create index if not exists idx_financial_transactions_date on public.financial_transactions(workshop_id, transaction_date);
create index if not exists idx_financial_transactions_category on public.financial_transactions(workshop_id, category);
create index if not exists idx_treasury_transactions_date on public.treasury_transactions(workshop_id, transaction_date);

alter table public.financial_transactions enable row level security;
alter table public.treasury_transactions enable row level security;
alter table public.treasury_accounts enable row level security;

drop policy if exists "Workshop expenses read financial_transactions" on public.financial_transactions;
drop policy if exists "Workshop expenses insert financial_transactions" on public.financial_transactions;
drop policy if exists "Workshop expenses update financial_transactions" on public.financial_transactions;
drop policy if exists "Workshop expenses delete financial_transactions" on public.financial_transactions;
create policy "Workshop expenses read financial_transactions" on public.financial_transactions for select using (true);
create policy "Workshop expenses insert financial_transactions" on public.financial_transactions for insert with check (true);
create policy "Workshop expenses update financial_transactions" on public.financial_transactions for update using (true) with check (true);
create policy "Workshop expenses delete financial_transactions" on public.financial_transactions for delete using (true);

drop policy if exists "Workshop expenses read treasury_transactions" on public.treasury_transactions;
drop policy if exists "Workshop expenses insert treasury_transactions" on public.treasury_transactions;
drop policy if exists "Workshop expenses update treasury_transactions" on public.treasury_transactions;
drop policy if exists "Workshop expenses delete treasury_transactions" on public.treasury_transactions;
create policy "Workshop expenses read treasury_transactions" on public.treasury_transactions for select using (true);
create policy "Workshop expenses insert treasury_transactions" on public.treasury_transactions for insert with check (true);
create policy "Workshop expenses update treasury_transactions" on public.treasury_transactions for update using (true) with check (true);
create policy "Workshop expenses delete treasury_transactions" on public.treasury_transactions for delete using (true);

drop policy if exists "Workshop expenses read treasury_accounts" on public.treasury_accounts;
drop policy if exists "Workshop expenses update treasury_accounts" on public.treasury_accounts;
create policy "Workshop expenses read treasury_accounts" on public.treasury_accounts for select using (true);
create policy "Workshop expenses update treasury_accounts" on public.treasury_accounts for update using (true) with check (true);

select pg_notify('pgrst', 'reload schema');
