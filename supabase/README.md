# Supabase setup

This app is offline-first. Regular puzzle play, board saves, local completions, ranked stats, settings, and the player profile all continue to use `AsyncStorage` first.

Supabase is optional at runtime. If these Expo public env vars are missing, sync events stay queued locally:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Apply `migrations/20260519000000_offline_first_players.sql` to create:

- `players`
- `puzzle_completions`
- `ranked_profiles`
- `race_rooms`
- `race_room_players`

The current policies allow anonymous local-player sync so the game can start without accounts. Before shipping competitive online play, replace those permissive anon policies with Supabase Auth-backed policies so one player cannot overwrite another player's rows.
