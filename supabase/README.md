# Supabase setup

This app is offline-first. Regular puzzle play, board saves, local completions, ranked stats, settings, and the player profile all continue to use `AsyncStorage` first.

Supabase is optional at runtime. If these Expo public env vars are missing, sync events stay queued locally:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_SUPABASE_PROJECT_REF=your-project-ref

EXPO_PUBLIC_AIMBOTIC_SUPABASE_URL=https://uotzmpttpekpkcjxurjj.supabase.co
EXPO_PUBLIC_AIMBOTIC_SUPABASE_ANON_KEY=your-aimbotic-anon-key
EXPO_PUBLIC_AIMBOTIC_SUPABASE_PROJECT_REF=uotzmpttpekpkcjxurjj
```

Each connection requires a matching project ref pin. The sync queue prefers the Aimbotic connection when `EXPO_PUBLIC_AIMBOTIC_SUPABASE_*` is configured, then falls back to the default Supabase connection. The app refuses to configure any Supabase client if the URL points at a different project ref or at the blocked `Trusted Bums` project ref, `vaoqvtxqvbptyxddpoju`.

Apply `migrations/20260519000000_offline_first_players.sql` to create:

- `sudoku_players`
- `sudoku_puzzle_completions`
- `sudoku_ranked_profiles`
- `sudoku_race_rooms`
- `sudoku_race_room_players`

Apply `migrations/20260606000000_sudoku_online_gameplay.sql` to create:

- `sudoku_online_rooms`
- `sudoku_online_room_players`
- `sudoku_online_moves`
- `sudoku_online_events`

The current policies allow anonymous local-player sync so the game can start without accounts. Before shipping competitive online play, replace those permissive anon policies with Supabase Auth-backed policies so one player cannot overwrite another player's rows.
