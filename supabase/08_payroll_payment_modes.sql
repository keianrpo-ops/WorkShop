alter table public.mechanics add column if not exists pay_scheme text not null default 'Salario fijo';
alter table public.mechanics add column if not exists payment_frequency text not null default 'Quincenal';
alter table if exists public.payroll_items add column if not exists pay_scheme text not null default 'Salario fijo';

select pg_notify('pgrst', 'reload schema');
