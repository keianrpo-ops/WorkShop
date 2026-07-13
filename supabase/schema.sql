-- TallerPro / Supabase bootstrap
-- Ejecuta este archivo completo en Supabase SQL Editor.
-- Es seguro volverlo a ejecutar: crea lo faltante y agrega columnas nuevas.

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

create table if not exists public.vehicle_photos (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete cascade default '00000000-0000-0000-0000-000000000001',
  vehicle_id uuid references public.vehicles(id) on delete cascade,
  work_order_id uuid,
  photo_url text not null,
  storage_path text,
  label text,
  created_at timestamptz not null default now()
);

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

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'vehicle-images',
  'vehicle-images',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table public.workshops enable row level security;
alter table public.customers enable row level security;
alter table public.vehicles enable row level security;
alter table public.vehicle_photos enable row level security;
alter table public.mechanics enable row level security;
alter table public.work_orders enable row level security;
alter table public.work_order_diagnostics enable row level security;
alter table public.inventory_items enable row level security;
alter table public.stock_movements enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.financial_transactions enable row level security;
alter table public.quotations enable row level security;
alter table public.quotation_items enable row level security;

drop policy if exists "Demo read workshops" on public.workshops;
drop policy if exists "Demo insert workshops" on public.workshops;
drop policy if exists "Demo update workshops" on public.workshops;
drop policy if exists "Demo delete workshops" on public.workshops;
create policy "Demo read workshops" on public.workshops for select using (true);
create policy "Demo insert workshops" on public.workshops for insert with check (true);
create policy "Demo update workshops" on public.workshops for update using (true);
create policy "Demo delete workshops" on public.workshops for delete using (true);

drop policy if exists "Demo read customers" on public.customers;
drop policy if exists "Demo insert customers" on public.customers;
drop policy if exists "Demo update customers" on public.customers;
drop policy if exists "Demo delete customers" on public.customers;
create policy "Demo read customers" on public.customers for select using (true);
create policy "Demo insert customers" on public.customers for insert with check (true);
create policy "Demo update customers" on public.customers for update using (true);
create policy "Demo delete customers" on public.customers for delete using (true);

drop policy if exists "Demo read vehicles" on public.vehicles;
drop policy if exists "Demo insert vehicles" on public.vehicles;
drop policy if exists "Demo update vehicles" on public.vehicles;
drop policy if exists "Demo delete vehicles" on public.vehicles;
create policy "Demo read vehicles" on public.vehicles for select using (true);
create policy "Demo insert vehicles" on public.vehicles for insert with check (true);
create policy "Demo update vehicles" on public.vehicles for update using (true);
create policy "Demo delete vehicles" on public.vehicles for delete using (true);

drop policy if exists "Demo read vehicle_photos" on public.vehicle_photos;
drop policy if exists "Demo insert vehicle_photos" on public.vehicle_photos;
drop policy if exists "Demo update vehicle_photos" on public.vehicle_photos;
drop policy if exists "Demo delete vehicle_photos" on public.vehicle_photos;
create policy "Demo read vehicle_photos" on public.vehicle_photos for select using (true);
create policy "Demo insert vehicle_photos" on public.vehicle_photos for insert with check (true);
create policy "Demo update vehicle_photos" on public.vehicle_photos for update using (true);
create policy "Demo delete vehicle_photos" on public.vehicle_photos for delete using (true);

drop policy if exists "Demo read mechanics" on public.mechanics;
drop policy if exists "Demo insert mechanics" on public.mechanics;
drop policy if exists "Demo update mechanics" on public.mechanics;
drop policy if exists "Demo delete mechanics" on public.mechanics;
create policy "Demo read mechanics" on public.mechanics for select using (true);
create policy "Demo insert mechanics" on public.mechanics for insert with check (true);
create policy "Demo update mechanics" on public.mechanics for update using (true);
create policy "Demo delete mechanics" on public.mechanics for delete using (true);

drop policy if exists "Demo read work_orders" on public.work_orders;
drop policy if exists "Demo insert work_orders" on public.work_orders;
drop policy if exists "Demo update work_orders" on public.work_orders;
drop policy if exists "Demo delete work_orders" on public.work_orders;
create policy "Demo read work_orders" on public.work_orders for select using (true);
create policy "Demo insert work_orders" on public.work_orders for insert with check (true);
create policy "Demo update work_orders" on public.work_orders for update using (true);
create policy "Demo delete work_orders" on public.work_orders for delete using (true);

drop policy if exists "Demo read work_order_diagnostics" on public.work_order_diagnostics;
drop policy if exists "Demo insert work_order_diagnostics" on public.work_order_diagnostics;
drop policy if exists "Demo update work_order_diagnostics" on public.work_order_diagnostics;
drop policy if exists "Demo delete work_order_diagnostics" on public.work_order_diagnostics;
create policy "Demo read work_order_diagnostics" on public.work_order_diagnostics for select using (true);
create policy "Demo insert work_order_diagnostics" on public.work_order_diagnostics for insert with check (true);
create policy "Demo update work_order_diagnostics" on public.work_order_diagnostics for update using (true);
create policy "Demo delete work_order_diagnostics" on public.work_order_diagnostics for delete using (true);

drop policy if exists "Demo read inventory_items" on public.inventory_items;
drop policy if exists "Demo insert inventory_items" on public.inventory_items;
drop policy if exists "Demo update inventory_items" on public.inventory_items;
drop policy if exists "Demo delete inventory_items" on public.inventory_items;
create policy "Demo read inventory_items" on public.inventory_items for select using (true);
create policy "Demo insert inventory_items" on public.inventory_items for insert with check (true);
create policy "Demo update inventory_items" on public.inventory_items for update using (true);
create policy "Demo delete inventory_items" on public.inventory_items for delete using (true);

drop policy if exists "Demo read stock_movements" on public.stock_movements;
drop policy if exists "Demo insert stock_movements" on public.stock_movements;
drop policy if exists "Demo update stock_movements" on public.stock_movements;
drop policy if exists "Demo delete stock_movements" on public.stock_movements;
create policy "Demo read stock_movements" on public.stock_movements for select using (true);
create policy "Demo insert stock_movements" on public.stock_movements for insert with check (true);
create policy "Demo update stock_movements" on public.stock_movements for update using (true);
create policy "Demo delete stock_movements" on public.stock_movements for delete using (true);

drop policy if exists "Demo read sales" on public.sales;
drop policy if exists "Demo insert sales" on public.sales;
drop policy if exists "Demo update sales" on public.sales;
drop policy if exists "Demo delete sales" on public.sales;
create policy "Demo read sales" on public.sales for select using (true);
create policy "Demo insert sales" on public.sales for insert with check (true);
create policy "Demo update sales" on public.sales for update using (true);
create policy "Demo delete sales" on public.sales for delete using (true);

drop policy if exists "Demo read sale_items" on public.sale_items;
drop policy if exists "Demo insert sale_items" on public.sale_items;
drop policy if exists "Demo update sale_items" on public.sale_items;
drop policy if exists "Demo delete sale_items" on public.sale_items;
create policy "Demo read sale_items" on public.sale_items for select using (true);
create policy "Demo insert sale_items" on public.sale_items for insert with check (true);
create policy "Demo update sale_items" on public.sale_items for update using (true);
create policy "Demo delete sale_items" on public.sale_items for delete using (true);

drop policy if exists "Demo read financial_transactions" on public.financial_transactions;
drop policy if exists "Demo insert financial_transactions" on public.financial_transactions;
drop policy if exists "Demo update financial_transactions" on public.financial_transactions;
drop policy if exists "Demo delete financial_transactions" on public.financial_transactions;
create policy "Demo read financial_transactions" on public.financial_transactions for select using (true);
create policy "Demo insert financial_transactions" on public.financial_transactions for insert with check (true);
create policy "Demo update financial_transactions" on public.financial_transactions for update using (true);
create policy "Demo delete financial_transactions" on public.financial_transactions for delete using (true);

drop policy if exists "Demo read quotations" on public.quotations;
drop policy if exists "Demo insert quotations" on public.quotations;
drop policy if exists "Demo update quotations" on public.quotations;
drop policy if exists "Demo delete quotations" on public.quotations;
create policy "Demo read quotations" on public.quotations for select using (true);
create policy "Demo insert quotations" on public.quotations for insert with check (true);
create policy "Demo update quotations" on public.quotations for update using (true);
create policy "Demo delete quotations" on public.quotations for delete using (true);

drop policy if exists "Demo read quotation_items" on public.quotation_items;
drop policy if exists "Demo insert quotation_items" on public.quotation_items;
drop policy if exists "Demo update quotation_items" on public.quotation_items;
drop policy if exists "Demo delete quotation_items" on public.quotation_items;
create policy "Demo read quotation_items" on public.quotation_items for select using (true);
create policy "Demo insert quotation_items" on public.quotation_items for insert with check (true);
create policy "Demo update quotation_items" on public.quotation_items for update using (true);
create policy "Demo delete quotation_items" on public.quotation_items for delete using (true);

drop policy if exists "Demo read vehicle images" on storage.objects;
drop policy if exists "Demo insert vehicle images" on storage.objects;
drop policy if exists "Demo update vehicle images" on storage.objects;
drop policy if exists "Demo delete vehicle images" on storage.objects;

create policy "Demo read vehicle images"
on storage.objects for select
using (bucket_id = 'vehicle-images');

create policy "Demo insert vehicle images"
on storage.objects for insert
with check (bucket_id = 'vehicle-images');

create policy "Demo update vehicle images"
on storage.objects for update
using (bucket_id = 'vehicle-images');

create policy "Demo delete vehicle images"
on storage.objects for delete
using (bucket_id = 'vehicle-images');

delete from public.inventory_items
where name in (
  'Aceite de Motor 5W30 (5L)',
  'Filtro de Aceite Universal',
  'Pastillas de Freno Delanteras'
);

delete from public.customers
where email in (
  'carlos.m@example.com',
  'maria.f@example.com',
  'contacto@ortiz.com'
);
