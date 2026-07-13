create extension if not exists pgcrypto;

alter table public.customers add column if not exists document_number text;
alter table public.inventory_items add column if not exists image_url text;
alter table public.workshops add column if not exists invoice_prefix text not null default 'FAC';
alter table public.workshops add column if not exists invoice_next_number integer not null default 1;
update public.workshops set invoice_prefix = 'FAC' where upper(coalesce(invoice_prefix, '')) = 'POS';
alter table public.sales add column if not exists customer_id uuid references public.customers(id) on delete set null;
alter table public.sales add column if not exists customer_name text;
alter table public.sales add column if not exists customer_document text;
alter table public.sales add column if not exists customer_phone text;
alter table public.sales add column if not exists customer_email text;
alter table public.sale_items add column if not exists image_url text;

create index if not exists idx_customers_document_number on public.customers(workshop_id, document_number) where document_number is not null;
create index if not exists idx_customers_email on public.customers(workshop_id, email) where email is not null;
create index if not exists idx_customers_phone on public.customers(workshop_id, phone) where phone is not null;
create index if not exists idx_sales_customer_id on public.sales(customer_id);

create or replace function public.pos_checkout_fast(
  p_workshop_id uuid,
  p_payment_method text,
  p_customer_name text,
  p_customer_document text,
  p_customer_phone text,
  p_customer_email text,
  p_items jsonb
)
returns table(sale_id uuid, folio text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sale_id uuid;
  v_customer_id uuid;
  v_folio text;
  v_subtotal numeric(12, 2);
  v_cost_total numeric(12, 2);
  v_item record;
  v_stock integer;
  v_image_url text;
  v_invoice_prefix text;
  v_invoice_next_number integer;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'El carrito esta vacio.';
  end if;

  select
    case
      when upper(coalesce(nullif(trim(invoice_prefix), ''), 'FAC')) = 'POS' then 'FAC'
      else upper(coalesce(nullif(trim(invoice_prefix), ''), 'FAC'))
    end,
    coalesce(invoice_next_number, 1)
  into v_invoice_prefix, v_invoice_next_number
  from public.workshops
  where id = p_workshop_id
  for update;

  v_invoice_prefix := coalesce(v_invoice_prefix, 'FAC');
  v_invoice_next_number := coalesce(v_invoice_next_number, 1);
  v_folio := v_invoice_prefix || '-' || lpad(v_invoice_next_number::text, 4, '0');

  update public.workshops
  set invoice_prefix = v_invoice_prefix,
      invoice_next_number = v_invoice_next_number + 1,
      updated_at = now()
  where id = p_workshop_id;

  select
    coalesce(sum((x.quantity * x."salePrice")::numeric), 0),
    coalesce(sum((x.quantity * x."costPrice")::numeric), 0)
  into v_subtotal, v_cost_total
  from jsonb_to_recordset(p_items) as x(
    id uuid,
    name text,
    quantity integer,
    "costPrice" numeric,
    "salePrice" numeric,
    stock integer,
    "imageUrl" text
  );

  if v_subtotal <= 0 then
    raise exception 'El total de la venta debe ser mayor a cero.';
  end if;

  if coalesce(p_customer_name, '') <> '' and coalesce(p_customer_name, 'Consumidor final') <> 'Consumidor final' then
    select c.id
    into v_customer_id
    from public.customers c
    where c.workshop_id = p_workshop_id
      and (
        (p_customer_document is not null and c.document_number = p_customer_document)
        or (p_customer_email is not null and lower(c.email) = lower(p_customer_email))
        or (p_customer_phone is not null and c.phone = p_customer_phone)
      )
    order by c.created_at asc
    limit 1;

    if v_customer_id is null then
      insert into public.customers (workshop_id, name, document_number, phone, email, notes)
      values (p_workshop_id, p_customer_name, p_customer_document, p_customer_phone, p_customer_email, case when p_customer_document is null then null else 'Documento: ' || p_customer_document end)
      returning id into v_customer_id;
    else
      update public.customers
      set
        name = coalesce(nullif(p_customer_name, ''), name),
        document_number = coalesce(p_customer_document, document_number),
        phone = coalesce(p_customer_phone, phone),
        email = coalesce(p_customer_email, email),
        updated_at = now()
      where id = v_customer_id;
    end if;
  end if;

  for v_item in
    select * from jsonb_to_recordset(p_items) as x(
      id uuid,
      name text,
      quantity integer,
      "costPrice" numeric,
      "salePrice" numeric,
      stock integer,
      "imageUrl" text
    )
  loop
    if v_item.id is null or coalesce(v_item.quantity, 0) <= 0 then
      raise exception 'Hay un producto invalido en el carrito.';
    end if;

    select stock, image_url
    into v_stock, v_image_url
    from public.inventory_items
    where id = v_item.id and workshop_id = p_workshop_id
    for update;

    if v_stock is null then
      raise exception 'Producto no encontrado: %', coalesce(v_item.name, v_item.id::text);
    end if;

    if v_stock < v_item.quantity then
      raise exception 'Stock insuficiente para %. Disponible: %.', coalesce(v_item.name, v_item.id::text), v_stock;
    end if;
  end loop;

  insert into public.sales (
    workshop_id,
    folio,
    payment_method,
    subtotal,
    cost_total,
    total,
    customer_id,
    customer_name,
    customer_document,
    customer_phone,
    customer_email
  )
  values (
    p_workshop_id,
    v_folio,
    coalesce(p_payment_method, 'cash'),
    v_subtotal,
    v_cost_total,
    v_subtotal,
    v_customer_id,
    coalesce(nullif(p_customer_name, ''), 'Consumidor final'),
    p_customer_document,
    p_customer_phone,
    p_customer_email
  )
  returning id into v_sale_id;

  insert into public.sale_items (
    sale_id,
    inventory_item_id,
    description,
    quantity,
    unit_price,
    unit_cost,
    total,
    image_url
  )
  select
    v_sale_id,
    x.id,
    x.name,
    x.quantity,
    x."salePrice",
    x."costPrice",
    x.quantity * x."salePrice",
    coalesce(x."imageUrl", i.image_url)
  from jsonb_to_recordset(p_items) as x(
    id uuid,
    name text,
    quantity integer,
    "costPrice" numeric,
    "salePrice" numeric,
    stock integer,
    "imageUrl" text
  )
  left join public.inventory_items i on i.id = x.id;

  update public.inventory_items i
  set stock = greatest(i.stock - x.quantity, 0),
      updated_at = now()
  from jsonb_to_recordset(p_items) as x(
    id uuid,
    name text,
    quantity integer,
    "costPrice" numeric,
    "salePrice" numeric,
    stock integer,
    "imageUrl" text
  )
  where i.id = x.id and i.workshop_id = p_workshop_id;

  insert into public.stock_movements (workshop_id, inventory_item_id, movement_type, quantity, reason)
  select p_workshop_id, x.id, 'SALE', -x.quantity, v_folio
  from jsonb_to_recordset(p_items) as x(
    id uuid,
    name text,
    quantity integer,
    "costPrice" numeric,
    "salePrice" numeric,
    stock integer,
    "imageUrl" text
  );

  insert into public.financial_transactions (workshop_id, type, amount, category, description, reference, source)
  values (p_workshop_id, 'INCOME', v_subtotal, 'Venta POS', 'Venta mostrador ' || v_folio || ' - ' || coalesce(p_customer_name, 'Consumidor final'), v_folio, 'pos');

  return query select v_sale_id, v_folio;
end;
$$;

grant execute on function public.pos_checkout_fast(uuid, text, text, text, text, text, jsonb) to anon, authenticated;

select pg_notify('pgrst', 'reload schema');
