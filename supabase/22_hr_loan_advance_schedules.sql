alter table if exists public.employee_advances
  add column if not exists balance numeric(14, 2) not null default 0,
  add column if not exists deduction_amount numeric(14, 2) not null default 0,
  add column if not exists deduction_installments integer not null default 1,
  add column if not exists deduction_period text not null default 'Quincenal',
  add column if not exists deduction_start_date date,
  add column if not exists notes text,
  add column if not exists updated_at timestamptz not null default now();

update public.employee_advances
set
  balance = case when balance = 0 and status = 'Pendiente' then amount else balance end,
  deduction_amount = case when deduction_amount = 0 then amount else deduction_amount end,
  deduction_start_date = coalesce(deduction_start_date, advance_date)
where status = 'Pendiente';

alter table if exists public.employee_loans
  add column if not exists deduction_period text not null default 'Quincenal',
  add column if not exists deduction_start_date date,
  add column if not exists notes text,
  add column if not exists updated_at timestamptz not null default now();

update public.employee_loans
set deduction_start_date = coalesce(deduction_start_date, loan_date)
where status = 'Activo';

create table if not exists public.employee_loan_payments (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete cascade default '00000000-0000-0000-0000-000000000001',
  loan_id uuid not null references public.employee_loans(id) on delete cascade,
  mechanic_id uuid references public.mechanics(id) on delete set null,
  payment_date date not null default current_date,
  amount numeric(14, 2) not null,
  payment_method text not null default 'Nomina',
  reference text,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_employee_loan_payments_loan_id on public.employee_loan_payments(loan_id);
create index if not exists idx_employee_loan_payments_mechanic_id on public.employee_loan_payments(mechanic_id);

alter table public.employee_loan_payments enable row level security;

drop policy if exists "Demo read employee_loan_payments" on public.employee_loan_payments;
drop policy if exists "Demo insert employee_loan_payments" on public.employee_loan_payments;
drop policy if exists "Demo update employee_loan_payments" on public.employee_loan_payments;
drop policy if exists "Demo delete employee_loan_payments" on public.employee_loan_payments;
create policy "Demo read employee_loan_payments" on public.employee_loan_payments for select using (true);
create policy "Demo insert employee_loan_payments" on public.employee_loan_payments for insert with check (true);
create policy "Demo update employee_loan_payments" on public.employee_loan_payments for update using (true);
create policy "Demo delete employee_loan_payments" on public.employee_loan_payments for delete using (true);
