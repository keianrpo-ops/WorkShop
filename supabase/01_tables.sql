create extension if not exists pgcrypto;

create table if not exists public.workshops (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.workshops (id, name)
values ('00000000-0000-0000-0000-000000000001', 'Mi Taller')
on conflict (id) do nothing;

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete cascade default '00000000-0000-0000-0000-000000000001',
  name text not null,
  email text,
  phone text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete cascade default '00000000-0000-0000-0000-000000000001',
  customer_id uuid references public.customers(id) on delete set null,
  type text not null default 'Coche',
  plate text not null,
  make_model text not null,
  year integer,
  mileage integer,
  primary_image_url text,
  condition_status text not null default 'Recibido',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workshop_id, plate)
);

alter table public.vehicles add column if not exists primary_image_url text;
alter table public.vehicles add column if not exists condition_status text not null default 'Recibido';

create table if not exists public.mechanics (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete cascade default '00000000-0000-0000-0000-000000000001',
  name text not null,
  role text,
  specialty text,
  phone text,
  email text,
  hourly_rate numeric(12, 2) not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.work_orders (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete cascade default '00000000-0000-0000-0000-000000000001',
  customer_id uuid references public.customers(id) on delete set null,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  mechanic_id uuid references public.mechanics(id) on delete set null,
  status text not null default 'Recibido',
  vehicle_condition text not null default 'Recibido',
  issue_description text,
  diagnosis_summary text,
  estimated_delivery timestamptz,
  estimated_hours numeric(8, 2) not null default 0,
  hours_spent numeric(8, 2) not null default 0,
  total_amount numeric(12, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.work_orders add column if not exists vehicle_condition text not null default 'Recibido';
alter table public.work_orders add column if not exists diagnosis_summary text;

create table if not exists public.vehicle_photos (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete cascade default '00000000-0000-0000-0000-000000000001',
  vehicle_id uuid references public.vehicles(id) on delete cascade,
  work_order_id uuid references public.work_orders(id) on delete cascade,
  photo_url text not null,
  storage_path text,
  label text,
  created_at timestamptz not null default now()
);

alter table public.vehicle_photos drop constraint if exists vehicle_photos_work_order_id_fkey;
alter table public.vehicle_photos add constraint vehicle_photos_work_order_id_fkey foreign key (work_order_id) references public.work_orders(id) on delete cascade;

create table if not exists public.work_order_diagnostics (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete cascade default '00000000-0000-0000-0000-000000000001',
  work_order_id uuid not null references public.work_orders(id) on delete cascade,
  mechanic_id uuid references public.mechanics(id) on delete set null,
  vehicle_condition text not null,
  diagnosis text not null,
  recommended_work text,
  estimated_hours numeric(8, 2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete cascade default '00000000-0000-0000-0000-000000000001',
  name text not null,
  category text,
  stock integer not null default 0,
  min_stock integer not null default 0,
  cost_price numeric(12, 2) not null default 0,
  sale_price numeric(12, 2) not null default 0,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.inventory_items add column if not exists image_url text;

create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete cascade default '00000000-0000-0000-0000-000000000001',
  inventory_item_id uuid references public.inventory_items(id) on delete set null,
  movement_type text not null,
  quantity integer not null,
  reason text,
  created_at timestamptz not null default now()
);

create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete cascade default '00000000-0000-0000-0000-000000000001',
  folio text not null unique,
  payment_method text not null,
  subtotal numeric(12, 2) not null default 0,
  cost_total numeric(12, 2) not null default 0,
  total numeric(12, 2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  inventory_item_id uuid references public.inventory_items(id) on delete set null,
  description text not null,
  quantity integer not null,
  unit_price numeric(12, 2) not null,
  unit_cost numeric(12, 2) not null default 0,
  total numeric(12, 2) not null
);

create table if not exists public.financial_transactions (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete cascade default '00000000-0000-0000-0000-000000000001',
  type text not null check (type in ('INCOME', 'EXPENSE')),
  amount numeric(12, 2) not null,
  category text not null,
  description text not null,
  reference text,
  source text not null default 'manual',
  created_at timestamptz not null default now()
);

create table if not exists public.quotations (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete cascade default '00000000-0000-0000-0000-000000000001',
  work_order_id uuid references public.work_orders(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  status text not null default 'Pendiente',
  subtotal numeric(12, 2) not null default 0,
  taxes numeric(12, 2) not null default 0,
  total numeric(12, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.quotation_items (
  id uuid primary key default gen_random_uuid(),
  quotation_id uuid not null references public.quotations(id) on delete cascade,
  description text not null,
  quantity numeric(10, 2) not null default 1,
  unit_price numeric(12, 2) not null default 0,
  total numeric(12, 2) not null default 0
);

create index if not exists idx_customers_workshop_id on public.customers(workshop_id);
create index if not exists idx_vehicles_workshop_id on public.vehicles(workshop_id);
create index if not exists idx_vehicle_photos_vehicle_id on public.vehicle_photos(vehicle_id);
create index if not exists idx_work_orders_workshop_id on public.work_orders(workshop_id);
create index if not exists idx_work_orders_vehicle_id on public.work_orders(vehicle_id);
create index if not exists idx_work_order_diagnostics_order_id on public.work_order_diagnostics(work_order_id);
create index if not exists idx_inventory_items_workshop_id on public.inventory_items(workshop_id);
create index if not exists idx_sales_workshop_id on public.sales(workshop_id);
create index if not exists idx_financial_transactions_workshop_id on public.financial_transactions(workshop_id);
