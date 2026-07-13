-- Reinicio controlado para empezar pruebas limpias en TallerApp / Workshop.
-- Borra datos operativos de prueba, fotos y transacciones.
-- Conserva la estructura, parametros laborales, cuenta Caja General e inventario base.

create extension if not exists pgcrypto;

do $$
declare
  v_workshop_id uuid := '00000000-0000-0000-0000-000000000001';
  v_table text;
  v_workshop_tables text[] := array[
    'employee_loan_payments',
    'attendance_records',
    'work_order_labor',
    'employee_advances',
    'employee_loans',
    'employee_documents',
    'employee_history',
    'employee_liquidations',
    'payroll_runs',
    'commission_rules',
    'treasury_transactions',
    'financial_transactions',
    'sales',
    'stock_movements',
    'quotations',
    'vehicle_photos',
    'work_order_diagnostics',
    'work_orders',
    'vehicles',
    'customers',
    'mechanics'
  ];
begin
  foreach v_table in array v_workshop_tables loop
    if to_regclass('public.' || v_table) is not null then
      execute format('delete from public.%I where workshop_id = $1', v_table) using v_workshop_id;
    end if;
  end loop;

  if to_regclass('public.inventory_items') is not null then
    alter table public.inventory_items add column if not exists image_url text;
    alter table public.inventory_items add column if not exists updated_at timestamptz not null default now();
    update public.inventory_items
    set image_url = null,
        updated_at = now()
    where workshop_id = v_workshop_id;
  end if;

  if to_regclass('public.treasury_accounts') is not null then
    alter table public.treasury_accounts add column if not exists balance numeric(14, 2) not null default 0;
    alter table public.treasury_accounts add column if not exists is_active boolean not null default true;
    delete from public.treasury_accounts where workshop_id = v_workshop_id;
    insert into public.treasury_accounts (workshop_id, name, account_type, balance, is_active)
    values (v_workshop_id, 'Caja General', 'Caja', 0, true);
  end if;

  if to_regclass('storage.objects') is not null then
    delete from storage.objects
    where bucket_id = 'vehicle-images'
      and name like v_workshop_id::text || '/%';
  end if;
end $$;

update public.workshops
set
  name = 'Workshop',
  phone = null,
  address = null,
  updated_at = now()
where id = '00000000-0000-0000-0000-000000000001';

alter table public.workshops add column if not exists legal_name text;
alter table public.workshops add column if not exists document_type text;
alter table public.workshops add column if not exists tax_id text;
alter table public.workshops add column if not exists email text;
alter table public.workshops add column if not exists city text;
alter table public.workshops add column if not exists country text;
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
alter table public.workshops add column if not exists document_footer text;
alter table public.workshops add column if not exists branch_name text;

update public.workshops
set
  legal_name = 'Workshop',
  document_type = 'NIT',
  tax_id = null,
  email = null,
  city = null,
  country = 'Colombia',
  tax_regime = null,
  economic_activity = null,
  invoice_prefix = 'FAC',
  invoice_next_number = 1,
  invoice_resolution = null,
  invoice_authorization = null,
  invoice_resolution_date = null,
  invoice_resolution_valid_until = null,
  invoice_range_from = 1,
  invoice_range_to = 999999,
  document_footer = 'Gracias por confiar en nuestro taller',
  branch_name = 'Centro Especializado',
  updated_at = now()
where id = '00000000-0000-0000-0000-000000000001';

do $$
begin
  if to_regclass('public.payroll_parameters') is not null then
    insert into public.payroll_parameters (workshop_id)
    values ('00000000-0000-0000-0000-000000000001')
    on conflict (workshop_id) do nothing;
  end if;
end $$;

select pg_notify('pgrst', 'reload schema');
