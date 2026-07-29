-- ============================================================
-- Amina Abubakar Mattress Stores — Database Schema
-- Run this once in Supabase SQL Editor (Project > SQL Editor > New query)
-- ============================================================

-- ---------- EXTENSIONS ----------
create extension if not exists "uuid-ossp";

-- ---------- TABLES ----------

create table if not exists stores (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  address text,
  phone text,
  created_at timestamptz not null default now()
);

-- profiles mirrors auth.users, adds role + store assignment
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null check (role in ('ceo','manager','staff')),
  store_id uuid references stores(id) on delete set null,
  phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
-- CEOs have store_id = null (they see all stores). Manager/staff must have a store_id.

create table if not exists products (
  id uuid primary key default uuid_generate_v4(),
  store_id uuid not null references stores(id) on delete cascade,
  name text not null,
  sku text,
  category text,
  size text,
  cost_price numeric(12,2) not null default 0,
  selling_price numeric(12,2) not null default 0,
  quantity integer not null default 0,
  reorder_level integer not null default 5,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists sales (
  id uuid primary key default uuid_generate_v4(),
  store_id uuid not null references stores(id) on delete cascade,
  sold_by uuid not null references profiles(id),
  customer_name text,
  customer_phone text,
  payment_method text not null default 'cash' check (payment_method in ('cash','transfer','pos','credit')),
  total_amount numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists sale_items (
  id uuid primary key default uuid_generate_v4(),
  sale_id uuid not null references sales(id) on delete cascade,
  product_id uuid not null references products(id),
  quantity integer not null,
  unit_price numeric(12,2) not null,
  subtotal numeric(12,2) not null
);

create table if not exists inventory_movements (
  id uuid primary key default uuid_generate_v4(),
  store_id uuid not null references stores(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  type text not null check (type in ('restock','sale','adjustment','transfer_in','transfer_out')),
  quantity integer not null,
  note text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_products_store on products(store_id);
create index if not exists idx_sales_store on sales(store_id);
create index if not exists idx_sale_items_sale on sale_items(sale_id);
create index if not exists idx_inv_move_store on inventory_movements(store_id);
create index if not exists idx_profiles_store on profiles(store_id);

-- ---------- HELPER FUNCTIONS (security definer, avoid RLS recursion) ----------

create or replace function my_role() returns text
language sql security definer stable as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function my_store() returns uuid
language sql security definer stable as $$
  select store_id from profiles where id = auth.uid();
$$;

create or replace function is_ceo() returns boolean
language sql security definer stable as $$
  select coalesce((select role from profiles where id = auth.uid()) = 'ceo', false);
$$;

-- ---------- ROW LEVEL SECURITY ----------

alter table stores enable row level security;
alter table profiles enable row level security;
alter table products enable row level security;
alter table sales enable row level security;
alter table sale_items enable row level security;
alter table inventory_movements enable row level security;

-- STORES: CEO sees/manages all. Manager & staff see only their own store.
create policy "stores_select" on stores for select
  using (is_ceo() or id = my_store());
create policy "stores_write" on stores for all
  using (is_ceo()) with check (is_ceo());

-- PROFILES: CEO sees/manages everyone. Manager sees staff in their own store (read only).
-- Everyone can see their own profile.
create policy "profiles_select" on profiles for select
  using (
    is_ceo()
    or id = auth.uid()
    or (my_role() = 'manager' and store_id = my_store())
  );
create policy "profiles_insert" on profiles for insert
  with check (is_ceo() or id = auth.uid());
create policy "profiles_update" on profiles for update
  using (is_ceo() or id = auth.uid())
  with check (is_ceo() or id = auth.uid());
create policy "profiles_delete" on profiles for delete
  using (is_ceo());

-- PRODUCTS: CEO full access everywhere. Manager full access within own store.
-- Staff can view products in own store, but cannot edit product records directly.
create policy "products_select" on products for select
  using (is_ceo() or store_id = my_store());
create policy "products_insert" on products for insert
  with check (is_ceo() or (my_role() = 'manager' and store_id = my_store()));
create policy "products_update" on products for update
  using (is_ceo() or (my_role() = 'manager' and store_id = my_store()))
  with check (is_ceo() or (my_role() = 'manager' and store_id = my_store()));
create policy "products_delete" on products for delete
  using (is_ceo() or (my_role() = 'manager' and store_id = my_store()));

-- SALES: CEO sees all. Manager/staff see & create sales for their own store.
create policy "sales_select" on sales for select
  using (is_ceo() or store_id = my_store());
create policy "sales_insert" on sales for insert
  with check (is_ceo() or store_id = my_store());
create policy "sales_update" on sales for update
  using (is_ceo() or (my_role() = 'manager' and store_id = my_store()))
  with check (is_ceo() or (my_role() = 'manager' and store_id = my_store()));
create policy "sales_delete" on sales for delete
  using (is_ceo());

-- SALE ITEMS: follow parent sale's store scope
create policy "sale_items_select" on sale_items for select
  using (
    is_ceo() or exists (
      select 1 from sales s where s.id = sale_id and s.store_id = my_store()
    )
  );
create policy "sale_items_insert" on sale_items for insert
  with check (
    is_ceo() or exists (
      select 1 from sales s where s.id = sale_id and s.store_id = my_store()
    )
  );

-- INVENTORY MOVEMENTS: same store-scoping pattern
create policy "inv_move_select" on inventory_movements for select
  using (is_ceo() or store_id = my_store());
create policy "inv_move_insert" on inventory_movements for insert
  with check (is_ceo() or store_id = my_store());

-- ---------- TRIGGER: keep products.updated_at fresh ----------
create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_products_updated_at on products;
create trigger trg_products_updated_at before update on products
  for each row execute function set_updated_at();

-- ---------- SEED: create the first CEO manually after signup ----------
-- After the CEO signs up through the app's /login (sign up) form, run this
-- once with their real auth user id (Authentication > Users in Supabase dashboard):
--
-- insert into profiles (id, full_name, role, store_id, is_active)
-- values ('PASTE-USER-UUID-HERE', 'Amina Abubakar', 'ceo', null, true);
