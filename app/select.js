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

      <View style={styles.header}>
        <Text style={styles.heading}>Puzzles</Text>
        <Text style={styles.subheading}>
          {completedIds.length}/{puzzlesData.length} completed
        </Text>
      </View>

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
    backgroundColor: '#f4f6fb',
  },
  header: {
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 12,
  },
  heading: {
    fontSize: 32,
    fontWeight: '900',
    color: '#12182f',
    marginBottom: 2,
  },
  subheading: {
    fontSize: 14,
    color: '#667085',
    fontWeight: '600',
  },
  list: {
    paddingHorizontal: 14,
    paddingBottom: 28,
    gap: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 18,
    paddingBottom: 8,
    paddingHorizontal: 8,
  },
  sectionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#12182f',
  },
  sectionCount: {
    marginLeft: 'auto',
    fontSize: 13,
    fontWeight: '700',
    color: '#6c757d',
    backgroundColor: '#e9eefb',
    borderRadius: 10,
    overflow: 'hidden',
    paddingHorizontal: 9,
    paddingVertical: 3,
  },

  // Card
  card: {
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#e7ebf3',
  },
  cardCompleted: {
    borderColor: '#9edbd2',
    backgroundColor: '#f0faf9',
  },

  // Left circle
  numberCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#edf2ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  numberCircleCompleted: {
    backgroundColor: '#2a9d8f',
  },
  numberText: {
    fontSize: 16,
    fontWeight: '900',
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
    fontSize: 16,
    fontWeight: '800',
    color: '#12182f',
    marginBottom: 5,
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
    fontSize: 16,
    fontWeight: '800',
    color: '#adb5bd',
    marginLeft: 8,
  },
});
