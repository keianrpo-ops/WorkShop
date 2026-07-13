alter table public.sales add column if not exists customer_id uuid references public.customers(id) on delete set null;
alter table public.sales add column if not exists customer_name text;
alter table public.sales add column if not exists customer_document text;
alter table public.sales add column if not exists customer_phone text;
alter table public.sales add column if not exists customer_email text;

alter table public.sale_items add column if not exists image_url text;

create index if not exists idx_sales_customer_id on public.sales(customer_id);

alter table public.customers enable row level security;
alter table public.inventory_items enable row level security;
alter table public.stock_movements enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.financial_transactions enable row level security;

drop policy if exists "Workshop POS read customers" on public.customers;
drop policy if exists "Workshop POS insert customers" on public.customers;
drop policy if exists "Workshop POS update customers" on public.customers;
drop policy if exists "Workshop POS delete customers" on public.customers;
create policy "Workshop POS read customers" on public.customers for select using (true);
create policy "Workshop POS insert customers" on public.customers for insert with check (true);
create policy "Workshop POS update customers" on public.customers for update using (true);
create policy "Workshop POS delete customers" on public.customers for delete using (true);

drop policy if exists "Workshop POS read inventory_items" on public.inventory_items;
drop policy if exists "Workshop POS update inventory_items" on public.inventory_items;
create policy "Workshop POS read inventory_items" on public.inventory_items for select using (true);
create policy "Workshop POS update inventory_items" on public.inventory_items for update using (true);

drop policy if exists "Workshop POS read stock_movements" on public.stock_movements;
drop policy if exists "Workshop POS insert stock_movements" on public.stock_movements;
create policy "Workshop POS read stock_movements" on public.stock_movements for select using (true);
create policy "Workshop POS insert stock_movements" on public.stock_movements for insert with check (true);

drop policy if exists "Workshop POS read sales" on public.sales;
drop policy if exists "Workshop POS insert sales" on public.sales;
drop policy if exists "Workshop POS delete sales" on public.sales;
create policy "Workshop POS read sales" on public.sales for select using (true);
create policy "Workshop POS insert sales" on public.sales for insert with check (true);
create policy "Workshop POS delete sales" on public.sales for delete using (true);

drop policy if exists "Workshop POS read sale_items" on public.sale_items;
drop policy if exists "Workshop POS insert sale_items" on public.sale_items;
drop policy if exists "Workshop POS delete sale_items" on public.sale_items;
create policy "Workshop POS read sale_items" on public.sale_items for select using (true);
create policy "Workshop POS insert sale_items" on public.sale_items for insert with check (true);
create policy "Workshop POS delete sale_items" on public.sale_items for delete using (true);

drop policy if exists "Workshop POS read financial_transactions" on public.financial_transactions;
drop policy if exists "Workshop POS insert financial_transactions" on public.financial_transactions;
drop policy if exists "Workshop POS delete financial_transactions" on public.financial_transactions;
create policy "Workshop POS read financial_transactions" on public.financial_transactions for select using (true);
create policy "Workshop POS insert financial_transactions" on public.financial_transactions for insert with check (true);
create policy "Workshop POS delete financial_transactions" on public.financial_transactions for delete using (true);

select pg_notify('pgrst', 'reload schema');
