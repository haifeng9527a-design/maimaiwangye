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
  wechat_payment_text text not null default '',
  alipay_payment_text text not null default '',
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

create index if not exists idx_orders_created_at on public.orders (created_at desc);
create index if not exists idx_orders_order_no on public.orders (order_no);

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

alter table public.settings enable row level security;
alter table public.orders enable row level security;

alter table if exists public.settings add column if not exists wechat_payment_text text not null default '';
alter table if exists public.settings add column if not exists alipay_payment_text text not null default '';

alter table if exists public.orders add column if not exists payment_reference text not null default '';
alter table if exists public.orders add column if not exists shipping_carrier text not null default '';
alter table if exists public.orders add column if not exists tracking_number text not null default '';
alter table if exists public.orders add column if not exists tracking_url text not null default '';
alter table if exists public.orders add column if not exists admin_note text not null default '';
alter table if exists public.orders add column if not exists notification_email_sent boolean not null default false;
alter table if exists public.orders add column if not exists shipping_email_sent boolean not null default false;
alter table if exists public.orders add column if not exists shipped_at timestamptz;

insert into public.settings (id)
values (1)
on conflict (id) do nothing;
