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
  const totalCount = puzzlesData.length;
  const completedCount = completedIds.length;
  const backgroundSource = getBackgroundImageSource(backgroundSelection);

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
        <Text style={styles.title}>SudokuReveal</Text>
        <Text style={styles.subtitle}>Solve puzzles. Reveal images.</Text>
      </View>

      <View style={styles.progressCard}>
        <View style={styles.progressBarBackground}>
          <View
            style={[
              styles.progressBarFill,
              {
                width: totalCount > 0
                  ? `${(completedCount / totalCount) * 100}%`
                  : '0%',
              },
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          {completedCount} of {totalCount} puzzles completed
        </Text>
        <View style={styles.emojiRow}>
          {puzzlesData.map((puzzle) => (
            <Text key={puzzle.id} style={styles.puzzleEmoji}>
              {completedIds.includes(puzzle.id) ? 'Done' : 'Open'}
            </Text>
          ))}
        </View>
      </View>

      <View style={styles.bottomSection}>
        <TouchableOpacity
          style={styles.galleryButton}
          onPress={() => router.push('/gallery')}
          activeOpacity={0.8}
        >
          <Text style={styles.galleryButtonText}>View Gallery</Text>
        </TouchableOpacity>

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
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
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
    backgroundColor: 'rgba(248,249,250,0.72)',
  },
  topSection: { alignItems: 'center', marginBottom: 32 },
  title: { fontSize: 36, fontWeight: 'bold', color: '#1a1a2e', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#6c757d' },
  progressCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 28,
    marginBottom: 32,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  progressBarBackground: {
    width: '100%',
    height: 12,
    backgroundColor: '#e9ecef',
    borderRadius: 6,
    marginBottom: 16,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#4361ee',
    borderRadius: 6,
  },
  progressText: { fontSize: 16, color: '#1a1a2e', fontWeight: '600', marginBottom: 20 },
  emojiRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  puzzleEmoji: {
    fontSize: 11,
    color: '#6c757d',
    backgroundColor: '#eef0fb',
    borderRadius: 8,
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 4,
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
  resetButton: { paddingVertical: 10 },
  resetButtonText: { fontSize: 13, color: '#adb5bd' },
});
