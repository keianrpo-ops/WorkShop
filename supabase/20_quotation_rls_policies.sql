alter table public.quotations enable row level security;
alter table public.quotation_items enable row level security;

alter table public.quotation_items add column if not exists subtotal numeric(12, 2) not null default 0;
alter table public.quotation_items add column if not exists tax_rate numeric(5, 2) not null default 0;
alter table public.quotation_items add column if not exists tax_amount numeric(12, 2) not null default 0;

drop policy if exists "Workshop quotations read" on public.quotations;
drop policy if exists "Workshop quotations insert" on public.quotations;
drop policy if exists "Workshop quotations update" on public.quotations;
drop policy if exists "Workshop quotations delete" on public.quotations;

create policy "Workshop quotations read" on public.quotations for select using (true);
create policy "Workshop quotations insert" on public.quotations for insert with check (true);
create policy "Workshop quotations update" on public.quotations for update using (true);
create policy "Workshop quotations delete" on public.quotations for delete using (true);

drop policy if exists "Workshop quotation_items read" on public.quotation_items;
drop policy if exists "Workshop quotation_items insert" on public.quotation_items;
drop policy if exists "Workshop quotation_items update" on public.quotation_items;
drop policy if exists "Workshop quotation_items delete" on public.quotation_items;

create policy "Workshop quotation_items read" on public.quotation_items for select using (true);
create policy "Workshop quotation_items insert" on public.quotation_items for insert with check (true);
create policy "Workshop quotation_items update" on public.quotation_items for update using (true);
create policy "Workshop quotation_items delete" on public.quotation_items for delete using (true);

update public.quotation_items
set subtotal = total
where subtotal = 0 and total > 0;
