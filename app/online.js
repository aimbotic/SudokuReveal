import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
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

const DIFFICULTIES = ['easy', 'medium', 'hard', 'insane'];
const OPPONENT_NAMES = ['Nova', 'Cipher', 'Atlas', 'Echo', 'Violet', 'Dash', 'Rune', 'Orbit'];
const MATCHMAKING_TIPS = [
  'Scan rows and columns before guessing.',
  'Use notes early so hard boards stay readable.',
  'In ranked, clean accuracy matters more than rushing.',
  'Finish boxes first when a row feels stuck.',
  'Friend races do not change your rank.',
];

function getPuzzleForDifficulty(difficulty) {
  return puzzlesData.find((puzzle) => puzzle.difficulty === difficulty) ?? puzzlesData[0];
}

function createRoomCode(difficulty) {
  const prefix = difficulty.slice(0, 2).toUpperCase();
  const number = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${number}`;
}

function createRankedRoom(rankName) {
  const number = Math.floor(1000 + Math.random() * 9000);
  return `${rankName.slice(0, 3).toUpperCase()}-${number}`;
}

function getRandomOpponent() {
  return OPPONENT_NAMES[Math.floor(Math.random() * OPPONENT_NAMES.length)];
}

export default function OnlineScreen() {
  const { width, height } = useWindowDimensions();
  const [difficulty, setDifficulty] = useState('medium');
  const [roomCode, setRoomCode] = useState(() => createRoomCode('medium'));
  const [profile, setProfile] = useState(null);
  const [opponentName, setOpponentName] = useState(() => getRandomOpponent());
  const [matchmaking, setMatchmaking] = useState(null);
  const [tipIndex, setTipIndex] = useState(0);
  const contentWidth = Math.min(width - (width <= 360 ? 18 : 24), 520);
  const isSmallPhone = width <= 390;
  const isTinyPhone = width <= 360;
  const isShortPhone = height <= 760;

  useFocusEffect(
    useCallback(() => {
      async function fetchRank() {
        setProfile(await loadRankedProfile());
        setOpponentName(getRandomOpponent());
      }
      fetchRank();
    }, [])
  );

  const selectedFriendPuzzle = useMemo(
    () => getPuzzleForDifficulty(difficulty),
    [difficulty]
  );
  const currentRank = profile ? getRankForRating(profile.rating) : RANKS[0];
  const nextRank = profile ? getNextRankForRating(profile.rating) : RANKS[1];
  const rankProgress = profile ? getRankProgress(profile.rating) : 0;
  const rankedDifficulty = profile ? getRankedDifficulty(profile.rating) : 'easy';
  const rankedPuzzle = useMemo(
    () => getPuzzleForDifficulty(rankedDifficulty),
    [rankedDifficulty, profile?.matches]
  );
  const winRate = profile && profile.matches > 0
    ? Math.round((profile.wins / profile.matches) * 100)
    : 0;

  useEffect(() => {
    if (!matchmaking) return undefined;

    const tipTimer = setInterval(() => {
      setTipIndex((current) => (current + 1) % MATCHMAKING_TIPS.length);
    }, 3000);
    const routeTimer = setTimeout(() => {
      router.push(matchmaking.href);
      setMatchmaking(null);
    }, matchmaking.duration);

    return () => {
      clearInterval(tipTimer);
      clearTimeout(routeTimer);
    };
  }, [matchmaking]);

  function handleDifficultyPress(nextDifficulty) {
    setDifficulty(nextDifficulty);
    setRoomCode(createRoomCode(nextDifficulty));
  }

  function startFriendRace() {
    setTipIndex(0);
    setMatchmaking({
      type: 'friend',
      title: 'Opening Friend Room',
      subtitle: 'Share the code and get ready to race.',
      status: roomCode,
      duration: 1700,
      href: `/puzzle?id=${selectedFriendPuzzle.id}&mode=race&room=${roomCode}`,
    });
  }

  function startRankedRace() {
    const rankedRoom = createRankedRoom(currentRank.name);
    setTipIndex(0);
    setMatchmaking({
      type: 'ranked',
      title: 'Looking For Player',
      subtitle: `Searching ${currentRank.name} ranked queue...`,
      status: `Matched with ${opponentName}`,
      duration: 2300,
      href: `/puzzle?id=${rankedPuzzle.id}&mode=ranked&room=${rankedRoom}&opponent=${opponentName}`,
    });
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.container,
          isShortPhone && styles.containerShort,
          { width: contentWidth },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.header, isShortPhone && styles.headerShort]}>
          <Text style={styles.kicker}>Online Play</Text>
          <Text style={[styles.title, isSmallPhone && styles.titleSmall]}>Multiplayer</Text>
          <Text style={[styles.subtitle, isTinyPhone && styles.subtitleTiny]}>
            Play friends for fun, or queue ranked to climb the ladder.
          </Text>
        </View>

        <View style={[styles.modeCard, isSmallPhone && styles.cardCompact]}>
          <View style={styles.modeHeader}>
            <View>
              <Text style={styles.cardKicker}>Friends</Text>
              <Text style={[styles.cardTitle, isSmallPhone && styles.cardTitleSmall]}>Private Room</Text>
            </View>
            <Text style={styles.noRpBadge}>No RP</Text>
          </View>

          <Text style={[styles.cardText, isTinyPhone && styles.cardTextTiny]}>
            Share this room code with a friend. Winner gets bragging rights, but ranks do not change.
          </Text>

          <View style={styles.roomCodeBox}>
            <Text style={styles.roomLabel}>Room Code</Text>
            <Text style={[styles.roomCode, isSmallPhone && styles.roomCodeSmall]}>{roomCode}</Text>
            <Text style={styles.roomMeta}>{selectedFriendPuzzle.title}</Text>
          </View>

          <View style={[styles.segmentRow, isSmallPhone && styles.segmentRowSmall]}>
            {DIFFICULTIES.map((level) => {
              const isActive = level === difficulty;
              return (
                <TouchableOpacity
                  key={level}
                  style={[
                    styles.segmentButton,
                    isSmallPhone && styles.segmentButtonSmall,
                    isActive && styles.segmentButtonActive,
                  ]}
                  onPress={() => handleDifficultyPress(level)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.segmentText, isActive && styles.segmentTextActive]}>
                    {level}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity style={styles.friendButton} onPress={startFriendRace} activeOpacity={0.82}>
            <Text style={styles.friendButtonText}>Create Friend Race</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.rankCard, isSmallPhone && styles.cardCompact, { borderColor: currentRank.color }]}>
          <View style={styles.modeHeader}>
            <View>
              <Text style={styles.cardKicker}>Ranked</Text>
              <Text style={[styles.cardTitle, styles.rankCardTitle, isSmallPhone && styles.cardTitleSmall]}>
                Random Opponent
              </Text>
            </View>
            <Text style={[styles.rankBadge, { color: currentRank.color }]}>
              {currentRank.name}
            </Text>
          </View>

          <Text style={[styles.cardText, styles.rankCardText, isTinyPhone && styles.cardTextTiny]}>
            Queue into a ranked race. Beat the other player to gain RP and move toward the next rank.
          </Text>

          <View style={styles.rankPanel}>
            <View style={styles.rankTopRow}>
              <Text style={[styles.rankName, isSmallPhone && styles.rankNameSmall, { color: currentRank.color }]}>
                {currentRank.name}
              </Text>
              <Text style={styles.ratingText}>{profile?.rating ?? 0} RP</Text>
            </View>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.round(rankProgress * 100)}%`,
                    backgroundColor: currentRank.color,
                  },
                ]}
              />
            </View>
            <Text style={styles.nextRankText}>
              {nextRank ? `${nextRank.minRating - (profile?.rating ?? 0)} RP to ${nextRank.name}` : 'Top rank reached'}
            </Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statPill}>
              <Text style={styles.statValue}>{profile?.wins ?? 0}</Text>
              <Text style={styles.statLabel}>Wins</Text>
            </View>
            <View style={styles.statPill}>
              <Text style={styles.statValue}>{profile?.losses ?? 0}</Text>
              <Text style={styles.statLabel}>Losses</Text>
            </View>
            <View style={styles.statPill}>
              <Text style={styles.statValue}>{winRate}%</Text>
              <Text style={styles.statLabel}>Rate</Text>
            </View>
          </View>

          <View style={styles.matchInfo}>
            <Text style={styles.matchLabel}>Next ranked match</Text>
            <Text style={styles.matchText}>
              {rankedPuzzle.title} vs {opponentName}
            </Text>
            <Text style={styles.matchMeta}>{rankedDifficulty.toUpperCase()} difficulty</Text>
          </View>

          <TouchableOpacity style={styles.rankedButton} onPress={startRankedRace} activeOpacity={0.82}>
            <Text style={styles.rankedButtonText}>Find Ranked Opponent</Text>
          </TouchableOpacity>
        </View>

          <View style={[styles.shieldCard, isTinyPhone && styles.shieldCardTiny]}>
          <Text style={styles.shieldTitle}>Race Shield</Text>
          <Text style={styles.shieldText}>
            Online boards hide when the window loses focus. Ranked rewards only happen in ranked races.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.replace('/')}
          activeOpacity={0.75}
        >
          <Text style={styles.secondaryButtonText}>Back Home</Text>
        </TouchableOpacity>
      </ScrollView>

      {matchmaking && (
        <View style={styles.matchmakingOverlay} pointerEvents="auto">
          <View style={styles.matchmakingCard}>
            <Text style={styles.matchmakingKicker}>
              {matchmaking.type === 'ranked' ? 'Ranked Queue' : 'Friend Race'}
            </Text>
            <Text style={styles.matchmakingTitle}>{matchmaking.title}</Text>
            <Text style={styles.matchmakingSubtitle}>{matchmaking.subtitle}</Text>

            <View style={styles.searchPulse}>
              <View style={styles.searchDot} />
              <View style={[styles.searchDot, styles.searchDotDim]} />
              <View style={[styles.searchDot, styles.searchDotFaint]} />
            </View>

            <Text style={styles.matchmakingStatus}>{matchmaking.status}</Text>
            <View style={styles.tipBox}>
              <Text style={styles.tipLabel}>Tip</Text>
              <Text style={styles.tipText}>{MATCHMAKING_TIPS[tipIndex]}</Text>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#050816',
  },
  scroll: {
    flex: 1,
  },
  container: {
    alignSelf: 'center',
    paddingTop: 32,
    paddingBottom: 30,
  },
  containerShort: {
    paddingTop: 18,
  },
  header: {
    marginBottom: 18,
  },
  headerShort: {
    marginBottom: 12,
  },
  kicker: {
    color: '#06d6a0',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  title: {
    color: '#ffffff',
    fontSize: 38,
    fontWeight: '900',
    marginBottom: 8,
  },
  titleSmall: {
    fontSize: 33,
  },
  subtitle: {
    color: '#c8d0f5',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
  },
  subtitleTiny: {
    fontSize: 14,
    lineHeight: 20,
  },
  modeCard: {
    backgroundColor: '#111827',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(6,214,160,0.34)',
    marginBottom: 14,
  },
  cardCompact: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  rankCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 18,
    borderWidth: 2,
    marginBottom: 14,
  },
  modeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 10,
  },
  cardKicker: {
    color: '#06d6a0',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  cardTitle: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '900',
    marginTop: 3,
  },
  cardTitleSmall: {
    fontSize: 21,
  },
  rankCardTitle: {
    color: '#12182f',
  },
  noRpBadge: {
    color: '#061b16',
    backgroundColor: '#06d6a0',
    borderRadius: 999,
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 5,
    fontSize: 12,
    fontWeight: '900',
  },
  rankBadge: {
    fontSize: 14,
    fontWeight: '900',
  },
  cardText: {
    color: '#c8d0f5',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    marginBottom: 14,
  },
  cardTextTiny: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  rankCardText: {
    color: '#667085',
  },
  roomCodeBox: {
    backgroundColor: '#0b1020',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
  },
  roomLabel: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  roomCode: {
    color: '#ffffff',
    fontSize: 38,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    marginVertical: 6,
  },
  roomCodeSmall: {
    fontSize: 32,
  },
  roomMeta: {
    color: '#06d6a0',
    fontSize: 14,
    fontWeight: '800',
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  segmentRowSmall: {
    flexWrap: 'wrap',
  },
  segmentButton: {
    flex: 1,
    backgroundColor: '#0b1020',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  segmentButtonSmall: {
    minWidth: '48%',
  },
  segmentButtonActive: {
    backgroundColor: '#06d6a0',
    borderColor: '#06d6a0',
  },
  segmentText: {
    color: '#c8d0f5',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  segmentTextActive: {
    color: '#061b16',
  },
  friendButton: {
    backgroundColor: '#06d6a0',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  friendButtonText: {
    color: '#061b16',
    fontSize: 16,
    fontWeight: '900',
  },
  rankPanel: {
    backgroundColor: '#f7f9fd',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  rankTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  rankName: {
    fontSize: 28,
    fontWeight: '900',
  },
  rankNameSmall: {
    fontSize: 23,
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
    marginTop: 8,
    color: '#667085',
    fontSize: 13,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  statPill: {
    flex: 1,
    backgroundColor: '#f7f9fd',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  statValue: {
    color: '#12182f',
    fontSize: 20,
    fontWeight: '900',
  },
  statLabel: {
    color: '#667085',
    fontSize: 12,
    fontWeight: '800',
  },
  matchInfo: {
    backgroundColor: '#111827',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  matchLabel: {
    color: '#8bd3ff',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  matchText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
    marginTop: 5,
  },
  matchMeta: {
    color: '#c8d0f5',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 3,
  },
  rankedButton: {
    backgroundColor: '#4361ee',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  rankedButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
  },
  shieldCard: {
    backgroundColor: '#0b1020',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1f2937',
    marginBottom: 14,
  },
  shieldCardTiny: {
    padding: 13,
    marginBottom: 10,
  },
  shieldTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 6,
  },
  shieldText: {
    color: '#aab4cf',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  secondaryButton: {
    width: '100%',
    backgroundColor: '#111827',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#c8d0f5',
    fontSize: 16,
    fontWeight: '800',
  },
  matchmakingOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: '#050816',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 22,
  },
  matchmakingCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#111827',
    borderRadius: 22,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(6,214,160,0.36)',
  },
  matchmakingKicker: {
    color: '#06d6a0',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  matchmakingTitle: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: '900',
  },
  matchmakingSubtitle: {
    color: '#c8d0f5',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 8,
    lineHeight: 22,
  },
  searchPulse: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 24,
    marginBottom: 18,
  },
  searchDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#06d6a0',
  },
  searchDotDim: {
    opacity: 0.58,
  },
  searchDotFaint: {
    opacity: 0.25,
  },
  matchmakingStatus: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 16,
  },
  tipBox: {
    backgroundColor: '#0b1020',
    borderRadius: 16,
    padding: 15,
  },
  tipLabel: {
    color: '#8bd3ff',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  tipText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 21,
  },
});
