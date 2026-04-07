create table if not exists public.settings (
  id bigint primary key,
  site_name text not null default 'COLDARC',
  support_text text not null default '支持咨询、下单、发货与基础售后说明。',
  checkout_notice text not null default '下单前请确认产品型号、联系方式与收货地址。',
  whatsapp text not null default '',
  telegram text not null default '',
  wechat text not null default '',
  email text not null default '',
  phone text not null default '',
  instagram text not null default '',
  stripe_publishable_key text not null default '',
  stripe_price_id text not null default '',
  bank_transfer_text text not null default '',
  crypto_payment_text text not null default '',
  crypto_wallet_address text not null default '',
  crypto_qr_code_url text not null default '',
  wechat_payment_text text not null default '',
  wechat_qr_code_url text not null default '',
  alipay_payment_text text not null default '',
  alipay_qr_code_url text not null default '',
  updated_at timestamptz not null default timezone('utc', now()),
  constraint settings_singleton check (id = 1)
);

create table if not exists public.orders (
  id bigint generated always as identity primary key,
  order_no text not null unique,
  customer_name text not null,
  phone text not null,
  email text not null,
  country text not null,
  address_line1 text not null,
  address_line2 text not null default '',
  city text not null,
  region text not null,
  postal_code text not null,
  product_name text not null,
  quantity integer not null default 1,
  remark text not null default '',
  payment_method text not null default 'stripe',
  payment_status text not null default 'pending',
  order_status text not null default 'pending',
  amount_cents integer not null default 0,
  currency text not null default 'usd',
  stripe_session_id text not null default '',
  payment_reference text not null default '',
  shipping_carrier text not null default '',
  tracking_number text not null default '',
  tracking_url text not null default '',
  admin_note text not null default '',
  notification_email_sent boolean not null default false,
  shipping_email_sent boolean not null default false,
  shipped_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.products (
  id bigint generated always as identity primary key,
  slug text not null unique,
  name text not null,
  subtitle text not null default '',
  price_usd numeric(12,2) not null default 0,
  compare_price_usd numeric(12,2),
  summary text not null default '',
  description text not null default '',
  primary_image_url text not null default '',
  gallery_image_urls jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.analytics_events (
  id bigint generated always as identity primary key,
  session_id text not null,
  visitor_id text not null default '',
  event_type text not null,
  page_path text not null default '',
  referrer text not null default '',
  channel text not null default '',
  order_no text not null default '',
  ip_hash text not null default '',
  user_agent text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.contact_events (
  id bigint generated always as identity primary key,
  session_id text not null,
  visitor_id text not null default '',
  channel text not null,
  page_path text not null default '',
  order_no text not null default '',
  customer_name text not null default '',
  email text not null default '',
  phone text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_orders_created_at on public.orders (created_at desc);
create index if not exists idx_orders_order_no on public.orders (order_no);
create index if not exists idx_products_sort_order on public.products (sort_order asc, created_at desc);
create index if not exists idx_analytics_events_created_at on public.analytics_events (created_at desc);
create index if not exists idx_analytics_events_type on public.analytics_events (event_type, created_at desc);
create index if not exists idx_contact_events_created_at on public.contact_events (created_at desc);
create index if not exists idx_contact_events_channel on public.contact_events (channel, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists settings_set_updated_at on public.settings;
create trigger settings_set_updated_at
before update on public.settings
for each row
execute function public.set_updated_at();

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at
before update on public.orders
for each row
execute function public.set_updated_at();

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
before update on public.products
for each row
execute function public.set_updated_at();

alter table public.settings enable row level security;
alter table public.orders enable row level security;
alter table public.products enable row level security;
alter table public.analytics_events enable row level security;
alter table public.contact_events enable row level security;

alter table if exists public.settings add column if not exists wechat_payment_text text not null default '';
alter table if exists public.settings add column if not exists alipay_payment_text text not null default '';
alter table if exists public.settings add column if not exists crypto_wallet_address text not null default '';
alter table if exists public.settings add column if not exists crypto_qr_code_url text not null default '';
alter table if exists public.settings add column if not exists wechat_qr_code_url text not null default '';
alter table if exists public.settings add column if not exists alipay_qr_code_url text not null default '';

alter table if exists public.orders add column if not exists payment_reference text not null default '';
alter table if exists public.orders add column if not exists shipping_carrier text not null default '';
alter table if exists public.orders add column if not exists tracking_number text not null default '';
alter table if exists public.orders add column if not exists tracking_url text not null default '';
alter table if exists public.orders add column if not exists admin_note text not null default '';
alter table if exists public.orders add column if not exists notification_email_sent boolean not null default false;
alter table if exists public.orders add column if not exists shipping_email_sent boolean not null default false;
alter table if exists public.orders add column if not exists shipped_at timestamptz;
alter table if exists public.orders add column if not exists crypto_txid text not null default '';
alter table if exists public.orders add column if not exists crypto_verified_at timestamptz;
alter table if exists public.orders add column if not exists crypto_expected_amount numeric(20,3);
alter table if exists public.orders add column if not exists crypto_payment_expires_at timestamptz;
alter table if exists public.orders add column if not exists payment_confirmed_email_sent boolean not null default false;

insert into public.products (
  slug,
  name,
  subtitle,
  price_usd,
  compare_price_usd,
  summary,
  description,
  primary_image_url,
  gallery_image_urls,
  is_active,
  sort_order
)
values (
  'ledger-nano-x',
  'Ledger Nano X',
  'Ledger 授权现货，支持验货与新手指导',
  199.00,
  229.00,
  '支持现货下单、收货验货、新手使用引导。',
  'Ledger Nano X 适合长期持有、冷存储和第一次购买硬钱包的用户。',
  'assets/images/ledger-hero.jpg',
  '["assets/images/ledger-hero.jpg","assets/images/ledger-side.jpg","assets/images/ledger-detail.png"]'::jsonb,
  true,
  1
)
on conflict (slug) do nothing;

insert into public.settings (id)
values (1)
on conflict (id) do nothing;
