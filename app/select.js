import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SectionList,
  SafeAreaView,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';

import puzzlesData from '../assets/puzzles.json';
import { loadCompletedPuzzles } from '../utils/progress';

// Colour for each difficulty label
const DIFFICULTY_COLORS = {
  easy:   '#2a9d8f',
  medium: '#e9c46a',
  hard:   '#e76f51',
  insane: '#9b2226',
};
const DIFFICULTY_ORDER = ['easy', 'medium', 'hard', 'insane'];
const PUZZLE_SECTIONS = DIFFICULTY_ORDER.map((difficulty) => ({
  title: difficulty.charAt(0).toUpperCase() + difficulty.slice(1),
  difficulty,
  data: puzzlesData
    .filter((puzzle) => puzzle.difficulty === difficulty)
    .sort((a, b) => {
      const aNumber = Number(a.id.replace(/\D/g, ''));
      const bNumber = Number(b.id.replace(/\D/g, ''));
      return aNumber - bNumber;
    }),
})).filter((section) => section.data.length > 0);

export default function SelectScreen() {
  const [completedIds, setCompletedIds] = useState([]);

  // Reload completed list every time this screen is focused
  useFocusEffect(
    useCallback(() => {
      async function fetch() {
        const ids = await loadCompletedPuzzles();
        setCompletedIds(ids);
      }
      fetch();
    }, [])
  );

  function handleSelectPuzzle(puzzle) {
    // Pass the puzzle ID in the URL so puzzle.js knows which to load.
    // This is like telling the next screen: "show puzzle_002".
    router.push(`/puzzle?id=${puzzle.id}`);
  }

  return (
    <SafeAreaView style={styles.safeArea}>

      <Text style={styles.heading}>Choose a Puzzle</Text>
      <Text style={styles.subheading}>
        {completedIds.length} of {puzzlesData.length} completed
      </Text>

      <SectionList
        sections={PUZZLE_SECTIONS}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <View
              style={[
                styles.sectionDot,
                { backgroundColor: DIFFICULTY_COLORS[section.difficulty] ?? '#aaa' },
              ]}
            />
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionCount}>{section.data.length}</Text>
          </View>
        )}
        renderItem={({ item }) => {
          const isCompleted = completedIds.includes(item.id);
          const puzzleNumber = Number(item.id.replace(/\D/g, ''));

          return (
            <TouchableOpacity
              style={[styles.card, isCompleted && styles.cardCompleted]}
              onPress={() => handleSelectPuzzle(item)}
              activeOpacity={0.75}
            >
              {/* Left: number circle */}
              <View style={[
                styles.numberCircle,
                isCompleted && styles.numberCircleCompleted,
              ]}>
                <Text style={[
                  styles.numberText,
                  isCompleted && styles.numberTextCompleted,
                ]}>
                  {isCompleted ? '✓' : puzzleNumber}
                </Text>
              </View>

              {/* Middle: title + difficulty */}
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <View style={styles.difficultyBadge}>
                  <View
                    style={[
                      styles.difficultyDot,
                      { backgroundColor: DIFFICULTY_COLORS[item.difficulty] ?? '#aaa' },
                    ]}
                  />
                  <Text style={styles.difficultyText}>
                    {item.difficulty.charAt(0).toUpperCase() + item.difficulty.slice(1)}
                  </Text>
                </View>
              </View>

              {/* Right: status */}
              <Text style={styles.cardArrow}>
                {isCompleted ? '🖼️' : '›'}
              </Text>
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  heading: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#1a1a2e',
    paddingHorizontal: 24,
    paddingTop: 24,
    marginBottom: 4,
  },
  subheading: {
    fontSize: 14,
    color: '#6c757d',
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 14,
    paddingBottom: 8,
    paddingHorizontal: 4,
  },
  sectionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1a1a2e',
  },
  sectionCount: {
    marginLeft: 'auto',
    fontSize: 13,
    fontWeight: '700',
    color: '#6c757d',
    backgroundColor: '#eef0fb',
    borderRadius: 10,
    overflow: 'hidden',
    paddingHorizontal: 9,
    paddingVertical: 3,
  },

  // Card
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cardCompleted: {
    borderColor: '#2a9d8f',
    backgroundColor: '#f0faf9',
  },

  // Left circle
  numberCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#eef0fb',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  numberCircleCompleted: {
    backgroundColor: '#2a9d8f',
  },
  numberText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4361ee',
  },
  numberTextCompleted: {
    color: '#ffffff',
  },

  // Middle info
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1a1a2e',
    marginBottom: 6,
  },
  difficultyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  difficultyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  difficultyText: {
    fontSize: 13,
    color: '#6c757d',
  },

  // Right arrow
  cardArrow: {
    fontSize: 22,
    color: '#adb5bd',
    marginLeft: 8,
  },
});
