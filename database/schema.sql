  -- ============================================================
  -- QueueLess: Supabase PostgreSQL Schema
  -- Run this in the Supabase SQL editor (or via `supabase db push`)
  -- ============================================================

  create extension if not exists "uuid-ossp";

  -- ------------------------------------------------------------
  -- ENUM TYPES
  -- ------------------------------------------------------------
  create type user_role as enum ('customer', 'org_admin', 'staff');
  create type org_type as enum ('hospital','clinic','college','government','bank','diagnostic_center','service_center','other');
  create type queue_status as enum ('open','paused','closed');
  create type token_status as enum ('WAITING','CALLED','IN_SERVICE','COMPLETED','SKIPPED','CANCELLED','NO_SHOW');
  create type notification_type as enum (
    'QUEUE_JOINED','QUEUE_APPROACHING','TOKEN_CALLED',
    'SERVICE_STARTED','SERVICE_COMPLETED','QUEUE_CANCELLED','QUEUE_DELAYED'
  );

  -- ------------------------------------------------------------
  -- PROFILES (extends Supabase auth.users)
  -- ------------------------------------------------------------
  create table profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    full_name text not null,
    phone text,
    role user_role not null default 'customer',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  );

  -- ------------------------------------------------------------
  -- ORGANIZATIONS
  -- ------------------------------------------------------------
  create table organizations (
    id uuid primary key default uuid_generate_v4(),
    owner_id uuid not null references profiles(id) on delete cascade,
    name text not null,
    org_type org_type not null,
    logo_url text,
    address text,
    city text,
    location_lat double precision,
    location_lng double precision,
    notification_threshold int not null default 3, -- "people ahead" trigger
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  );

  create table organization_members (
    id uuid primary key default uuid_generate_v4(),
    organization_id uuid not null references organizations(id) on delete cascade,
    profile_id uuid not null references profiles(id) on delete cascade,
    role user_role not null default 'staff', -- org_admin | staff
    created_at timestamptz not null default now(),
    unique (organization_id, profile_id)
  );

  -- ------------------------------------------------------------
  -- SERVICES
  -- ------------------------------------------------------------
  create table services (
    id uuid primary key default uuid_generate_v4(),
    organization_id uuid not null references organizations(id) on delete cascade,
    name text not null,
    description text,
    average_service_minutes int not null default 5,
    is_active boolean not null default true,
    created_at timestamptz not null default now()
  );

  -- ------------------------------------------------------------
  -- QUEUES  (one active queue per service, holds the token counter)
  -- ------------------------------------------------------------
  create table queues (
    id uuid primary key default uuid_generate_v4(),
    service_id uuid not null references services(id) on delete cascade,
    organization_id uuid not null references organizations(id) on delete cascade,
    token_prefix text not null default 'A',
    current_token_number int not null default 0,   -- last number issued
    now_serving_number int not null default 0,      -- currently called token
    starting_number int not null default 1,
    daily_reset boolean not null default true,
    last_reset_date date not null default current_date,
    status queue_status not null default 'open',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  );

  create table queue_counters (
    id uuid primary key default uuid_generate_v4(),
    queue_id uuid not null references queues(id) on delete cascade,
    organization_id uuid not null references organizations(id) on delete cascade,
    label text not null,              -- "Counter 1"
    staff_id uuid references profiles(id) on delete set null,
    is_active boolean not null default true,
    created_at timestamptz not null default now()
  );

  -- ------------------------------------------------------------
  -- QUEUE ENTRIES (a customer's token)
  -- ------------------------------------------------------------
  create table queue_entries (
    id uuid primary key default uuid_generate_v4(),
    queue_id uuid not null references queues(id) on delete cascade,
    user_id uuid not null references profiles(id) on delete cascade,
    token_number int not null,
    token_label text not null,        -- e.g. GEN-047
    status token_status not null default 'WAITING',
    counter_id uuid references queue_counters(id) on delete set null,
    joined_at timestamptz not null default now(),
    called_at timestamptz,
    service_started_at timestamptz,
    completed_at timestamptz,
    people_ahead_at_join int,
    active_counters_at_join int,
    -- prevent the same user from joining the same open queue twice
    constraint uq_user_active_queue unique (queue_id, user_id, status)
      deferrable initially deferred
  );

  -- Note: the unique constraint above only blocks exact (queue,user,status) dup rows.
  -- True "no duplicate active join" rule is enforced in application logic via a
  -- partial unique index on WAITING/CALLED/IN_SERVICE below.
  create unique index uq_one_active_entry_per_user
    on queue_entries (queue_id, user_id)
    where status in ('WAITING','CALLED','IN_SERVICE');

  -- ------------------------------------------------------------
  -- QUEUE EVENTS (audit trail + ML training data)
  -- ------------------------------------------------------------
  create table queue_events (
    id uuid primary key default uuid_generate_v4(),
    queue_entry_id uuid not null references queue_entries(id) on delete cascade,
    queue_id uuid not null references queues(id) on delete cascade,
    event_type text not null,  -- JOINED, CALLED, STARTED, COMPLETED, SKIPPED, CANCELLED, NO_SHOW
    people_waiting int,
    active_counters int,
    day_of_week int,           -- 0-6
    time_of_day time,
    actual_waiting_minutes numeric,
    service_duration_minutes numeric,
    created_at timestamptz not null default now()
  );

  -- ------------------------------------------------------------
  -- NOTIFICATIONS
  -- ------------------------------------------------------------
  create table notifications (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references profiles(id) on delete cascade,
    type notification_type not null,
    title text not null,
    message text not null,
    queue_entry_id uuid references queue_entries(id) on delete cascade,
    is_read boolean not null default false,
    created_at timestamptz not null default now()
  );

  create table notification_preferences (
    user_id uuid primary key references profiles(id) on delete cascade,
    email_enabled boolean not null default true,
    in_app_enabled boolean not null default true
  );

  create table email_logs (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references profiles(id) on delete set null,
    email_to text not null,
    subject text not null,
    template text not null,
    status text not null default 'PENDING', -- PENDING, SENT, FAILED
    error_message text,
    created_at timestamptz not null default now()
  );

  -- ------------------------------------------------------------
  -- INDEXES
  -- ------------------------------------------------------------
  create index idx_queue_entries_queue_status on queue_entries(queue_id, status);
  create index idx_queue_entries_user_status on queue_entries(user_id, status);
  create index idx_queue_events_queue_created on queue_events(queue_id, created_at);
  create index idx_notifications_user_read on notifications(user_id, is_read);
  create index idx_org_members_org on organization_members(organization_id);
  create index idx_services_org on services(organization_id);
  create index idx_queues_service on queues(service_id);

  -- ------------------------------------------------------------
  -- CONCURRENCY-SAFE TOKEN ISSUANCE FUNCTION
  -- Uses row-level locking (SELECT ... FOR UPDATE) so simultaneous
  -- joins never get the same token number.
  -- ------------------------------------------------------------
  create or replace function issue_next_token(p_queue_id uuid, p_user_id uuid)
  returns queue_entries
  language plpgsql
  as $$
  declare
    v_queue queues%rowtype;
    v_next_number int;
    v_label text;
    v_entry queue_entries%rowtype;
  begin
    -- lock the queue row to serialize token issuance
    select * into v_queue from queues where id = p_queue_id for update;

    if v_queue.id is null then
      raise exception 'Queue not found';
    end if;
    if v_queue.status <> 'open' then
      raise exception 'Queue is not open';
    end if;

    -- daily reset
    if v_queue.daily_reset and v_queue.last_reset_date < current_date then
      update queues
        set current_token_number = 0,
            now_serving_number = 0,
            last_reset_date = current_date
        where id = p_queue_id;
      v_queue.current_token_number := 0;
    end if;

    v_next_number := greatest(v_queue.current_token_number, v_queue.starting_number - 1) + 1;
    v_label := v_queue.token_prefix || '-' || lpad(v_next_number::text, 3, '0');

    update queues set current_token_number = v_next_number, updated_at = now()
      where id = p_queue_id;

    insert into queue_entries (queue_id, user_id, token_number, token_label, status)
    values (p_queue_id, p_user_id, v_next_number, v_label, 'WAITING')
    returning * into v_entry;

    insert into queue_events (queue_entry_id, queue_id, event_type, day_of_week, time_of_day)
    values (v_entry.id, p_queue_id, 'JOINED', extract(dow from now())::int, now()::time);

    return v_entry;
  end;
  $$;

  -- ------------------------------------------------------------
  -- ROW LEVEL SECURITY
  -- ------------------------------------------------------------
  alter table profiles enable row level security;
  alter table organizations enable row level security;
  alter table organization_members enable row level security;
  alter table services enable row level security;
  alter table queues enable row level security;
  alter table queue_counters enable row level security;
  alter table queue_entries enable row level security;
  alter table queue_events enable row level security;
  alter table notifications enable row level security;
  alter table notification_preferences enable row level security;

  -- profiles: user can read/update own profile; anyone can read basic org-member profiles
  create policy profiles_select_own on profiles for select using (auth.uid() = id);
  create policy profiles_update_own on profiles for update using (auth.uid() = id);
  create policy profiles_insert_own on profiles for insert with check (auth.uid() = id);

  -- organizations: public read; only owner/admin can modify
  create policy organizations_public_read on organizations for select using (true);
  create policy organizations_admin_write on organizations for all
    using (owner_id = auth.uid())
    with check (owner_id = auth.uid());

  -- organization_members: readable by org staff/admin; writable by admin
  create policy org_members_read on organization_members for select
    using (
      profile_id = auth.uid()
      or organization_id in (select id from organizations where owner_id = auth.uid())
    );
  create policy org_members_admin_write on organization_members for all
    using (organization_id in (select id from organizations where owner_id = auth.uid()));

  -- services / queues / counters: public read (customers browse), admin write
  create policy services_public_read on services for select using (true);
  create policy services_admin_write on services for all
    using (organization_id in (select id from organizations where owner_id = auth.uid()));

  create policy queues_public_read on queues for select using (true);
  create policy queues_admin_write on queues for all
    using (organization_id in (select id from organizations where owner_id = auth.uid()));

  create policy counters_org_read on queue_counters for select
    using (
      organization_id in (select id from organizations where owner_id = auth.uid())
      or staff_id = auth.uid()
    );
  create policy counters_admin_write on queue_counters for all
    using (organization_id in (select id from organizations where owner_id = auth.uid()));

  -- queue_entries: customer sees own entries; org staff/admin see entries for their org's queues
  create policy queue_entries_customer_read on queue_entries for select
    using (user_id = auth.uid());
  create policy queue_entries_org_read on queue_entries for select
    using (
      queue_id in (
        select q.id from queues q
        join organizations o on o.id = q.organization_id
        where o.owner_id = auth.uid()
      )
    );
  create policy queue_entries_customer_insert on queue_entries for insert
    with check (user_id = auth.uid());
  create policy queue_entries_customer_cancel on queue_entries for update
    using (user_id = auth.uid());
  create policy queue_entries_org_update on queue_entries for update
    using (
      queue_id in (
        select q.id from queues q
        join organizations o on o.id = q.organization_id
        where o.owner_id = auth.uid()
      )
    );

  -- notifications: user reads/updates only their own
  create policy notifications_own on notifications for select using (user_id = auth.uid());
  create policy notifications_update_own on notifications for update using (user_id = auth.uid());

  create policy notif_prefs_own on notification_preferences for all using (user_id = auth.uid());
