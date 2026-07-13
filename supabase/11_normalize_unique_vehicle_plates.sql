-- Normaliza placas duplicadas antiguas.
-- Uso recomendado:
-- 1) Primero limpia en el tablero los ingresos/ordenes activas duplicadas.
-- 2) Luego ejecuta este SQL para que cada placa exista una sola vez en public.vehicles.

update public.vehicles
set plate = upper(trim(plate))
where plate is not null;

with ranked_vehicles as (
  select
    id,
    first_value(id) over (
      partition by workshop_id, plate
      order by created_at asc, id asc
    ) as canonical_vehicle_id,
    row_number() over (
      partition by workshop_id, plate
      order by created_at asc, id asc
    ) as row_number
  from public.vehicles
  where plate is not null
),
duplicates as (
  select id, canonical_vehicle_id
  from ranked_vehicles
  where row_number > 1
)
update public.work_orders wo
set vehicle_id = duplicates.canonical_vehicle_id
from duplicates
where wo.vehicle_id = duplicates.id;

with ranked_vehicles as (
  select
    id,
    first_value(id) over (
      partition by workshop_id, plate
      order by created_at asc, id asc
    ) as canonical_vehicle_id,
    row_number() over (
      partition by workshop_id, plate
      order by created_at asc, id asc
    ) as row_number
  from public.vehicles
  where plate is not null
),
duplicates as (
  select id, canonical_vehicle_id
  from ranked_vehicles
  where row_number > 1
)
update public.vehicle_photos vp
set vehicle_id = duplicates.canonical_vehicle_id
from duplicates
where vp.vehicle_id = duplicates.id;

with ranked_vehicles as (
  select
    id,
    row_number() over (
      partition by workshop_id, plate
      order by created_at asc, id asc
    ) as row_number
  from public.vehicles
  where plate is not null
)
delete from public.vehicles v
using ranked_vehicles
where v.id = ranked_vehicles.id
  and ranked_vehicles.row_number > 1;

create unique index if not exists idx_vehicles_one_plate_per_workshop
on public.vehicles(workshop_id, plate);
