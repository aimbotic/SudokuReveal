import { useState, useCallback, useRef } from 'react';
import {
  ImageBackground,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  SafeAreaView,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';

import { loadCompletedPuzzles } from '../utils/progress';
import {
  getBackgroundImageSource,
  loadSelectedBackground,
} from '../utils/background';
import puzzlesData from '../assets/puzzles.json';
import { getNextPlayablePuzzle, getLevelNumber } from '../utils/progression';

export default function HomeScreen() {
  const { width, height } = useWindowDimensions();
  const [completedIds, setCompletedIds] = useState([]);
  const [backgroundSelection, setBackgroundSelection] = useState(null);
  const [selectedMode, setSelectedMode] = useState(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionLabel, setTransitionLabel] = useState('');
  const totalCount = puzzlesData.length;
  const completedCount = completedIds.length;
  const backgroundSource = getBackgroundImageSource(backgroundSelection);
  const remainingCount = totalCount - completedCount;
  const progressPercent = totalCount > 0
    ? Math.round((completedCount / totalCount) * 100)
    : 0;
  const nextPuzzle = getNextPlayablePuzzle(completedIds);
  const nextLevelNumber = nextPuzzle ? getLevelNumber(nextPuzzle.id) : totalCount;
  const contentOpacity = useRef(new Animated.Value(1)).current;
  const contentShift = useRef(new Animated.Value(0)).current;
  const transitionOpacity = useRef(new Animated.Value(0)).current;
  const isCompactPhone = width <= 430;
  const isShortPhone = height <= 780;
  const contentWidth = Math.min(width - (isCompactPhone ? 24 : 40), 460);

  useFocusEffect(
    useCallback(() => {
      async function fetchProgress() {
        const completed = await loadCompletedPuzzles();
        const background = await loadSelectedBackground();
        setCompletedIds(completed);
        setBackgroundSelection(background);
      }
      fetchProgress();
    }, [])
  );

  function runModeTransition(label, onMidpoint) {
    if (isTransitioning) return;

    setIsTransitioning(true);
    setTransitionLabel(label);

    Animated.parallel([
      Animated.timing(contentOpacity, {
        toValue: 0,
        duration: 180,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(contentShift, {
        toValue: 18,
        duration: 180,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(transitionOpacity, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => {
      onMidpoint();

      Animated.parallel([
        Animated.timing(contentOpacity, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(contentShift, {
          toValue: 0,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(transitionOpacity, {
          toValue: 0,
          duration: 240,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(() => {
        setIsTransitioning(false);
        setTransitionLabel('');
      });
    });
  }

  return (
    <ImageBackground
      source={backgroundSource}
      style={styles.container}
      imageStyle={styles.backgroundImage}
      resizeMode="cover"
    >
      {backgroundSource && <View pointerEvents="none" style={styles.backgroundTint} />}
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            isShortPhone && styles.scrollContentCompact,
          ]}
          bounces={false}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={[
              styles.mainContent,
              {
                width: contentWidth,
                opacity: contentOpacity,
                transform: [{ translateY: contentShift }],
              },
            ]}
          >
            <View style={[styles.topSection, isShortPhone && styles.topSectionCompact]}>
              <Text style={[styles.title, isCompactPhone && styles.titleCompact]}>Sudoku Infinite</Text>
              <Text style={[styles.subtitle, isCompactPhone && styles.subtitleCompact]}>
                Solve. Score. Keep Going.
              </Text>
            </View>

            {selectedMode === null ? (
              <View style={styles.modeSection}>
                <TouchableOpacity
                  style={[styles.modeButton, isCompactPhone && styles.modeButtonCompact]}
                  onPress={() => runModeTransition('Offline Play', () => setSelectedMode('offline'))}
                  activeOpacity={0.82}
                  disabled={isTransitioning}
                >
                  <Text style={[styles.modeButtonTitle, isCompactPhone && styles.modeButtonTitleCompact]}>
                    Offline Play
                  </Text>
                  <Text style={[styles.modeButtonText, isCompactPhone && styles.modeButtonTextCompact]}>
                    Play puzzles, unlock backgrounds, and view your gallery.
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.modeButton,
                    styles.modeButtonOnline,
                    isCompactPhone && styles.modeButtonCompact,
                  ]}
                  onPress={() => runModeTransition('Online Play', () => router.push('/online'))}
                  activeOpacity={0.82}
                  disabled={isTransitioning}
                >
                  <Text
                    style={[
                      styles.modeButtonTitle,
                      styles.modeButtonTitleOnline,
                      isCompactPhone && styles.modeButtonTitleCompact,
                    ]}
                  >
                    Online Play
                  </Text>
                  <Text
                    style={[
                      styles.modeButtonText,
                      styles.modeButtonTextOnline,
                      isCompactPhone && styles.modeButtonTextCompact,
                    ]}
                  >
                    Race to finish the board first.
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.modeButton,
                    styles.modeButtonRanked,
                    isCompactPhone && styles.modeButtonCompact,
                  ]}
                  onPress={() => runModeTransition('Ranked Mode', () => router.push('/ranked'))}
                  activeOpacity={0.82}
                  disabled={isTransitioning}
                >
                  <Text
                    style={[
                      styles.modeButtonTitle,
                      styles.modeButtonTitleRanked,
                      isCompactPhone && styles.modeButtonTitleCompact,
                    ]}
                  >
                    Ranked Mode
                  </Text>
                  <Text
                    style={[
                      styles.modeButtonText,
                      styles.modeButtonTextRanked,
                      isCompactPhone && styles.modeButtonTextCompact,
                    ]}
                  >
                    Climb from Iron to Masters.
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={[styles.progressCard, isCompactPhone && styles.progressCardCompact]}>
                  <View style={[styles.progressHeader, isCompactPhone && styles.progressHeaderCompact]}>
                    <Text style={[styles.progressNumber, isCompactPhone && styles.progressNumberCompact]}>
                      {progressPercent}%
                    </Text>
                    <Text style={styles.progressLabel}>Complete</Text>
                  </View>
                  <View style={styles.nextLevelBadge}>
                    <Text style={styles.nextLevelBadgeText}>
                      {nextPuzzle ? `Next Level ${nextLevelNumber}` : 'All Levels Cleared'}
                    </Text>
                  </View>
                  <View style={styles.progressBarBackground}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${progressPercent}%`,
                        },
                      ]}
                    />
                  </View>
                  <View style={styles.statRow}>
                    <View style={styles.statItem}>
                      <Text style={[styles.statValue, isCompactPhone && styles.statValueCompact]}>
                        {completedCount}
                      </Text>
                      <Text style={styles.statLabel}>Solved</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                      <Text style={[styles.statValue, isCompactPhone && styles.statValueCompact]}>
                        {remainingCount}
                      </Text>
                      <Text style={styles.statLabel}>Left</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                      <Text style={[styles.statValue, isCompactPhone && styles.statValueCompact]}>
                        {totalCount}
                      </Text>
                      <Text style={styles.statLabel}>Total</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.bottomSection}>
                  <TouchableOpacity
                    style={[styles.startButton, isCompactPhone && styles.primaryButtonCompact]}
                    onPress={() => router.push('/select')}
                    activeOpacity={0.8}
                    disabled={isTransitioning}
                  >
                    <Text style={[styles.startButtonText, isCompactPhone && styles.primaryButtonTextCompact]}>
                      {nextPuzzle ? 'Continue Journey' : 'Replay Levels'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.botButton, isCompactPhone && styles.primaryButtonCompact]}
                    onPress={() => router.push('/bot')}
                    activeOpacity={0.8}
                    disabled={isTransitioning}
                  >
                    <Text style={[styles.botButtonText, isCompactPhone && styles.primaryButtonTextCompact]}>
                      Play Against Bot
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.settingsButton, isCompactPhone && styles.secondaryButtonCompact]}
                    onPress={() => router.push('/jukebox')}
                    activeOpacity={0.8}
                    disabled={isTransitioning}
                  >
                    <Text style={styles.settingsButtonText}>Jukebox</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.settingsButton, isCompactPhone && styles.secondaryButtonCompact]}
                    onPress={() => router.push('/settings')}
                    activeOpacity={0.8}
                    disabled={isTransitioning}
                  >
                    <Text style={styles.settingsButtonText}>Backgrounds</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.galleryButton, isCompactPhone && styles.secondaryButtonCompact]}
                    onPress={() => router.push('/gallery')}
                    activeOpacity={0.8}
                    disabled={isTransitioning}
                  >
                    <Text style={styles.galleryButtonText}>View Gallery</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.backModeButton}
                    onPress={() => runModeTransition('Mode Select', () => setSelectedMode(null))}
                    activeOpacity={0.75}
                    disabled={isTransitioning}
                  >
                    <Text style={styles.backModeButtonText}>Choose Mode</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.resetButton}
                    onPress={async () => {
                      const { resetAllProgress } = await import('../utils/progress');
                      await resetAllProgress();
                      setCompletedIds([]);
                    }}
                    disabled={isTransitioning}
                  >
                    <Text style={styles.resetButtonText}>Reset Progress (test)</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </Animated.View>
        </ScrollView>
      </SafeAreaView>

      <Animated.View
        pointerEvents={isTransitioning ? 'auto' : 'none'}
        style={[
          styles.transitionScreen,
          {
            opacity: transitionOpacity,
          },
        ]}
      >
        <Text style={styles.transitionKicker}>Loading Mode</Text>
        <Text style={styles.transitionTitle}>{transitionLabel}</Text>
      </Animated.View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f6fb',
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingTop: 22,
    paddingBottom: 24,
  },
  scrollContentCompact: {
    justifyContent: 'flex-start',
    paddingTop: 14,
  },
  backgroundImage: {
    opacity: 1,
  },
  backgroundTint: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(244,246,251,0.76)',
  },
  mainContent: {
    alignSelf: 'center',
  },
  topSection: { alignItems: 'center', marginBottom: 24 },
  topSectionCompact: { marginBottom: 20 },
  title: { fontSize: 38, fontWeight: '900', color: '#12182f', marginBottom: 6, textAlign: 'center' },
  titleCompact: { fontSize: 34 },
  subtitle: { fontSize: 15, color: '#667085', fontWeight: '600', textAlign: 'center' },
  subtitleCompact: { fontSize: 14 },
  modeSection: {
    justifyContent: 'center',
    gap: 16,
  },
  modeButton: {
    width: '100%',
    minHeight: 142,
    borderRadius: 20,
    backgroundColor: '#4361ee',
    padding: 22,
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#4361ee',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  modeButtonCompact: {
    minHeight: 128,
    padding: 20,
  },
  modeButtonOnline: {
    backgroundColor: '#06d6a0',
    shadowColor: '#06d6a0',
    shadowOpacity: 0.28,
  },
  modeButtonRanked: {
    backgroundColor: '#111827',
    shadowColor: '#111827',
    shadowOpacity: 0.22,
  },
  modeButtonTitle: {
    color: '#ffffff',
    fontSize: 26,
    fontWeight: '900',
    marginBottom: 8,
  },
  modeButtonTitleCompact: {
    fontSize: 24,
  },
  modeButtonTitleOnline: {
    color: '#061b16',
  },
  modeButtonTitleRanked: {
    color: '#ffd166',
  },
  modeButtonText: {
    color: '#e8ecff',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 21,
  },
  modeButtonTextCompact: {
    fontSize: 14,
    lineHeight: 20,
  },
  modeButtonTextOnline: {
    color: '#063b31',
  },
  modeButtonTextRanked: {
    color: '#d8e2ff',
  },
  progressCard: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(67,97,238,0.12)',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  progressCardCompact: {
    padding: 20,
  },
  progressHeader: {
    alignItems: 'center',
    marginBottom: 22,
  },
  progressHeaderCompact: {
    marginBottom: 18,
  },
  progressNumber: {
    fontSize: 56,
    fontWeight: '900',
    color: '#2a9d8f',
    lineHeight: 60,
  },
  progressNumberCompact: {
    fontSize: 48,
    lineHeight: 52,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#667085',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  nextLevelBadge: {
    marginBottom: 18,
    backgroundColor: '#eef4ff',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  nextLevelBadgeText: {
    color: '#4361ee',
    fontSize: 12,
    fontWeight: '800',
  },
  progressBarBackground: {
    width: '100%',
    height: 10,
    backgroundColor: '#e7ebf3',
    borderRadius: 5,
    marginBottom: 22,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#4361ee',
    borderRadius: 6,
  },
  statRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f7f9fd',
    borderRadius: 14,
    paddingVertical: 16,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: '900', color: '#12182f' },
  statValueCompact: { fontSize: 22 },
  statLabel: { marginTop: 2, fontSize: 12, fontWeight: '700', color: '#667085' },
  statDivider: {
    width: 1,
    height: 34,
    backgroundColor: '#e0e6f0',
  },
  bottomSection: { alignItems: 'center', gap: 12 },
  galleryButton: {
    backgroundColor: '#ffffff',
    paddingVertical: 16,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    borderWidth: 2,
    borderColor: '#e9ecef',
  },
  secondaryButtonCompact: {
    paddingVertical: 15,
    borderRadius: 15,
  },
  settingsButton: {
    backgroundColor: '#ffffff',
    paddingVertical: 16,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e9ecef',
  },
  settingsButtonText: {
    color: '#4361ee',
    fontSize: 17,
    fontWeight: '700',
  },
  galleryButtonText: {
    color: '#1a1a2e',
    fontSize: 17,
    fontWeight: '600',
  },
  startButton: {
    backgroundColor: '#4361ee',
    paddingVertical: 18,
    paddingHorizontal: 60,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#4361ee',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  primaryButtonCompact: {
    paddingVertical: 17,
    borderRadius: 15,
  },
  startButtonText: { color: '#ffffff', fontSize: 18, fontWeight: 'bold', letterSpacing: 0.5 },
  primaryButtonTextCompact: { fontSize: 17 },
  botButton: {
    backgroundColor: '#1a1a2e',
    paddingVertical: 18,
    paddingHorizontal: 60,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#1a1a2e',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 7,
  },
  botButtonText: {
    color: '#ffd166',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  backModeButton: {
    paddingVertical: 12,
  },
  backModeButtonText: {
    color: '#4361ee',
    fontSize: 15,
    fontWeight: '800',
  },
  resetButton: { paddingVertical: 10 },
  resetButtonText: { fontSize: 13, color: '#adb5bd' },
  transitionScreen: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(12,18,33,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  transitionKicker: {
    color: '#8bd3ff',
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1.6,
    marginBottom: 10,
  },
  transitionTitle: {
    color: '#ffffff',
    fontSize: 34,
    fontWeight: '900',
    textAlign: 'center',
  },
});
