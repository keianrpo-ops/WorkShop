-- Keeps the board coherent: a work order cannot move past Diagnostico
-- unless a mechanic is assigned. Cancelado is allowed without mechanic.

update public.work_orders
set status = 'Diagnostico'
where mechanic_id is null
  and status in (
    'Presupuesto pendiente',
    'Aprobacion pendiente',
    'Aprobado',
    'En reparacion',
    'Esperando repuestos',
    'Listo',
    'Entregado'
  );

create or replace function public.enforce_work_order_mechanic_status()
returns trigger
language plpgsql
as $$
begin
  if new.mechanic_id is null
    and new.status in (
      'Presupuesto pendiente',
      'Aprobacion pendiente',
      'Aprobado',
      'En reparacion',
      'Esperando repuestos',
      'Listo',
      'Entregado'
    )
  then
    raise exception 'Asigna un mecanico antes de mover la orden despues de Diagnostico.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_work_order_mechanic_status on public.work_orders;

create trigger trg_work_order_mechanic_status
before insert or update of status, mechanic_id
on public.work_orders
for each row
execute function public.enforce_work_order_mechanic_status();

select pg_notify('pgrst', 'reload schema');
