create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  name text,
  company text,
  role text,
  email text,
  phone text,
  whatsapp_phone text,
  primary_channel text,
  channel_last_seen_at timestamptz,
  source text not null,
  location text,
  unit_count integer,
  project_type text,
  status text,
  owner text,
  commercial_stage text,
  lost_reason text,
  score numeric,
  summary text,
  next_action text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table leads add column if not exists whatsapp_phone text;
alter table leads add column if not exists primary_channel text;
alter table leads add column if not exists channel_last_seen_at timestamptz;
alter table leads add column if not exists unit_count integer;
alter table leads add column if not exists project_type text;
alter table leads add column if not exists commercial_stage text;
alter table leads add column if not exists lost_reason text;

create index if not exists leads_updated_at_idx on leads (updated_at desc);
create index if not exists leads_status_owner_idx on leads (status, owner);

create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  agent_name text not null,
  message_role text not null,
  channel text not null default 'website',
  external_message_id text,
  parent_external_message_id text,
  content text not null,
  created_at timestamptz not null default now()
);

alter table conversations add column if not exists channel text not null default 'website';
alter table conversations add column if not exists external_message_id text;
alter table conversations add column if not exists parent_external_message_id text;

create index if not exists conversations_lead_id_created_at_idx
on conversations (lead_id, created_at);

create table if not exists lead_channel_states (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  channel text not null,
  ai_paused boolean not null default false,
  human_owner text,
  human_status text not null default 'auto',
  takeover_started_at timestamptz,
  takeover_reason text,
  resume_mode text not null default 'manual_only',
  customer_service_window_expires_at timestamptz,
  last_external_message_id text,
  last_inbound_at timestamptz,
  last_outbound_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (lead_id, channel)
);

drop trigger if exists lead_channel_states_set_updated_at on lead_channel_states;
create trigger lead_channel_states_set_updated_at
before update on lead_channel_states
for each row
execute function set_updated_at();

create table if not exists inbound_events (
  id uuid primary key default gen_random_uuid(),
  channel text not null,
  provider text not null,
  event_type text not null,
  lead_id uuid references leads(id) on delete set null,
  external_event_id text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists inbound_events_channel_created_at_idx
on inbound_events (channel, created_at desc);

create table if not exists demos (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  scheduled_for timestamptz,
  status text,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists demos_lead_id_created_at_idx
on demos (lead_id, created_at desc);

create table if not exists proposals (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  title text not null,
  tier_name text,
  unit_count integer,
  monthly_price numeric,
  currency text not null default 'NGN',
  status text not null default 'draft',
  body text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists proposals_lead_id_created_at_idx
on proposals (lead_id, created_at desc);

drop trigger if exists proposals_set_updated_at on proposals;
create trigger proposals_set_updated_at
before update on proposals
for each row
execute function set_updated_at();

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists leads_set_updated_at on leads;
create trigger leads_set_updated_at
before update on leads
for each row
execute function set_updated_at();

create table if not exists lead_memories (
  lead_id uuid primary key references leads(id) on delete cascade,
  known_fields jsonb not null default '{}'::jsonb,
  need_signals text[] not null default '{}'::text[],
  open_questions text[] not null default '{}'::text[],
  keywords text[] not null default '{}'::text[],
  last_user_message text,
  last_agent_message text,
  last_status text,
  last_owner text,
  last_summary text,
  tool_calls text[] not null default '{}'::text[],
  updated_at timestamptz not null default now()
);

create table if not exists traces (
  id uuid primary key default gen_random_uuid(),
  trace_id text,
  lead_id uuid references leads(id) on delete cascade,
  type text not null,
  agent text,
  tool_name text,
  request_id text,
  source text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists traces_lead_id_created_at_idx
on traces (lead_id, created_at desc);

create index if not exists traces_trace_id_idx
on traces (trace_id);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references leads(id) on delete set null,
  type text not null default 'internal',
  urgency text,
  reason text,
  summary text,
  delivered boolean not null default false,
  channel text,
  response_code integer,
  status text not null default 'open',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists notifications_lead_id_created_at_idx
on notifications (lead_id, created_at desc);

create index if not exists notifications_status_idx
on notifications (status, type);

drop trigger if exists notifications_set_updated_at on notifications;
create trigger notifications_set_updated_at
before update on notifications
for each row
execute function set_updated_at();

create table if not exists admin_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  role text not null default 'admin',
  status text not null default 'active',
  display_name text,
  passport_photo_url text,
  qr_credential text,
  permission_scopes text[] not null default '{}'::text[],
  last_login_at timestamptz,
  password_changed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table admin_users add column if not exists last_login_at timestamptz;
alter table admin_users add column if not exists password_changed_at timestamptz;
alter table admin_users add column if not exists passport_photo_url text;
alter table admin_users add column if not exists qr_credential text;
alter table admin_users add column if not exists permission_scopes text[] not null default '{}'::text[];

drop trigger if exists admin_users_set_updated_at on admin_users;
create trigger admin_users_set_updated_at
before update on admin_users
for each row
execute function set_updated_at();

create table if not exists admin_invites (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  role text not null default 'viewer',
  display_name text,
  token_hash text not null unique,
  status text not null default 'pending',
  invited_by text,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists admin_invites_email_created_at_idx
on admin_invites (email, created_at desc);

drop trigger if exists admin_invites_set_updated_at on admin_invites;
create trigger admin_invites_set_updated_at
before update on admin_invites
for each row
execute function set_updated_at();

create table if not exists password_reset_tokens (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid references admin_users(id) on delete cascade,
  email text not null,
  token_hash text not null unique,
  status text not null default 'pending',
  requested_by text,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists office_packages (
  id text primary key,
  name text not null,
  code text not null,
  status text not null default 'active',
  setup_fee numeric not null default 0,
  monthly_fee numeric not null default 0,
  estate_limit integer,
  building_limit integer,
  home_limit integer,
  device_limit integer,
  api_access boolean not null default false,
  support_tier text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists office_packages_set_updated_at on office_packages;
create trigger office_packages_set_updated_at
before update on office_packages
for each row
execute function set_updated_at();

create table if not exists office_estates (
  id text primary key,
  name text not null,
  package_id text references office_packages(id) on delete set null,
  status text not null default 'active',
  subscription_status text not null default 'live',
  location text,
  buildings_count integer not null default 0,
  homes_count integer not null default 0,
  devices_count integer not null default 0,
  resident_count integer not null default 0,
  wallet_balance numeric not null default 0,
  monthly_recurring_revenue numeric not null default 0,
  support_open integer not null default 0,
  support_escalated integer not null default 0,
  connected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists office_estates_set_updated_at on office_estates;
create trigger office_estates_set_updated_at
before update on office_estates
for each row
execute function set_updated_at();

create table if not exists office_buildings (
  id text primary key,
  estate_id text references office_estates(id) on delete cascade,
  name text not null,
  type text,
  homes_count integer not null default 0,
  devices_count integer not null default 0,
  permitted_users integer not null default 0,
  live_cameras integer not null default 0,
  occupancy_pct numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists office_buildings_set_updated_at on office_buildings;
create trigger office_buildings_set_updated_at
before update on office_buildings
for each row
execute function set_updated_at();

create table if not exists office_homes (
  id text primary key,
  estate_id text references office_estates(id) on delete cascade,
  building_id text references office_buildings(id) on delete cascade,
  name text not null,
  residents_count integer not null default 0,
  devices_count integer not null default 0,
  wallet_balance numeric not null default 0,
  automation_state text not null default 'standby',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists office_homes_set_updated_at on office_homes;
create trigger office_homes_set_updated_at
before update on office_homes
for each row
execute function set_updated_at();

create table if not exists office_devices (
  id text primary key,
  estate_id text references office_estates(id) on delete cascade,
  building_id text references office_buildings(id) on delete cascade,
  home_id text references office_homes(id) on delete set null,
  name text not null,
  category text not null,
  provider text,
  protocol text,
  status text not null default 'online',
  battery_level numeric,
  last_seen_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table office_devices add column if not exists provider text;
alter table office_devices add column if not exists battery_level numeric;
alter table office_devices add column if not exists metadata jsonb not null default '{}'::jsonb;

drop trigger if exists office_devices_set_updated_at on office_devices;
create trigger office_devices_set_updated_at
before update on office_devices
for each row
execute function set_updated_at();

create table if not exists office_wallets (
  id text primary key,
  scope_type text not null,
  scope_id text not null,
  label text not null,
  balance numeric not null default 0,
  currency text not null default 'NGN',
  pending_charges numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists office_wallets_set_updated_at on office_wallets;
create trigger office_wallets_set_updated_at
before update on office_wallets
for each row
execute function set_updated_at();

create table if not exists office_analytics (
  id text primary key,
  surface text not null,
  label text not null,
  period text not null default '24h',
  sessions integer not null default 0,
  unique_visitors integer not null default 0,
  conversions integer not null default 0,
  active_agent text,
  top_source text,
  top_location text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists office_analytics_set_updated_at on office_analytics;
create trigger office_analytics_set_updated_at
before update on office_analytics
for each row
execute function set_updated_at();

create table if not exists office_support_mappings (
  id text primary key,
  estate_id text references office_estates(id) on delete cascade,
  building_id text references office_buildings(id) on delete set null,
  home_id text references office_homes(id) on delete set null,
  title text not null,
  category text not null,
  channel text not null default 'office',
  priority text not null default 'medium',
  status text not null default 'open',
  assigned_team text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists office_support_mappings_set_updated_at on office_support_mappings;
create trigger office_support_mappings_set_updated_at
before update on office_support_mappings
for each row
execute function set_updated_at();

create index if not exists password_reset_tokens_email_created_at_idx
on password_reset_tokens (email, created_at desc);

drop trigger if exists password_reset_tokens_set_updated_at on password_reset_tokens;
create trigger password_reset_tokens_set_updated_at
before update on password_reset_tokens
for each row
execute function set_updated_at();

create table if not exists timeline_events (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  event_type text not null,
  actor text,
  title text,
  body text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists timeline_events_lead_id_created_at_idx
on timeline_events (lead_id, created_at desc);

create table if not exists audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references admin_users(id) on delete set null,
  actor_email text,
  actor_role text,
  action text not null,
  target_type text not null,
  target_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_events_created_at_idx
on audit_events (created_at desc);
