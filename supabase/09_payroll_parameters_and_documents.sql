create table if not exists public.payroll_parameters (
  workshop_id uuid primary key references public.workshops(id) on delete cascade default '00000000-0000-0000-0000-000000000001',
  minimum_wage numeric(14, 2) not null default 1423500,
  transport_allowance numeric(14, 2) not null default 200000,
  month_base_days integer not null default 30,
  health_rate_employee numeric(8, 4) not null default 0.04,
  pension_rate_employee numeric(8, 4) not null default 0.04,
  solidarity_rate numeric(8, 4) not null default 0.01,
  solidarity_salary_limit_smmlv numeric(8, 2) not null default 4,
  arl_rate numeric(8, 5) not null default 0.00522,
  compensation_rate numeric(8, 4) not null default 0.04,
  severance_rate numeric(8, 4) not null default 0.0833,
  severance_interest_rate_annual numeric(8, 4) not null default 0.12,
  service_bonus_rate numeric(8, 4) not null default 0.0833,
  vacation_rate numeric(8, 4) not null default 0.0417,
  transport_salary_limit_smmlv numeric(8, 2) not null default 2,
  updated_at timestamptz not null default now()
);

insert into public.payroll_parameters (workshop_id)
values ('00000000-0000-0000-0000-000000000001')
on conflict (workshop_id) do nothing;

alter table if exists public.payroll_items add column if not exists days_paid numeric(8, 2) not null default 30;
alter table if exists public.payroll_items add column if not exists transport_allowance numeric(14, 2) not null default 0;
alter table if exists public.payroll_items add column if not exists health_deduction numeric(14, 2) not null default 0;
alter table if exists public.payroll_items add column if not exists pension_deduction numeric(14, 2) not null default 0;
alter table if exists public.payroll_items add column if not exists solidarity_deduction numeric(14, 2) not null default 0;
alter table if exists public.payroll_items add column if not exists total_deductions numeric(14, 2) not null default 0;
alter table if exists public.payroll_items add column if not exists employer_benefits numeric(14, 2) not null default 0;
alter table if exists public.payroll_items add column if not exists notes text;

create table if not exists public.employee_liquidations (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete cascade default '00000000-0000-0000-0000-000000000001',
  mechanic_id uuid not null references public.mechanics(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  days_worked integer not null default 0,
  base_salary numeric(14, 2) not null default 0,
  transport_allowance numeric(14, 2) not null default 0,
  severance numeric(14, 2) not null default 0,
  severance_interest numeric(14, 2) not null default 0,
  service_bonus numeric(14, 2) not null default 0,
  vacations numeric(14, 2) not null default 0,
  deductions numeric(14, 2) not null default 0,
  net_total numeric(14, 2) not null default 0,
  reason text,
  created_at timestamptz not null default now()
);

alter table public.payroll_parameters enable row level security;
alter table public.employee_liquidations enable row level security;

drop policy if exists "Demo read payroll_parameters" on public.payroll_parameters;
drop policy if exists "Demo insert payroll_parameters" on public.payroll_parameters;
drop policy if exists "Demo update payroll_parameters" on public.payroll_parameters;
drop policy if exists "Demo delete payroll_parameters" on public.payroll_parameters;
create policy "Demo read payroll_parameters" on public.payroll_parameters for select using (true);
create policy "Demo insert payroll_parameters" on public.payroll_parameters for insert with check (true);
create policy "Demo update payroll_parameters" on public.payroll_parameters for update using (true);
create policy "Demo delete payroll_parameters" on public.payroll_parameters for delete using (true);

drop policy if exists "Demo read employee_liquidations" on public.employee_liquidations;
drop policy if exists "Demo insert employee_liquidations" on public.employee_liquidations;
drop policy if exists "Demo update employee_liquidations" on public.employee_liquidations;
drop policy if exists "Demo delete employee_liquidations" on public.employee_liquidations;
create policy "Demo read employee_liquidations" on public.employee_liquidations for select using (true);
create policy "Demo insert employee_liquidations" on public.employee_liquidations for insert with check (true);
create policy "Demo update employee_liquidations" on public.employee_liquidations for update using (true);
create policy "Demo delete employee_liquidations" on public.employee_liquidations for delete using (true);

select pg_notify('pgrst', 'reload schema');
