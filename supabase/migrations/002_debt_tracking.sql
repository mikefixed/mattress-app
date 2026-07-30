-- ============================================================
-- Migration 002 — Credit sales / debtor tracking
-- Run this in Supabase SQL Editor. Safe to run once on a database
-- that already has schema.sql applied.
-- ============================================================

-- Track how much of a sale has actually been paid.
alter table sales add column if not exists amount_paid numeric(12,2) not null default 0;

-- Backfill: anything not paid on credit was, by definition, paid in full already.
update sales set amount_paid = total_amount where payment_method <> 'credit' and amount_paid = 0;

-- A running log of payments received against a credit sale (a "debt").
create table if not exists debt_payments (
  id uuid primary key default uuid_generate_v4(),
  sale_id uuid not null references sales(id) on delete cascade,
  store_id uuid not null references stores(id) on delete cascade,
  amount numeric(12,2) not null,
  note text,
  recorded_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_debt_payments_sale on debt_payments(sale_id);
create index if not exists idx_debt_payments_store on debt_payments(store_id);

alter table debt_payments enable row level security;

drop policy if exists "debt_payments_select" on debt_payments;
create policy "debt_payments_select" on debt_payments for select
  using (is_ceo() or store_id = my_store());

drop policy if exists "debt_payments_insert" on debt_payments;
create policy "debt_payments_insert" on debt_payments for insert
  with check (is_ceo() or store_id = my_store());
