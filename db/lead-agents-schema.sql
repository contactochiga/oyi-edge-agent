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
  status text,
  owner text,
  score numeric,
  summary text,
  next_action text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table leads add column if not exists whatsapp_phone text;
alter table leads add column if not exists primary_channel text;
alter table leads add column if not exists channel_last_seen_at timestamptz;

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
  last_login_at timestamptz,
  password_changed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table admin_users add column if not exists last_login_at timestamptz;
alter table admin_users add column if not exists password_changed_at timestamptz;

drop trigger if exists admin_users_set_updated_at on admin_users;
create trigger admin_users_set_updated_at
before update on admin_users
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
