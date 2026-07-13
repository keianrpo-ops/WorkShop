alter table public.workshops add column if not exists parent_workshop_id uuid references public.workshops(id) on delete set null;
alter table public.workshops add column if not exists branch_name text;

alter table public.mechanics add column if not exists photo_url text;
alter table public.mechanics add column if not exists document_number text;
alter table public.mechanics add column if not exists address text;
alter table public.mechanics add column if not exists birth_date date;
alter table public.mechanics add column if not exists hire_date date;
alter table public.mechanics add column if not exists employment_status text not null default 'Activo';
alter table public.mechanics add column if not exists contract_type text;
alter table public.mechanics add column if not exists pay_scheme text not null default 'Salario fijo';
alter table public.mechanics add column if not exists payment_frequency text not null default 'Quincenal';
alter table public.mechanics add column if not exists base_salary numeric(14, 2) not null default 0;
alter table public.mechanics add column if not exists commission_rate numeric(5, 2) not null default 0;
alter table public.mechanics add column if not exists supervisor_id uuid references public.mechanics(id) on delete set null;
alter table public.mechanics add column if not exists bank_name text;
alter table public.mechanics add column if not exists bank_account_type text;
alter table public.mechanics add column if not exists bank_account_number text;
alter table public.mechanics add column if not exists internal_notes text;

alter table public.work_orders add column if not exists labor_revenue numeric(14, 2) not null default 0;
alter table public.work_orders add column if not exists parts_revenue numeric(14, 2) not null default 0;
alter table public.work_orders add column if not exists parts_cost numeric(14, 2) not null default 0;
alter table public.work_orders add column if not exists labor_cost numeric(14, 2) not null default 0;
alter table public.work_orders add column if not exists commission_cost numeric(14, 2) not null default 0;

create table if not exists public.employee_documents (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete cascade default '00000000-0000-0000-0000-000000000001',
  mechanic_id uuid not null references public.mechanics(id) on delete cascade,
  document_name text not null,
  file_url text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.employee_history (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete cascade default '00000000-0000-0000-0000-000000000001',
  mechanic_id uuid not null references public.mechanics(id) on delete cascade,
  event_type text not null,
  description text not null,
  amount numeric(14, 2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete cascade default '00000000-0000-0000-0000-000000000001',
  mechanic_id uuid not null references public.mechanics(id) on delete cascade,
  work_date date not null default current_date,
  check_in timestamptz,
  check_out timestamptz,
  hours_worked numeric(8, 2) not null default 0,
  overtime_hours numeric(8, 2) not null default 0,
  late_minutes integer not null default 0,
  status text not null default 'Presente',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workshop_id, mechanic_id, work_date)
);

create table if not exists public.work_order_labor (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete cascade default '00000000-0000-0000-0000-000000000001',
  work_order_id uuid not null references public.work_orders(id) on delete cascade,
  mechanic_id uuid not null references public.mechanics(id) on delete cascade,
  role text not null default 'Principal',
  estimated_hours numeric(8, 2) not null default 0,
  hours_spent numeric(8, 2) not null default 0,
  billable_hours numeric(8, 2) not null default 0,
  hourly_cost numeric(14, 2) not null default 0,
  commission_amount numeric(14, 2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.commission_rules (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete cascade default '00000000-0000-0000-0000-000000000001',
  name text not null,
  applies_to text not null check (applies_to in ('LABOR', 'SALE')),
  percent numeric(5, 2) not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.employee_advances (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete cascade default '00000000-0000-0000-0000-000000000001',
  mechanic_id uuid not null references public.mechanics(id) on delete cascade,
  advance_date date not null default current_date,
  amount numeric(14, 2) not null,
  reason text,
  status text not null default 'Pendiente',
  payroll_item_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.employee_loans (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete cascade default '00000000-0000-0000-0000-000000000001',
  mechanic_id uuid not null references public.mechanics(id) on delete cascade,
  loan_date date not null default current_date,
  principal numeric(14, 2) not null,
  installments integer not null default 1,
  installment_amount numeric(14, 2) not null default 0,
  balance numeric(14, 2) not null default 0,
  status text not null default 'Activo',
  created_at timestamptz not null default now()
);

create table if not exists public.payroll_runs (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete cascade default '00000000-0000-0000-0000-000000000001',
  period_type text not null check (period_type in ('Semanal', 'Quincenal', 'Mensual')),
  period_start date not null,
  period_end date not null,
  status text not null default 'Borrador',
  gross_total numeric(14, 2) not null default 0,
  deductions_total numeric(14, 2) not null default 0,
  net_total numeric(14, 2) not null default 0,
  financial_transaction_id uuid references public.financial_transactions(id) on delete set null,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  unique (workshop_id, period_type, period_start, period_end)
);

create table if not exists public.payroll_items (
  id uuid primary key default gen_random_uuid(),
  payroll_run_id uuid not null references public.payroll_runs(id) on delete cascade,
  workshop_id uuid not null references public.workshops(id) on delete cascade default '00000000-0000-0000-0000-000000000001',
  mechanic_id uuid not null references public.mechanics(id) on delete cascade,
  pay_scheme text not null default 'Salario fijo',
  base_salary numeric(14, 2) not null default 0,
  regular_hours numeric(8, 2) not null default 0,
  overtime_hours numeric(8, 2) not null default 0,
  overtime_amount numeric(14, 2) not null default 0,
  bonuses numeric(14, 2) not null default 0,
  commissions numeric(14, 2) not null default 0,
  advances numeric(14, 2) not null default 0,
  loan_deductions numeric(14, 2) not null default 0,
  manual_deductions numeric(14, 2) not null default 0,
  gross_pay numeric(14, 2) not null default 0,
  net_pay numeric(14, 2) not null default 0,
  productivity numeric(8, 2) not null default 0,
  payslip_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.treasury_accounts (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete cascade default '00000000-0000-0000-0000-000000000001',
  name text not null,
  account_type text not null default 'Caja',
  bank_name text,
  balance numeric(14, 2) not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.treasury_transactions (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete cascade default '00000000-0000-0000-0000-000000000001',
  account_id uuid references public.treasury_accounts(id) on delete set null,
  type text not null check (type in ('INCOME', 'EXPENSE', 'TRANSFER')),
  amount numeric(14, 2) not null,
  category text not null,
  description text not null,
  reference text,
  source text not null default 'manual',
  financial_transaction_id uuid references public.financial_transactions(id) on delete set null,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_financial_transactions_source_reference
on public.financial_transactions(workshop_id, source, reference)
where reference is not null;

create index if not exists idx_attendance_mechanic_date on public.attendance_records(mechanic_id, work_date);
create index if not exists idx_work_order_labor_order on public.work_order_labor(work_order_id);
create index if not exists idx_payroll_items_run on public.payroll_items(payroll_run_id);
create index if not exists idx_payroll_items_mechanic on public.payroll_items(mechanic_id);
create index if not exists idx_treasury_transactions_source on public.treasury_transactions(source, reference);

insert into public.treasury_accounts (workshop_id, name, account_type)
values ('00000000-0000-0000-0000-000000000001', 'Caja General', 'Caja')
on conflict do nothing;

select pg_notify('pgrst', 'reload schema');
