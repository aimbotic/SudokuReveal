import { useCallback, useMemo, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';

import puzzlesData from '../assets/puzzles.json';
import {
  RANKS,
  getNextRankForRating,
  getRankForRating,
  getRankProgress,
  getRankedDifficulty,
  loadRankedProfile,
} from '../utils/ranked';

function getRankedPuzzle(difficulty) {
  const options = puzzlesData.filter((puzzle) => puzzle.difficulty === difficulty);
  return options[Math.floor(Math.random() * options.length)] ?? puzzlesData[0];
}

export default function RankedScreen() {
  const { width, height } = useWindowDimensions();
  const [profile, setProfile] = useState(null);
  const isSmallPhone = width <= 390;
  const contentWidth = Math.min(width - 24, 500);
  const isShortPhone = height <= 760;

  useFocusEffect(
    useCallback(() => {
      async function fetchProfile() {
        setProfile(await loadRankedProfile());
      }
      fetchProfile();
    }, [])
  );

  const currentRank = profile ? getRankForRating(profile.rating) : RANKS[0];
  const nextRank = profile ? getNextRankForRating(profile.rating) : RANKS[1];
  const progress = profile ? getRankProgress(profile.rating) : 0;
  const rankedDifficulty = profile ? getRankedDifficulty(profile.rating) : 'easy';
  const selectedPuzzle = useMemo(() => getRankedPuzzle(rankedDifficulty), [rankedDifficulty, profile?.matches]);
  const winRate = profile && profile.matches > 0
    ? Math.round((profile.wins / profile.matches) * 100)
    : 0;

  function startRankedMatch() {
    router.push(`/puzzle?id=${selectedPuzzle.id}&mode=ranked&room=${currentRank.name.toUpperCase()}`);
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingWrap}>
          <Text style={styles.loadingText}>Loading ranked ladder...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          isShortPhone && styles.contentShort,
          { width: contentWidth },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.kicker}>Ranked Mode</Text>
          <Text style={[styles.title, isSmallPhone && styles.titleSmall]}>Sudoku Ladder</Text>
          <Text style={styles.subtitle}>Win ranked boards to climb from Iron to Masters.</Text>
        </View>

        <View style={[styles.rankCard, { borderColor: currentRank.color }]}>
          <View style={styles.rankTopRow}>
            <View>
              <Text style={styles.rankLabel}>Current Rank</Text>
              <Text style={[styles.rankName, { color: currentRank.color }]}>{currentRank.name}</Text>
            </View>
            <Text style={styles.ratingText}>{profile.rating} RP</Text>
          </View>

          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.round(progress * 100)}%`,
                  backgroundColor: currentRank.color,
                },
              ]}
            />
          </View>
          <Text style={styles.nextRankText}>
            {nextRank ? `${nextRank.minRating - profile.rating} RP to ${nextRank.name}` : 'Top rank reached'}
          </Text>
        </View>

        <View style={styles.statRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{profile.wins}</Text>
            <Text style={styles.statLabel}>Wins</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{profile.losses}</Text>
            <Text style={styles.statLabel}>Losses</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{winRate}%</Text>
            <Text style={styles.statLabel}>Win Rate</Text>
          </View>
        </View>

        <View style={styles.matchCard}>
          <Text style={styles.matchLabel}>Next Match</Text>
          <Text style={styles.matchTitle}>{selectedPuzzle.title}</Text>
          <Text style={styles.matchMeta}>{rankedDifficulty.toUpperCase()} difficulty</Text>
        </View>

        <View style={styles.ladder}>
          {RANKS.map((rank) => {
            const isCurrent = rank.name === currentRank.name;
            return (
              <View key={rank.name} style={[styles.rankRow, isCurrent && styles.rankRowActive]}>
                <View style={[styles.rankDot, { backgroundColor: rank.color }]} />
                <Text style={[styles.rankRowName, isCurrent && styles.rankRowNameActive]}>
                  {rank.name}
                </Text>
                <Text style={styles.rankRowPoints}>{rank.minRating} RP</Text>
              </View>
            );
          })}
        </View>

        <TouchableOpacity style={styles.primaryButton} onPress={startRankedMatch} activeOpacity={0.82}>
          <Text style={styles.primaryButtonText}>Start Ranked Match</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={() => router.replace('/')} activeOpacity={0.75}>
          <Text style={styles.secondaryButtonText}>Back Home</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f4f6fb',
  },
  scroll: {
    flex: 1,
  },
  content: {
    alignSelf: 'center',
    paddingTop: 22,
    paddingBottom: 28,
  },
  contentShort: {
    paddingTop: 14,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#667085',
    fontSize: 15,
    fontWeight: '700',
  },
  header: {
    marginBottom: 16,
  },
  kicker: {
    color: '#4361ee',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginBottom: 7,
  },
  title: {
    color: '#12182f',
    fontSize: 36,
    fontWeight: '900',
    marginBottom: 7,
  },
  titleSmall: {
    fontSize: 32,
  },
  subtitle: {
    color: '#667085',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 21,
  },
  rankCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 18,
    borderWidth: 2,
    marginBottom: 12,
  },
  rankTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },
  rankLabel: {
    color: '#667085',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  rankName: {
    fontSize: 34,
    fontWeight: '900',
  },
  ratingText: {
    color: '#12182f',
    fontSize: 18,
    fontWeight: '900',
  },
  progressTrack: {
    height: 12,
    borderRadius: 999,
    backgroundColor: '#e7ebf3',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  nextRankText: {
    marginTop: 9,
    color: '#667085',
    fontSize: 13,
    fontWeight: '700',
  },
  statRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e7ebf3',
  },
  statValue: {
    color: '#12182f',
    fontSize: 22,
    fontWeight: '900',
  },
  statLabel: {
    color: '#667085',
    fontSize: 12,
    fontWeight: '800',
  },
  matchCard: {
    backgroundColor: '#111827',
    borderRadius: 18,
    padding: 17,
    marginBottom: 12,
  },
  matchLabel: {
    color: '#8bd3ff',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  matchTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '900',
    marginTop: 6,
  },
  matchMeta: {
    color: '#c8d0f5',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 4,
  },
  ladder: {
    gap: 7,
    marginBottom: 14,
  },
  rankRow: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingVertical: 11,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e7ebf3',
  },
  rankRowActive: {
    borderColor: '#4361ee',
    borderWidth: 2,
  },
  rankDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  rankRowName: {
    flex: 1,
    color: '#12182f',
    fontSize: 15,
    fontWeight: '800',
  },
  rankRowNameActive: {
    color: '#4361ee',
    fontWeight: '900',
  },
  rankRowPoints: {
    color: '#667085',
    fontSize: 13,
    fontWeight: '800',
  },
  primaryButton: {
    backgroundColor: '#4361ee',
    borderRadius: 16,
    paddingVertical: 17,
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '900',
  },
  secondaryButton: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e7ebf3',
  },
  secondaryButtonText: {
    color: '#4361ee',
    fontSize: 15,
    fontWeight: '800',
  },
});
