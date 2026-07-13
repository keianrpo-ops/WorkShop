-- Reglas de identidad para empleados/mecanicos.
-- Evita empleados duplicados por cedula/documento, correo o telefono dentro del mismo taller.

update public.mechanics
set
  document_number = nullif(upper(regexp_replace(coalesce(document_number, ''), '\s+', '', 'g')), ''),
  email = nullif(lower(trim(coalesce(email, ''))), ''),
  phone = nullif(trim(coalesce(phone, '')), '');

create unique index if not exists idx_mechanics_unique_document_per_workshop
on public.mechanics(workshop_id, document_number)
where document_number is not null;

create unique index if not exists idx_mechanics_unique_email_per_workshop
on public.mechanics(workshop_id, email)
where email is not null;

create unique index if not exists idx_mechanics_unique_phone_per_workshop
on public.mechanics(workshop_id, phone)
where phone is not null;
