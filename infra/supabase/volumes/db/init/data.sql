create extension if not exists pgcrypto;

create table if not exists public.meter_broker_credentials (
  wallet_address text primary key,
  mqtt_username text not null unique,
  mqtt_password text not null,
  allowed_topic text not null,
  broker_url text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.meter_registrations (
  meter_id text primary key,
  seller_wallet text not null,
  metadata_uri text not null default '',
  source_type text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.mqtt_raw_messages (
  id bigint generated always as identity primary key,
  reading_id text,
  meter_id text,
  topic text not null,
  payload jsonb not null,
  received_at timestamptz not null default now()
);

create table if not exists public.normalized_meter_readings (
  reading_id text primary key,
  meter_id text not null,
  seller_wallet text not null,
  topic text not null,
  reading_timestamp timestamptz not null,
  cumulative_wh numeric(30, 0) not null,
  delta_wh numeric(30, 0),
  source_type text not null,
  payload_hash text not null,
  accepted boolean not null default false,
  rejection_reason text,
  created_at timestamptz not null default now()
);

create table if not exists public.energy_agreements_cache (
  agreement_id bigint primary key,
  meter_id text not null,
  buyer_wallet text not null,
  seller_wallet text not null,
  active boolean not null,
  end_time timestamptz not null,
  total_escrow numeric(78, 0) not null,
  remaining_escrow numeric(78, 0) not null,
  settled_energy_wh numeric(30, 0) not null default 0,
  settled_amount numeric(78, 0) not null default 0,
  last_cumulative_wh numeric(30, 0),
  last_reading_id text,
  updated_at timestamptz not null default now()
);

create table if not exists public.energy_settlement_attempts (
  id bigint generated always as identity primary key,
  reading_id text not null,
  agreement_id bigint,
  meter_id text not null,
  buyer_wallet text,
  seller_wallet text not null,
  energy_wh numeric(30, 0),
  payout_wei numeric(78, 0),
  payload_hash text not null,
  status text not null,
  failure_reason text,
  tx_hash text,
  created_at timestamptz not null default now()
);

create index if not exists idx_mqtt_raw_messages_meter_id on public.mqtt_raw_messages (meter_id);
create index if not exists idx_normalized_meter_readings_seller_wallet on public.normalized_meter_readings (seller_wallet);
create index if not exists idx_energy_settlement_attempts_seller_wallet on public.energy_settlement_attempts (seller_wallet);
create index if not exists idx_energy_settlement_attempts_buyer_wallet on public.energy_settlement_attempts (buyer_wallet);
