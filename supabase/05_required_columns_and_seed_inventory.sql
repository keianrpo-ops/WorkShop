alter table public.vehicles add column if not exists primary_image_url text;
alter table public.vehicles add column if not exists condition_status text not null default 'Recibido';
alter table public.mechanics add column if not exists phone text;
alter table public.mechanics add column if not exists email text;
alter table public.mechanics add column if not exists hourly_rate numeric(12, 2) not null default 0;
alter table public.mechanics add column if not exists is_active boolean not null default true;
alter table public.work_orders add column if not exists vehicle_condition text not null default 'Recibido';
alter table public.work_orders add column if not exists diagnosis_summary text;
alter table public.work_orders add column if not exists estimated_hours numeric(8, 2) not null default 0;
alter table public.work_orders add column if not exists hours_spent numeric(8, 2) not null default 0;
alter table public.work_orders add column if not exists total_amount numeric(12, 2) not null default 0;
alter table public.inventory_items add column if not exists image_url text;

insert into public.inventory_items (workshop_id, name, category, stock, min_stock, cost_price, sale_price, image_url)
select
  '00000000-0000-0000-0000-000000000001',
  item.name,
  item.category,
  item.stock,
  item.min_stock,
  item.cost_price,
  item.sale_price,
  item.image_url
from (
  values
    ('Filtro de aceite Toyota Corolla 1.8','Filtros',24,6,6.80,13.50,'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&w=600&q=80'),
    ('Filtro de aire Chevrolet Spark GT','Filtros',18,5,7.20,14.90,'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=600&q=80'),
    ('Filtro de combustible universal 5/16','Filtros',16,4,5.90,12.00,'https://images.unsplash.com/photo-1625047509168-a7026f36de04?auto=format&fit=crop&w=600&q=80'),
    ('Filtro de cabina Kia Picanto','Filtros',14,4,8.50,17.00,'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&w=600&q=80'),
    ('Aceite motor 10W-30 semisintetico 1L','Lubricantes',36,10,5.40,10.50,'https://images.unsplash.com/photo-1635438369283-bab8f1691e3c?auto=format&fit=crop&w=600&q=80'),
    ('Aceite motor 20W-50 mineral 1L','Lubricantes',30,8,4.70,9.50,'https://images.unsplash.com/photo-1635438369283-bab8f1691e3c?auto=format&fit=crop&w=600&q=80'),
    ('Aceite motor 5W-30 sintetico 1L','Lubricantes',28,8,8.90,17.50,'https://images.unsplash.com/photo-1635438369283-bab8f1691e3c?auto=format&fit=crop&w=600&q=80'),
    ('Liquido de frenos DOT 4 500ml','Fluidos',22,6,3.60,7.50,'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=600&q=80'),
    ('Refrigerante verde galon','Fluidos',20,5,5.80,11.50,'https://images.unsplash.com/photo-1625047509168-a7026f36de04?auto=format&fit=crop&w=600&q=80'),
    ('Limpiador de inyectores gasolina','Quimicos',18,5,4.20,9.00,'https://images.unsplash.com/photo-1635774855317-edf3ee4463c8?auto=format&fit=crop&w=600&q=80'),
    ('Pastillas freno delanteras Chevrolet Sail','Frenos',10,3,18.00,36.00,'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=600&q=80'),
    ('Pastillas freno delanteras Renault Logan','Frenos',10,3,19.50,39.00,'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=600&q=80'),
    ('Bandas freno traseras Hyundai Accent','Frenos',8,2,22.00,44.00,'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=600&q=80'),
    ('Disco de freno ventilado universal 240mm','Frenos',6,2,31.00,62.00,'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=600&q=80'),
    ('Kit mordaza freno motocicleta 125cc','Frenos Moto',12,3,9.50,19.00,'https://images.unsplash.com/photo-1558981852-426c6c22a060?auto=format&fit=crop&w=600&q=80'),
    ('Bujia NGK BKR6E','Encendido',40,10,2.40,5.50,'https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?auto=format&fit=crop&w=600&q=80'),
    ('Bujia Iridium NGK CR8EIX moto','Encendido Moto',18,4,7.80,16.50,'https://images.unsplash.com/photo-1558981852-426c6c22a060?auto=format&fit=crop&w=600&q=80'),
    ('Bobina de encendido Chevrolet Spark','Encendido',6,2,24.00,52.00,'https://images.unsplash.com/photo-1625047509168-a7026f36de04?auto=format&fit=crop&w=600&q=80'),
    ('Cable bujia juego 4 cilindros','Encendido',8,2,14.00,29.00,'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&w=600&q=80'),
    ('Sensor oxigeno universal 4 cables','Sensores',7,2,24.50,49.00,'https://images.unsplash.com/photo-1625047509168-a7026f36de04?auto=format&fit=crop&w=600&q=80'),
    ('Sensor MAP Chevrolet Aveo','Sensores',5,2,18.00,38.00,'https://images.unsplash.com/photo-1625047509168-a7026f36de04?auto=format&fit=crop&w=600&q=80'),
    ('Sensor TPS universal','Sensores',6,2,13.50,29.00,'https://images.unsplash.com/photo-1625047509168-a7026f36de04?auto=format&fit=crop&w=600&q=80'),
    ('Bombillo H4 halogeno 12V','Electricos',30,8,2.80,6.50,'https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?auto=format&fit=crop&w=600&q=80'),
    ('Bombillo H7 halogeno 12V','Electricos',26,8,3.40,7.50,'https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?auto=format&fit=crop&w=600&q=80'),
    ('Fusible mini surtido 10 piezas','Electricos',25,6,1.60,4.00,'https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?auto=format&fit=crop&w=600&q=80'),
    ('Relay automotriz 5 patas 12V','Electricos',18,5,3.20,7.00,'https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?auto=format&fit=crop&w=600&q=80'),
    ('Bateria moto 12N7-3B','Baterias',5,2,23.00,49.00,'https://images.unsplash.com/photo-1603712610494-cc805e9c8a7e?auto=format&fit=crop&w=600&q=80'),
    ('Bateria carro 45Ah libre mantenimiento','Baterias',4,1,58.00,115.00,'https://images.unsplash.com/photo-1603712610494-cc805e9c8a7e?auto=format&fit=crop&w=600&q=80'),
    ('Correa alternador 4PK870','Motor',8,2,8.00,17.00,'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&w=600&q=80'),
    ('Correa distribucion Chevrolet Aveo','Motor',5,2,19.00,39.00,'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&w=600&q=80'),
    ('Tensor correa accesorio universal','Motor',4,1,22.00,48.00,'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&w=600&q=80'),
    ('Termostato Chevrolet Corsa','Refrigeracion',7,2,9.50,20.00,'https://images.unsplash.com/photo-1625047509168-a7026f36de04?auto=format&fit=crop&w=600&q=80'),
    ('Tapa radiador 0.9 bar','Refrigeracion',15,4,3.20,7.50,'https://images.unsplash.com/photo-1625047509168-a7026f36de04?auto=format&fit=crop&w=600&q=80'),
    ('Manguera radiador universal 1 metro','Refrigeracion',10,3,6.50,14.00,'https://images.unsplash.com/photo-1625047509168-a7026f36de04?auto=format&fit=crop&w=600&q=80'),
    ('Amortiguador delantero Renault Logan','Suspension',4,2,38.00,78.00,'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=600&q=80'),
    ('Terminal direccion Chevrolet Aveo','Suspension',8,2,10.50,22.00,'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=600&q=80'),
    ('Rotula suspension Hyundai i10','Suspension',8,2,12.00,25.00,'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=600&q=80'),
    ('Buje tijera universal','Suspension',16,4,4.40,9.50,'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=600&q=80'),
    ('Rodamiento rueda delantera 6203','Rodamientos',18,5,3.50,8.00,'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&w=600&q=80'),
    ('Rodamiento rueda moto 6302','Rodamientos Moto',20,5,2.80,6.50,'https://images.unsplash.com/photo-1558981852-426c6c22a060?auto=format&fit=crop&w=600&q=80'),
    ('Cadena moto 428H x 120L','Transmision Moto',8,2,14.00,30.00,'https://images.unsplash.com/photo-1558981852-426c6c22a060?auto=format&fit=crop&w=600&q=80'),
    ('Kit arrastre moto 125cc','Transmision Moto',6,2,28.00,59.00,'https://images.unsplash.com/photo-1558981852-426c6c22a060?auto=format&fit=crop&w=600&q=80'),
    ('Guaya clutch moto universal','Cables Moto',12,3,4.20,9.50,'https://images.unsplash.com/photo-1558981852-426c6c22a060?auto=format&fit=crop&w=600&q=80'),
    ('Manigueta freno moto universal','Accesorios Moto',14,4,3.80,8.50,'https://images.unsplash.com/photo-1558981852-426c6c22a060?auto=format&fit=crop&w=600&q=80'),
    ('Espejo moto derecho universal','Accesorios Moto',12,3,5.00,11.00,'https://images.unsplash.com/photo-1558981852-426c6c22a060?auto=format&fit=crop&w=600&q=80'),
    ('Plumilla limpiaparabrisas 16 pulgadas','Accesorios',20,6,3.60,8.00,'https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?auto=format&fit=crop&w=600&q=80'),
    ('Plumilla limpiaparabrisas 20 pulgadas','Accesorios',20,6,4.10,9.00,'https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?auto=format&fit=crop&w=600&q=80'),
    ('Silicona alta temperatura roja','Quimicos',15,4,3.90,8.50,'https://images.unsplash.com/photo-1635774855317-edf3ee4463c8?auto=format&fit=crop&w=600&q=80'),
    ('Grasa multiproposito 250g','Lubricantes',18,5,3.30,7.00,'https://images.unsplash.com/photo-1635438369283-bab8f1691e3c?auto=format&fit=crop&w=600&q=80'),
    ('Desengrasante motor 500ml','Quimicos',16,5,3.10,7.00,'https://images.unsplash.com/photo-1635774855317-edf3ee4463c8?auto=format&fit=crop&w=600&q=80')
) as item(name, category, stock, min_stock, cost_price, sale_price, image_url)
where not exists (
  select 1
  from public.inventory_items existing
  where existing.workshop_id = '00000000-0000-0000-0000-000000000001'
    and existing.name = item.name
);

update public.inventory_items
set image_url = case
  when lower(coalesce(category, '')) like '%moto%' then 'https://images.unsplash.com/photo-1558981852-426c6c22a060?auto=format&fit=crop&w=600&q=80'
  when lower(coalesce(category, '')) like '%freno%' then 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=600&q=80'
  when lower(coalesce(category, '')) like '%bateria%' then 'https://images.unsplash.com/photo-1603712610494-cc805e9c8a7e?auto=format&fit=crop&w=600&q=80'
  when lower(coalesce(category, '')) like '%lubric%' then 'https://images.unsplash.com/photo-1635438369283-bab8f1691e3c?auto=format&fit=crop&w=600&q=80'
  when lower(coalesce(category, '')) like '%quim%' then 'https://images.unsplash.com/photo-1635774855317-edf3ee4463c8?auto=format&fit=crop&w=600&q=80'
  else 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&w=600&q=80'
end
where workshop_id = '00000000-0000-0000-0000-000000000001'
  and image_url is null;

select pg_notify('pgrst', 'reload schema');
