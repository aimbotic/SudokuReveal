-- Online gameplay schema for SudokuReveal.
-- All app-owned online gameplay tables use the sudoku_ prefix to avoid
-- colliding with other projects that share this Supabase database.

create table if not exists public.sudoku_online_rooms (
  id uuid primary key default gen_random_uuid(),
  room_code text not null unique,
  host_player_id text not null,
  puzzle_id text,
  status text not null default 'waiting'
    check (status in ('waiting', 'ready', 'playing', 'completed', 'cancelled', 'expired')),
  max_players integer not null default 2 check (max_players between 2 and 4),
  board_seed jsonb not null default '{}'::jsonb,
  current_turn_player_id text,
  winner_player_id text,
  started_at timestamptz,
  finished_at timestamptz,
  expires_at timestamptz not null default (now() + interval '2 hours'),
  last_activity_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sudoku_online_room_players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.sudoku_online_rooms(id) on delete cascade,
  player_id text not null,
  display_name text not null default 'Player',
  seat_number integer not null check (seat_number > 0),
  status text not null default 'joined'
    check (status in ('joined', 'ready', 'playing', 'completed', 'left', 'disconnected')),
  score integer not null default 0,
  mistakes integer not null default 0,
  completed_cells integer not null default 0,
  completed_at timestamptz,
  last_seen_at timestamptz not null default now(),
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (room_id, player_id),
  unique (room_id, seat_number)
);

create table if not exists public.sudoku_online_moves (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.sudoku_online_rooms(id) on delete cascade,
  player_id text not null,
  row_index integer not null check (row_index between 0 and 8),
  col_index integer not null check (col_index between 0 and 8),
  value integer check (value between 1 and 9),
  is_correct boolean,
  elapsed_ms integer check (elapsed_ms is null or elapsed_ms >= 0),
  client_move_id text,
  created_at timestamptz not null default now(),
  unique (room_id, player_id, client_move_id)
);

create table if not exists public.sudoku_online_events (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.sudoku_online_rooms(id) on delete cascade,
  player_id text,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists sudoku_online_rooms_room_code_idx
  on public.sudoku_online_rooms(room_code);

create index if not exists sudoku_online_rooms_status_activity_idx
  on public.sudoku_online_rooms(status, last_activity_at desc);

create index if not exists sudoku_online_room_players_room_idx
  on public.sudoku_online_room_players(room_id, status, last_seen_at desc);

create index if not exists sudoku_online_moves_room_created_idx
  on public.sudoku_online_moves(room_id, created_at);

create index if not exists sudoku_online_events_room_created_idx
  on public.sudoku_online_events(room_id, created_at);

create or replace function public.sudoku_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists sudoku_online_rooms_touch_updated_at on public.sudoku_online_rooms;
create trigger sudoku_online_rooms_touch_updated_at
before update on public.sudoku_online_rooms
for each row execute function public.sudoku_touch_updated_at();

drop trigger if exists sudoku_online_room_players_touch_updated_at on public.sudoku_online_room_players;
create trigger sudoku_online_room_players_touch_updated_at
before update on public.sudoku_online_room_players
for each row execute function public.sudoku_touch_updated_at();

alter table public.sudoku_online_rooms enable row level security;
alter table public.sudoku_online_room_players enable row level security;
alter table public.sudoku_online_moves enable row level security;
alter table public.sudoku_online_events enable row level security;

-- The current app uses local player ids and anonymous Supabase access.
-- These policies intentionally allow anonymous online play. Replace them with
-- auth-backed policies before using accounts or monetized competitive play.
drop policy if exists "anon can read sudoku online rooms" on public.sudoku_online_rooms;
create policy "anon can read sudoku online rooms"
on public.sudoku_online_rooms for select
to anon
using (true);

drop policy if exists "anon can create sudoku online rooms" on public.sudoku_online_rooms;
create policy "anon can create sudoku online rooms"
on public.sudoku_online_rooms for insert
to anon
with check (true);

drop policy if exists "anon can update active sudoku online rooms" on public.sudoku_online_rooms;
create policy "anon can update active sudoku online rooms"
on public.sudoku_online_rooms for update
to anon
using (status in ('waiting', 'ready', 'playing'))
with check (true);

drop policy if exists "anon can read sudoku online room players" on public.sudoku_online_room_players;
create policy "anon can read sudoku online room players"
on public.sudoku_online_room_players for select
to anon
using (true);

drop policy if exists "anon can write sudoku online room players" on public.sudoku_online_room_players;
create policy "anon can write sudoku online room players"
on public.sudoku_online_room_players for all
to anon
using (true)
with check (true);

drop policy if exists "anon can read sudoku online moves" on public.sudoku_online_moves;
create policy "anon can read sudoku online moves"
on public.sudoku_online_moves for select
to anon
using (true);

drop policy if exists "anon can create sudoku online moves" on public.sudoku_online_moves;
create policy "anon can create sudoku online moves"
on public.sudoku_online_moves for insert
to anon
with check (true);

drop policy if exists "anon can read sudoku online events" on public.sudoku_online_events;
create policy "anon can read sudoku online events"
on public.sudoku_online_events for select
to anon
using (true);

drop policy if exists "anon can create sudoku online events" on public.sudoku_online_events;
create policy "anon can create sudoku online events"
on public.sudoku_online_events for insert
to anon
with check (true);

alter table public.sudoku_online_rooms replica identity full;
alter table public.sudoku_online_room_players replica identity full;
alter table public.sudoku_online_moves replica identity full;
alter table public.sudoku_online_events replica identity full;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'sudoku_online_rooms'
    ) then
      alter publication supabase_realtime add table public.sudoku_online_rooms;
    end if;

    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'sudoku_online_room_players'
    ) then
      alter publication supabase_realtime add table public.sudoku_online_room_players;
    end if;

    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'sudoku_online_moves'
    ) then
      alter publication supabase_realtime add table public.sudoku_online_moves;
    end if;

    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'sudoku_online_events'
    ) then
      alter publication supabase_realtime add table public.sudoku_online_events;
    end if;
  end if;
end;
$$;
