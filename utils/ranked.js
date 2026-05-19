import AsyncStorage from '@react-native-async-storage/async-storage';

import { enqueueSyncEvent, flushSyncQueue } from './offlineSync';
import { loadPlayerProfile } from './player';

const RANKED_KEY = 'ranked_profile';

export const RANKS = [
  { name: 'Iron', minRating: 0, color: '#737373' },
  { name: 'Bronze', minRating: 120, color: '#b45309' },
  { name: 'Silver', minRating: 280, color: '#64748b' },
  { name: 'Gold', minRating: 480, color: '#d97706' },
  { name: 'Platinum', minRating: 740, color: '#0891b2' },
  { name: 'Diamond', minRating: 1060, color: '#2563eb' },
  { name: 'Masters', minRating: 1460, color: '#7c3aed' },
];

const DEFAULT_PROFILE = {
  rating: 0,
  wins: 0,
  losses: 0,
  matches: 0,
};

export function getRankForRating(rating) {
  return [...RANKS]
    .reverse()
    .find((rank) => rating >= rank.minRating) ?? RANKS[0];
}

export function getNextRankForRating(rating) {
  return RANKS.find((rank) => rank.minRating > rating) ?? null;
}

export function getRankProgress(rating) {
  const currentRank = getRankForRating(rating);
  const nextRank = getNextRankForRating(rating);

  if (!nextRank) {
    return 1;
  }

  const span = nextRank.minRating - currentRank.minRating;
  return Math.max(0, Math.min(1, (rating - currentRank.minRating) / span));
}

export function getRankedDifficulty(rating) {
  const rankName = getRankForRating(rating).name;
  if (rankName === 'Iron' || rankName === 'Bronze') return 'easy';
  if (rankName === 'Silver' || rankName === 'Gold') return 'medium';
  if (rankName === 'Platinum' || rankName === 'Diamond') return 'hard';
  return 'insane';
}

export async function loadRankedProfile() {
  try {
    const json = await AsyncStorage.getItem(RANKED_KEY);
    if (!json) return DEFAULT_PROFILE;
    return { ...DEFAULT_PROFILE, ...JSON.parse(json) };
  } catch (error) {
    console.error('Failed to load ranked profile:', error);
    return DEFAULT_PROFILE;
  }
}

async function saveRankedProfile(profile) {
  await AsyncStorage.setItem(RANKED_KEY, JSON.stringify(profile));
  const player = await loadPlayerProfile();
  await enqueueSyncEvent('ranked_profile_updated', {
    playerId: player.id,
    profile,
  });
  flushSyncQueue();
  return profile;
}

export async function recordRankedWin() {
  const profile = await loadRankedProfile();
  const nextProfile = {
    rating: profile.rating + 75,
    wins: profile.wins + 1,
    losses: profile.losses,
    matches: profile.matches + 1,
  };
  return saveRankedProfile(nextProfile);
}

export async function recordRankedLoss() {
  const profile = await loadRankedProfile();
  const nextProfile = {
    rating: Math.max(0, profile.rating - 35),
    wins: profile.wins,
    losses: profile.losses + 1,
    matches: profile.matches + 1,
  };
  return saveRankedProfile(nextProfile);
}
