create table if not exists public.sudoku_players (
  id uuid primary key,
  display_name text not null default 'Player',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create table if not exists public.sudoku_puzzle_completions (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.sudoku_players(id) on delete cascade,
  puzzle_id text not null,
  seconds integer,
  score integer,
  completed_at timestamptz not null default now(),
  unique (player_id, puzzle_id)
);

create table if not exists public.sudoku_ranked_profiles (
  player_id uuid primary key references public.sudoku_players(id) on delete cascade,
  rating integer not null default 0,
  wins integer not null default 0,
  losses integer not null default 0,
  matches integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.sudoku_race_rooms (
  id uuid primary key default gen_random_uuid(),
  room_code text not null unique,
  puzzle_id text not null,
  difficulty text not null,
  status text not null default 'waiting',
  created_by uuid references public.sudoku_players(id) on delete set null,
  winner_id uuid references public.sudoku_players(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sudoku_race_room_players (
  room_id uuid not null references public.sudoku_race_rooms(id) on delete cascade,
  player_id uuid not null references public.sudoku_players(id) on delete cascade,
  progress integer not null default 0,
  finished_at timestamptz,
  joined_at timestamptz not null default now(),
  primary key (room_id, player_id)
);

alter table public.sudoku_players enable row level security;
alter table public.sudoku_puzzle_completions enable row level security;
alter table public.sudoku_ranked_profiles enable row level security;
alter table public.sudoku_race_rooms enable row level security;
alter table public.sudoku_race_room_players enable row level security;

drop policy if exists "anon can create and update local players" on public.sudoku_players;
create policy "anon can create and update local players"
  on public.sudoku_players
  for all
  to anon
  using (true)
  with check (true);

drop policy if exists "anon can sync puzzle completions" on public.sudoku_puzzle_completions;
create policy "anon can sync puzzle completions"
  on public.sudoku_puzzle_completions
  for all
  to anon
  using (true)
  with check (true);

drop policy if exists "anon can sync ranked profiles" on public.sudoku_ranked_profiles;
create policy "anon can sync ranked profiles"
  on public.sudoku_ranked_profiles
  for all
  to anon
  using (true)
  with check (true);

drop policy if exists "anon can use race rooms" on public.sudoku_race_rooms;
create policy "anon can use race rooms"
  on public.sudoku_race_rooms
  for all
  to anon
  using (true)
  with check (true);

drop policy if exists "anon can use race room players" on public.sudoku_race_room_players;
create policy "anon can use race room players"
  on public.sudoku_race_room_players
  for all
  to anon
  using (true)
  with check (true);
