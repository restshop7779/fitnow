create table if not exists public.showrooms (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  area text not null,
  address text not null default '',
  summary text,
  average_delivery_minutes integer not null default 40,
  prep_minutes integer not null default 5,
  pickup_enabled boolean not null default true,
  is_open boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.showrooms
  add column if not exists address text not null default '',
  add column if not exists prep_minutes integer not null default 5,
  add column if not exists pickup_enabled boolean not null default true,
  add column if not exists is_open boolean not null default true;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  showroom_id uuid references public.showrooms(id) on delete set null,
  slug text not null unique,
  name text not null,
  price integer not null check (price >= 0),
  discount_rate integer not null default 0 check (discount_rate between 0 and 90),
  category text not null,
  meta text,
  tone text,
  material text,
  fit text,
  size_label text not null default 'FREE',
  description text not null default '',
  match_score integer check (match_score between 0 and 100),
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  delivery_minutes integer not null default 45,
  visual_key text not null,
  image_url text,
  created_at timestamptz not null default now()
);

alter table public.products
  add column if not exists size_label text not null default 'FREE',
  add column if not exists description text not null default '',
  add column if not exists discount_rate integer not null default 0,
  add column if not exists image_url text;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_code text not null unique,
  user_id text,
  showroom_id uuid references public.showrooms(id) on delete set null,
  status text not null default 'pickup' check (status in ('reserved', 'stock_checked', 'styled', 'pickup', 'arriving', 'delivered', 'cancelled')),
  item_total integer not null check (item_total >= 0),
  delivery_fee integer not null default 3500 check (delivery_fee >= 0),
  total integer not null check (total >= 0),
  eta_minutes integer not null default 32,
  destination_label text not null default '동탄2',
  request_note text not null default '',
  created_at timestamptz not null default now()
);

alter table public.orders
  alter column user_id type text using user_id::text;

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_slug text not null,
  product_name text not null,
  size text not null default 'FREE',
  quantity integer not null check (quantity > 0),
  unit_price integer not null check (unit_price >= 0),
  selected_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.look_sets (
  id uuid primary key default gen_random_uuid(),
  showroom_id uuid references public.showrooms(id) on delete cascade,
  slug text not null unique,
  title text not null,
  description text not null default '',
  discount_rate integer not null default 0 check (discount_rate between 0 and 90),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.look_sets
  add column if not exists discount_rate integer not null default 0;

create table if not exists public.look_set_items (
  id uuid primary key default gen_random_uuid(),
  look_set_id uuid not null references public.look_sets(id) on delete cascade,
  product_id uuid references public.products(id) on delete cascade,
  product_slug text not null,
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  order_code text not null,
  user_id text,
  product_id uuid references public.products(id) on delete set null,
  product_slug text not null,
  product_name text not null,
  showroom_id uuid references public.showrooms(id) on delete set null,
  showroom_name text not null,
  size text not null default 'FREE',
  rating integer not null check (rating between 1 and 5),
  comment text not null default '',
  fit text not null default '',
  photo_url text not null default '',
  photo_path text not null default '',
  is_hidden boolean not null default false,
  hidden_reason text not null default '',
  hidden_by text not null default '',
  hidden_at timestamptz,
  customer_name text not null default '고객',
  created_at timestamptz not null default now(),
  unique (order_code, product_slug, size, user_id)
);

alter table public.product_reviews
  add column if not exists fit text not null default '',
  add column if not exists photo_url text not null default '',
  add column if not exists photo_path text not null default '',
  add column if not exists is_hidden boolean not null default false,
  add column if not exists hidden_reason text not null default '',
  add column if not exists hidden_by text not null default '',
  add column if not exists hidden_at timestamptz;

create table if not exists public.wishlists (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  product_id uuid references public.products(id) on delete cascade,
  product_slug text not null,
  product_name text not null default '',
  showroom_name text not null default '',
  created_at timestamptz not null default now(),
  unique (user_id, product_slug)
);

create table if not exists public.partner_accounts (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('vendor', 'delivery')),
  slug text not null unique,
  name text not null,
  pin text not null,
  manager_name text not null default '',
  area text not null default '',
  address text not null default '',
  prep_minutes integer not null default 5 check (prep_minutes >= 0),
  is_open boolean not null default true,
  areas text[] not null default '{}',
  riders text[] not null default '{}',
  sort_order integer not null default 0,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists products_showroom_id_idx on public.products(showroom_id);
create index if not exists order_items_order_id_idx on public.order_items(order_id);
create index if not exists orders_created_at_idx on public.orders(created_at desc);
create index if not exists look_sets_showroom_id_idx on public.look_sets(showroom_id);
create index if not exists look_set_items_look_set_id_idx on public.look_set_items(look_set_id);
create index if not exists product_reviews_product_slug_idx on public.product_reviews(product_slug);
create index if not exists product_reviews_showroom_name_idx on public.product_reviews(showroom_name);
create index if not exists wishlists_user_id_idx on public.wishlists(user_id);
create index if not exists wishlists_product_slug_idx on public.wishlists(product_slug);
create index if not exists partner_accounts_kind_idx on public.partner_accounts(kind);
create index if not exists partner_accounts_updated_at_idx on public.partner_accounts(updated_at desc);

grant select, insert, update, delete on public.showrooms, public.products to anon, authenticated;
grant select, insert, update, delete on public.look_sets, public.look_set_items to anon, authenticated;
grant select, insert, update, delete on public.orders to anon, authenticated;
grant select, insert, delete on public.order_items to anon, authenticated;
grant select, insert, update, delete on public.product_reviews to anon, authenticated;
grant select, insert, update, delete on public.wishlists to anon, authenticated;
grant select, insert, update, delete on public.partner_accounts to anon, authenticated;

alter table public.showrooms enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.look_sets enable row level security;
alter table public.look_set_items enable row level security;
alter table public.product_reviews enable row level security;
alter table public.wishlists enable row level security;
alter table public.partner_accounts enable row level security;

drop policy if exists "Showrooms public read" on public.showrooms;
drop policy if exists "Showrooms public write" on public.showrooms;
drop policy if exists "Products public read" on public.products;
drop policy if exists "Products public write" on public.products;
drop policy if exists "Orders public read" on public.orders;
drop policy if exists "Orders public insert" on public.orders;
drop policy if exists "Orders public update" on public.orders;
drop policy if exists "Orders public delete" on public.orders;
drop policy if exists "Order items public read" on public.order_items;
drop policy if exists "Order items public insert" on public.order_items;
drop policy if exists "Order items public delete" on public.order_items;
drop policy if exists "Look sets public read" on public.look_sets;
drop policy if exists "Look sets public write" on public.look_sets;
drop policy if exists "Look set items public read" on public.look_set_items;
drop policy if exists "Look set items public write" on public.look_set_items;
drop policy if exists "Product reviews public read" on public.product_reviews;
drop policy if exists "Product reviews public write" on public.product_reviews;
drop policy if exists "Wishlists public read" on public.wishlists;
drop policy if exists "Wishlists public write" on public.wishlists;
drop policy if exists "Partner accounts public read" on public.partner_accounts;
drop policy if exists "Partner accounts public write" on public.partner_accounts;

create policy "Showrooms public read"
on public.showrooms for select
using (true);

create policy "Showrooms public write"
on public.showrooms for all
using (true)
with check (true);

create policy "Products public read"
on public.products for select
using (true);

create policy "Products public write"
on public.products for all
using (true)
with check (true);

create policy "Orders public read"
on public.orders for select
using (true);

create policy "Orders public insert"
on public.orders for insert
with check (true);

create policy "Orders public update"
on public.orders for update
using (true)
with check (true);

create policy "Orders public delete"
on public.orders for delete
using (true);

create policy "Order items public read"
on public.order_items for select
using (true);

create policy "Order items public insert"
on public.order_items for insert
with check (true);

create policy "Order items public delete"
on public.order_items for delete
using (true);

create policy "Look sets public read"
on public.look_sets for select
using (true);

create policy "Look sets public write"
on public.look_sets for all
using (true)
with check (true);

create policy "Look set items public read"
on public.look_set_items for select
using (true);

create policy "Look set items public write"
on public.look_set_items for all
using (true)
with check (true);

create policy "Product reviews public read"
on public.product_reviews for select
using (true);

create policy "Product reviews public write"
on public.product_reviews for all
using (true)
with check (true);

create policy "Wishlists public read"
on public.wishlists for select
using (true);

create policy "Wishlists public write"
on public.wishlists for all
using (true)
with check (true);

create policy "Partner accounts public read"
on public.partner_accounts for select
using (true);

create policy "Partner accounts public write"
on public.partner_accounts for all
using (true)
with check (true);

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = true;

insert into storage.buckets (id, name, public)
values ('delivery-proof-photos', 'delivery-proof-photos', true)
on conflict (id) do update set public = true;

insert into storage.buckets (id, name, public)
values ('review-photos', 'review-photos', true)
on conflict (id) do update set public = true;

drop policy if exists "Public product image read" on storage.objects;
drop policy if exists "Product image upload" on storage.objects;
drop policy if exists "Product image update" on storage.objects;
drop policy if exists "Public delivery proof photo read" on storage.objects;
drop policy if exists "Delivery proof photo upload" on storage.objects;
drop policy if exists "Delivery proof photo update" on storage.objects;
drop policy if exists "Delivery proof photo delete" on storage.objects;
drop policy if exists "Public review photo read" on storage.objects;
drop policy if exists "Review photo upload" on storage.objects;
drop policy if exists "Review photo update" on storage.objects;
drop policy if exists "Review photo delete" on storage.objects;

create policy "Public product image read"
on storage.objects for select
using (bucket_id = 'product-images');

create policy "Product image upload"
on storage.objects for insert
with check (bucket_id = 'product-images');

create policy "Product image update"
on storage.objects for update
using (bucket_id = 'product-images')
with check (bucket_id = 'product-images');

create policy "Public delivery proof photo read"
on storage.objects for select
using (bucket_id = 'delivery-proof-photos');

create policy "Delivery proof photo upload"
on storage.objects for insert
with check (bucket_id = 'delivery-proof-photos');

create policy "Delivery proof photo update"
on storage.objects for update
using (bucket_id = 'delivery-proof-photos')
with check (bucket_id = 'delivery-proof-photos');

create policy "Delivery proof photo delete"
on storage.objects for delete
using (bucket_id = 'delivery-proof-photos');

create policy "Public review photo read"
on storage.objects for select
using (bucket_id = 'review-photos');

create policy "Review photo upload"
on storage.objects for insert
with check (bucket_id = 'review-photos');

create policy "Review photo update"
on storage.objects for update
using (bucket_id = 'review-photos')
with check (bucket_id = 'review-photos');

create policy "Review photo delete"
on storage.objects for delete
using (bucket_id = 'review-photos');

select
  'fitnow_schema_ready' as check_name,
  (select count(*) from information_schema.tables where table_schema = 'public' and table_name in ('showrooms', 'products', 'orders', 'order_items', 'look_sets', 'look_set_items', 'product_reviews', 'wishlists', 'partner_accounts')) as public_table_count,
  (select count(*) from storage.buckets where id = 'product-images') as product_image_bucket_count,
  (select count(*) from storage.buckets where id = 'delivery-proof-photos') as delivery_proof_photo_bucket_count,
  (select count(*) from storage.buckets where id = 'review-photos') as review_photo_bucket_count;
