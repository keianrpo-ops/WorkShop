-- Indices de rendimiento para navegacion y tablero.
-- Ejecutar una vez en Supabase SQL Editor.

create index if not exists idx_work_orders_workshop_status_created
on public.work_orders(workshop_id, status, created_at desc);

create index if not exists idx_work_orders_vehicle_status_created
on public.work_orders(vehicle_id, status, created_at desc);

create index if not exists idx_work_orders_mechanic_status_created
on public.work_orders(mechanic_id, status, created_at desc);

create index if not exists idx_vehicles_workshop_plate
on public.vehicles(workshop_id, plate);

create index if not exists idx_vehicle_photos_vehicle_created
on public.vehicle_photos(vehicle_id, created_at desc);

create index if not exists idx_vehicle_photos_work_order_created
on public.vehicle_photos(work_order_id, created_at desc);
