delete from public.inventory_items
where name in (
  'Aceite de Motor 5W30 (5L)',
  'Filtro de Aceite Universal',
  'Pastillas de Freno Delanteras'
);

delete from public.customers
where email in (
  'carlos.m@example.com',
  'maria.f@example.com',
  'contacto@ortiz.com'
);
