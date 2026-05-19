import AsyncStorage from '@react-native-async-storage/async-storage';

import { getSupabaseClient, isSupabaseConfigured } from './supabase';

const OUTBOX_KEY = 'supabase_sync_outbox';
const MAX_ATTEMPTS = 5;

async function loadOutbox() {
  try {
    const json = await AsyncStorage.getItem(OUTBOX_KEY);
    return json ? JSON.parse(json) : [];
  } catch (error) {
    console.error('Failed to load sync queue:', error);
    return [];
  }
}

async function saveOutbox(events) {
  await AsyncStorage.setItem(OUTBOX_KEY, JSON.stringify(events));
}

function createEventId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export async function enqueueSyncEvent(type, payload) {
  const event = {
    id: createEventId(),
    type,
    payload,
    attempts: 0,
    createdAt: new Date().toISOString(),
  };
  const events = await loadOutbox();
  await saveOutbox([...events, event]);
  return event;
}

async function syncEvent(supabase, event) {
  const timestamp = new Date().toISOString();

  if (event.type === 'player_profile_upsert') {
    const { id, displayName } = event.payload;
    return supabase.from('players').upsert({
      id,
      display_name: displayName,
      updated_at: timestamp,
      last_seen_at: timestamp,
    });
  }

  if (event.type === 'puzzle_completed') {
    const { playerId, puzzleId, seconds = null, score = null } = event.payload;
    return supabase.from('puzzle_completions').upsert(
      {
        player_id: playerId,
        puzzle_id: puzzleId,
        seconds,
        score,
        completed_at: timestamp,
      },
      { onConflict: 'player_id,puzzle_id' }
    );
  }

  if (event.type === 'ranked_profile_updated') {
    const { playerId, profile } = event.payload;
    return supabase.from('ranked_profiles').upsert({
      player_id: playerId,
      rating: profile.rating,
      wins: profile.wins,
      losses: profile.losses,
      matches: profile.matches,
      updated_at: timestamp,
    });
  }

  return { error: null };
}

export async function flushSyncQueue() {
  if (!isSupabaseConfigured()) {
    return { synced: 0, pending: (await loadOutbox()).length };
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return { synced: 0, pending: (await loadOutbox()).length };
  }

  const events = await loadOutbox();
  const pending = [];
  let synced = 0;

  for (const event of events) {
    try {
      const { error } = await syncEvent(supabase, event);
      if (error) throw error;
      synced += 1;
    } catch (error) {
      const attempts = (event.attempts ?? 0) + 1;
      if (attempts < MAX_ATTEMPTS) {
        pending.push({ ...event, attempts });
      } else {
        console.error('Dropping sync event after repeated failures:', event.type, error);
      }
    }
  }

  await saveOutbox(pending);
  return { synced, pending: pending.length };
}

export async function getPendingSyncCount() {
  return (await loadOutbox()).length;
}
