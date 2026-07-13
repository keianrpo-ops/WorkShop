alter table public.employee_documents enable row level security;
alter table public.employee_history enable row level security;
alter table public.attendance_records enable row level security;
alter table public.work_order_labor enable row level security;
alter table public.commission_rules enable row level security;
alter table public.employee_advances enable row level security;
alter table public.employee_loans enable row level security;
alter table public.payroll_runs enable row level security;
alter table public.payroll_items enable row level security;
alter table public.treasury_accounts enable row level security;
alter table public.treasury_transactions enable row level security;

drop policy if exists "Demo read employee_documents" on public.employee_documents;
drop policy if exists "Demo insert employee_documents" on public.employee_documents;
drop policy if exists "Demo update employee_documents" on public.employee_documents;
drop policy if exists "Demo delete employee_documents" on public.employee_documents;
create policy "Demo read employee_documents" on public.employee_documents for select using (true);
create policy "Demo insert employee_documents" on public.employee_documents for insert with check (true);
create policy "Demo update employee_documents" on public.employee_documents for update using (true);
create policy "Demo delete employee_documents" on public.employee_documents for delete using (true);

drop policy if exists "Demo read employee_history" on public.employee_history;
drop policy if exists "Demo insert employee_history" on public.employee_history;
drop policy if exists "Demo update employee_history" on public.employee_history;
drop policy if exists "Demo delete employee_history" on public.employee_history;
create policy "Demo read employee_history" on public.employee_history for select using (true);
create policy "Demo insert employee_history" on public.employee_history for insert with check (true);
create policy "Demo update employee_history" on public.employee_history for update using (true);
create policy "Demo delete employee_history" on public.employee_history for delete using (true);

drop policy if exists "Demo read attendance_records" on public.attendance_records;
drop policy if exists "Demo insert attendance_records" on public.attendance_records;
drop policy if exists "Demo update attendance_records" on public.attendance_records;
drop policy if exists "Demo delete attendance_records" on public.attendance_records;
create policy "Demo read attendance_records" on public.attendance_records for select using (true);
create policy "Demo insert attendance_records" on public.attendance_records for insert with check (true);
create policy "Demo update attendance_records" on public.attendance_records for update using (true);
create policy "Demo delete attendance_records" on public.attendance_records for delete using (true);

drop policy if exists "Demo read work_order_labor" on public.work_order_labor;
drop policy if exists "Demo insert work_order_labor" on public.work_order_labor;
drop policy if exists "Demo update work_order_labor" on public.work_order_labor;
drop policy if exists "Demo delete work_order_labor" on public.work_order_labor;
create policy "Demo read work_order_labor" on public.work_order_labor for select using (true);
create policy "Demo insert work_order_labor" on public.work_order_labor for insert with check (true);
create policy "Demo update work_order_labor" on public.work_order_labor for update using (true);
create policy "Demo delete work_order_labor" on public.work_order_labor for delete using (true);

drop policy if exists "Demo read commission_rules" on public.commission_rules;
drop policy if exists "Demo insert commission_rules" on public.commission_rules;
drop policy if exists "Demo update commission_rules" on public.commission_rules;
drop policy if exists "Demo delete commission_rules" on public.commission_rules;
create policy "Demo read commission_rules" on public.commission_rules for select using (true);
create policy "Demo insert commission_rules" on public.commission_rules for insert with check (true);
create policy "Demo update commission_rules" on public.commission_rules for update using (true);
create policy "Demo delete commission_rules" on public.commission_rules for delete using (true);

drop policy if exists "Demo read employee_advances" on public.employee_advances;
drop policy if exists "Demo insert employee_advances" on public.employee_advances;
drop policy if exists "Demo update employee_advances" on public.employee_advances;
drop policy if exists "Demo delete employee_advances" on public.employee_advances;
create policy "Demo read employee_advances" on public.employee_advances for select using (true);
create policy "Demo insert employee_advances" on public.employee_advances for insert with check (true);
create policy "Demo update employee_advances" on public.employee_advances for update using (true);
create policy "Demo delete employee_advances" on public.employee_advances for delete using (true);

drop policy if exists "Demo read employee_loans" on public.employee_loans;
drop policy if exists "Demo insert employee_loans" on public.employee_loans;
drop policy if exists "Demo update employee_loans" on public.employee_loans;
drop policy if exists "Demo delete employee_loans" on public.employee_loans;
create policy "Demo read employee_loans" on public.employee_loans for select using (true);
create policy "Demo insert employee_loans" on public.employee_loans for insert with check (true);
create policy "Demo update employee_loans" on public.employee_loans for update using (true);
create policy "Demo delete employee_loans" on public.employee_loans for delete using (true);

drop policy if exists "Demo read payroll_runs" on public.payroll_runs;
drop policy if exists "Demo insert payroll_runs" on public.payroll_runs;
drop policy if exists "Demo update payroll_runs" on public.payroll_runs;
drop policy if exists "Demo delete payroll_runs" on public.payroll_runs;
create policy "Demo read payroll_runs" on public.payroll_runs for select using (true);
create policy "Demo insert payroll_runs" on public.payroll_runs for insert with check (true);
create policy "Demo update payroll_runs" on public.payroll_runs for update using (true);
create policy "Demo delete payroll_runs" on public.payroll_runs for delete using (true);

drop policy if exists "Demo read payroll_items" on public.payroll_items;
drop policy if exists "Demo insert payroll_items" on public.payroll_items;
drop policy if exists "Demo update payroll_items" on public.payroll_items;
drop policy if exists "Demo delete payroll_items" on public.payroll_items;
create policy "Demo read payroll_items" on public.payroll_items for select using (true);
create policy "Demo insert payroll_items" on public.payroll_items for insert with check (true);
create policy "Demo update payroll_items" on public.payroll_items for update using (true);
create policy "Demo delete payroll_items" on public.payroll_items for delete using (true);

drop policy if exists "Demo read treasury_accounts" on public.treasury_accounts;
drop policy if exists "Demo insert treasury_accounts" on public.treasury_accounts;
drop policy if exists "Demo update treasury_accounts" on public.treasury_accounts;
drop policy if exists "Demo delete treasury_accounts" on public.treasury_accounts;
create policy "Demo read treasury_accounts" on public.treasury_accounts for select using (true);
create policy "Demo insert treasury_accounts" on public.treasury_accounts for insert with check (true);
create policy "Demo update treasury_accounts" on public.treasury_accounts for update using (true);
create policy "Demo delete treasury_accounts" on public.treasury_accounts for delete using (true);

drop policy if exists "Demo read treasury_transactions" on public.treasury_transactions;
drop policy if exists "Demo insert treasury_transactions" on public.treasury_transactions;
drop policy if exists "Demo update treasury_transactions" on public.treasury_transactions;
drop policy if exists "Demo delete treasury_transactions" on public.treasury_transactions;
create policy "Demo read treasury_transactions" on public.treasury_transactions for select using (true);
create policy "Demo insert treasury_transactions" on public.treasury_transactions for insert with check (true);
create policy "Demo update treasury_transactions" on public.treasury_transactions for update using (true);
create policy "Demo delete treasury_transactions" on public.treasury_transactions for delete using (true);
