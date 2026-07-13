alter table public.quotation_items add column if not exists subtotal numeric(12, 2) not null default 0;
alter table public.quotation_items add column if not exists tax_rate numeric(5, 2) not null default 0;
alter table public.quotation_items add column if not exists tax_amount numeric(12, 2) not null default 0;

update public.quotation_items
set subtotal = total
where subtotal = 0 and total > 0;
