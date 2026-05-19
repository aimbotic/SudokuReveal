import AsyncStorage from '@react-native-async-storage/async-storage';

import { enqueueSyncEvent, flushSyncQueue } from './offlineSync';

const PLAYER_KEY = 'local_player_profile';

const DEFAULT_PLAYER = {
  id: null,
  displayName: 'Player',
};

function createLocalId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

export async function loadPlayerProfile() {
  try {
    const json = await AsyncStorage.getItem(PLAYER_KEY);
    if (json) {
      const profile = { ...DEFAULT_PLAYER, ...JSON.parse(json) };
      if (profile.id) return profile;
    }

    const profile = { ...DEFAULT_PLAYER, id: createLocalId() };
    await AsyncStorage.setItem(PLAYER_KEY, JSON.stringify(profile));
    await enqueueSyncEvent('player_profile_upsert', profile);
    return profile;
  } catch (error) {
    console.error('Failed to load player profile:', error);
    return { ...DEFAULT_PLAYER, id: createLocalId() };
  }
}

export async function savePlayerProfile(updates) {
  const current = await loadPlayerProfile();
  const nextProfile = {
    ...current,
    ...updates,
    displayName: (updates.displayName ?? current.displayName ?? 'Player').trim() || 'Player',
  };

  await AsyncStorage.setItem(PLAYER_KEY, JSON.stringify(nextProfile));
  await enqueueSyncEvent('player_profile_upsert', nextProfile);
  flushSyncQueue();
  return nextProfile;
}
