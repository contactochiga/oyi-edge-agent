create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  name text,
  company text,
  role text,
  email text,
  phone text,
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

create index if not exists leads_updated_at_idx on leads (updated_at desc);
create index if not exists leads_status_owner_idx on leads (status, owner);

create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  agent_name text not null,
  message_role text not null,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists conversations_lead_id_created_at_idx
on conversations (lead_id, created_at);

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
