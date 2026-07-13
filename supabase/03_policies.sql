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
