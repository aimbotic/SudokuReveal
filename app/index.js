import { useState, useCallback } from 'react';
import { ImageBackground, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router, useFocusEffect } from 'expo-router';

import { loadCompletedPuzzles } from '../utils/progress';
import {
  getBackgroundImageSource,
  loadSelectedBackground,
} from '../utils/background';
import puzzlesData from '../assets/puzzles.json';

export default function HomeScreen() {
  const [completedIds, setCompletedIds] = useState([]);
  const [backgroundSelection, setBackgroundSelection] = useState(null);
  const [selectedMode, setSelectedMode] = useState(null);
  const totalCount = puzzlesData.length;
  const completedCount = completedIds.length;
  const backgroundSource = getBackgroundImageSource(backgroundSelection);
  const remainingCount = totalCount - completedCount;
  const progressPercent = totalCount > 0
    ? Math.round((completedCount / totalCount) * 100)
    : 0;

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

  return (
    <ImageBackground
      source={backgroundSource}
      style={styles.container}
      imageStyle={styles.backgroundImage}
      resizeMode="cover"
    >
      {backgroundSource && <View pointerEvents="none" style={styles.backgroundTint} />}
      <View style={styles.topSection}>
        <Text style={styles.title}>Sudoku Infinite</Text>
        <Text style={styles.subtitle}>Solve. Score. Keep Going.</Text>
      </View>

      {selectedMode === null ? (
        <View style={styles.modeSection}>
          <TouchableOpacity
            style={styles.modeButton}
            onPress={() => setSelectedMode('offline')}
            activeOpacity={0.82}
          >
            <Text style={styles.modeButtonTitle}>Offline Play</Text>
            <Text style={styles.modeButtonText}>Play puzzles, unlock backgrounds, and view your gallery.</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeButton, styles.modeButtonOnline]}
            onPress={() => router.push('/online')}
            activeOpacity={0.82}
          >
            <Text style={[styles.modeButtonTitle, styles.modeButtonTitleOnline]}>Online Play</Text>
            <Text style={[styles.modeButtonText, styles.modeButtonTextOnline]}>Race to finish the board first.</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressNumber}>{progressPercent}%</Text>
              <Text style={styles.progressLabel}>Complete</Text>
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
                <Text style={styles.statValue}>{completedCount}</Text>
                <Text style={styles.statLabel}>Solved</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{remainingCount}</Text>
                <Text style={styles.statLabel}>Left</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{totalCount}</Text>
                <Text style={styles.statLabel}>Total</Text>
              </View>
            </View>
          </View>

          <View style={styles.bottomSection}>
            <TouchableOpacity
              style={styles.startButton}
              onPress={() => router.push('/select')}
              activeOpacity={0.8}
            >
              <Text style={styles.startButtonText}>
                {completedCount === 0 ? 'Start Puzzle' : 'Continue Puzzles'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.botButton}
              onPress={() => router.push('/bot')}
              activeOpacity={0.8}
            >
              <Text style={styles.botButtonText}>Play Against Bot</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.settingsButton}
              onPress={() => router.push('/settings')}
              activeOpacity={0.8}
            >
              <Text style={styles.settingsButtonText}>Backgrounds</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.galleryButton}
              onPress={() => router.push('/gallery')}
              activeOpacity={0.8}
            >
              <Text style={styles.galleryButtonText}>View Gallery</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backModeButton}
              onPress={() => setSelectedMode(null)}
              activeOpacity={0.75}
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
            >
              <Text style={styles.resetButtonText}>Reset Progress (test)</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f6fb',
    paddingHorizontal: 22,
    paddingTop: 56,
    paddingBottom: 34,
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
  topSection: { alignItems: 'center', marginBottom: 26 },
  title: { fontSize: 38, fontWeight: '900', color: '#12182f', marginBottom: 6 },
  subtitle: { fontSize: 15, color: '#667085', fontWeight: '600' },
  modeSection: {
    flex: 1,
    justifyContent: 'center',
    gap: 16,
  },
  modeButton: {
    width: '100%',
    minHeight: 142,
    borderRadius: 18,
    backgroundColor: '#4361ee',
    padding: 22,
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#4361ee',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modeButtonOnline: {
    backgroundColor: '#06d6a0',
    shadowColor: '#06d6a0',
    shadowOpacity: 0.28,
  },
  modeButtonTitle: {
    color: '#ffffff',
    fontSize: 26,
    fontWeight: '900',
    marginBottom: 8,
  },
  modeButtonTitleOnline: {
    color: '#061b16',
  },
  modeButtonText: {
    color: '#e8ecff',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 21,
  },
  modeButtonTextOnline: {
    color: '#063b31',
  },
  progressCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 18,
    padding: 24,
    marginBottom: 26,
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
  progressHeader: {
    alignItems: 'center',
    marginBottom: 22,
  },
  progressNumber: {
    fontSize: 56,
    fontWeight: '900',
    color: '#2a9d8f',
    lineHeight: 60,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#667085',
    textTransform: 'uppercase',
    letterSpacing: 1,
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
  startButtonText: { color: '#ffffff', fontSize: 18, fontWeight: 'bold', letterSpacing: 0.5 },
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
});
