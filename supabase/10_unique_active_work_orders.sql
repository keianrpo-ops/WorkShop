-- Ejecuta este SQL despues de eliminar/cancelar duplicados visibles en el tablero.
-- Garantiza a nivel de base de datos que un vehiculo no tenga dos ordenes activas al mismo tiempo.

create unique index if not exists idx_work_orders_one_active_per_vehicle
on public.work_orders(workshop_id, vehicle_id)
where vehicle_id is not null
  and status not in ('Entregado', 'Cancelado');
