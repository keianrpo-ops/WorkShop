alter table public.customers add column if not exists document_number text;

update public.customers
set
  document_number = nullif(
    upper(
      regexp_replace(
        coalesce(
          document_number,
          substring(coalesce(notes, '') from 'Documento:\s*([A-Za-z0-9.-]+)')
        ),
        '[^A-Za-z0-9]',
        '',
        'g'
      )
    ),
    ''
  ),
  email = nullif(lower(trim(coalesce(email, ''))), ''),
  phone = nullif(
    case
      when length(regexp_replace(coalesce(phone, ''), '\D', '', 'g')) = 12
        and left(regexp_replace(coalesce(phone, ''), '\D', '', 'g'), 2) = '57'
        then right(regexp_replace(coalesce(phone, ''), '\D', '', 'g'), 10)
      else regexp_replace(coalesce(phone, ''), '\D', '', 'g')
    end,
    ''
  );

-- Fusiona duplicados por documento.
with ranked as (
  select
    id,
    first_value(id) over (partition by workshop_id, document_number order by created_at asc, id asc) as canonical_id,
    row_number() over (partition by workshop_id, document_number order by created_at asc, id asc) as row_number
  from public.customers
  where document_number is not null
),
duplicates as (
  select id, canonical_id from ranked where row_number > 1
)
update public.vehicles v set customer_id = duplicates.canonical_id from duplicates where v.customer_id = duplicates.id;

with ranked as (
  select id, first_value(id) over (partition by workshop_id, document_number order by created_at asc, id asc) as canonical_id, row_number() over (partition by workshop_id, document_number order by created_at asc, id asc) as row_number
  from public.customers where document_number is not null
),
duplicates as (
  select id, canonical_id from ranked where row_number > 1
)
update public.work_orders w set customer_id = duplicates.canonical_id from duplicates where w.customer_id = duplicates.id;

with ranked as (
  select id, first_value(id) over (partition by workshop_id, document_number order by created_at asc, id asc) as canonical_id, row_number() over (partition by workshop_id, document_number order by created_at asc, id asc) as row_number
  from public.customers where document_number is not null
),
duplicates as (
  select id, canonical_id from ranked where row_number > 1
)
update public.quotations q set customer_id = duplicates.canonical_id from duplicates where q.customer_id = duplicates.id;

with ranked as (
  select id, first_value(id) over (partition by workshop_id, document_number order by created_at asc, id asc) as canonical_id, row_number() over (partition by workshop_id, document_number order by created_at asc, id asc) as row_number
  from public.customers where document_number is not null
),
duplicates as (
  select id, canonical_id from ranked where row_number > 1
)
update public.sales s set customer_id = duplicates.canonical_id from duplicates where s.customer_id = duplicates.id;

with ranked as (
  select id, row_number() over (partition by workshop_id, document_number order by created_at asc, id asc) as row_number
  from public.customers where document_number is not null
)
delete from public.customers c using ranked where c.id = ranked.id and ranked.row_number > 1;

-- Fusiona duplicados por correo.
with ranked as (
  select id, first_value(id) over (partition by workshop_id, email order by created_at asc, id asc) as canonical_id, row_number() over (partition by workshop_id, email order by created_at asc, id asc) as row_number
  from public.customers where email is not null
),
duplicates as (
  select id, canonical_id from ranked where row_number > 1
)
update public.vehicles v set customer_id = duplicates.canonical_id from duplicates where v.customer_id = duplicates.id;

with ranked as (
  select id, first_value(id) over (partition by workshop_id, email order by created_at asc, id asc) as canonical_id, row_number() over (partition by workshop_id, email order by created_at asc, id asc) as row_number
  from public.customers where email is not null
),
duplicates as (
  select id, canonical_id from ranked where row_number > 1
)
update public.work_orders w set customer_id = duplicates.canonical_id from duplicates where w.customer_id = duplicates.id;

with ranked as (
  select id, first_value(id) over (partition by workshop_id, email order by created_at asc, id asc) as canonical_id, row_number() over (partition by workshop_id, email order by created_at asc, id asc) as row_number
  from public.customers where email is not null
),
duplicates as (
  select id, canonical_id from ranked where row_number > 1
)
update public.quotations q set customer_id = duplicates.canonical_id from duplicates where q.customer_id = duplicates.id;

with ranked as (
  select id, first_value(id) over (partition by workshop_id, email order by created_at asc, id asc) as canonical_id, row_number() over (partition by workshop_id, email order by created_at asc, id asc) as row_number
  from public.customers where email is not null
),
duplicates as (
  select id, canonical_id from ranked where row_number > 1
)
update public.sales s set customer_id = duplicates.canonical_id from duplicates where s.customer_id = duplicates.id;

with ranked as (
  select id, row_number() over (partition by workshop_id, email order by created_at asc, id asc) as row_number
  from public.customers where email is not null
)
delete from public.customers c using ranked where c.id = ranked.id and ranked.row_number > 1;

-- Fusiona duplicados por telefono normalizado.
with ranked as (
  select id, first_value(id) over (partition by workshop_id, phone order by created_at asc, id asc) as canonical_id, row_number() over (partition by workshop_id, phone order by created_at asc, id asc) as row_number
  from public.customers where phone is not null
),
duplicates as (
  select id, canonical_id from ranked where row_number > 1
)
update public.vehicles v set customer_id = duplicates.canonical_id from duplicates where v.customer_id = duplicates.id;

with ranked as (
  select id, first_value(id) over (partition by workshop_id, phone order by created_at asc, id asc) as canonical_id, row_number() over (partition by workshop_id, phone order by created_at asc, id asc) as row_number
  from public.customers where phone is not null
),
duplicates as (
  select id, canonical_id from ranked where row_number > 1
)
update public.work_orders w set customer_id = duplicates.canonical_id from duplicates where w.customer_id = duplicates.id;

with ranked as (
  select id, first_value(id) over (partition by workshop_id, phone order by created_at asc, id asc) as canonical_id, row_number() over (partition by workshop_id, phone order by created_at asc, id asc) as row_number
  from public.customers where phone is not null
),
duplicates as (
  select id, canonical_id from ranked where row_number > 1
)
update public.quotations q set customer_id = duplicates.canonical_id from duplicates where q.customer_id = duplicates.id;

with ranked as (
  select id, first_value(id) over (partition by workshop_id, phone order by created_at asc, id asc) as canonical_id, row_number() over (partition by workshop_id, phone order by created_at asc, id asc) as row_number
  from public.customers where phone is not null
),
duplicates as (
  select id, canonical_id from ranked where row_number > 1
)
update public.sales s set customer_id = duplicates.canonical_id from duplicates where s.customer_id = duplicates.id;

with ranked as (
  select id, row_number() over (partition by workshop_id, phone order by created_at asc, id asc) as row_number
  from public.customers where phone is not null
)
delete from public.customers c using ranked where c.id = ranked.id and ranked.row_number > 1;

create unique index if not exists idx_customers_unique_document_per_workshop
on public.customers(workshop_id, document_number)
where document_number is not null;

create unique index if not exists idx_customers_unique_email_per_workshop
on public.customers(workshop_id, email)
where email is not null;

create unique index if not exists idx_customers_unique_phone_per_workshop
on public.customers(workshop_id, phone)
where phone is not null;
