alter table public.work_order_diagnostics add column if not exists damage_description text;
alter table public.work_order_diagnostics add column if not exists severity text;
alter table public.work_order_diagnostics add column if not exists recommended_specialty text;

create index if not exists idx_work_order_diagnostics_created_at on public.work_order_diagnostics(created_at desc);
