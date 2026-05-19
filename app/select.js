import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SectionList,
  SafeAreaView,
  useWindowDimensions,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';

import puzzlesData from '../assets/puzzles.json';
import { loadCompletedPuzzles } from '../utils/progress';
import {
  getLevelNumber,
  getNextPlayablePuzzle,
  isPuzzleUnlocked,
  ORDERED_PUZZLES,
} from '../utils/progression';

const DIFFICULTY_COLORS = {
  easy: '#2a9d8f',
  medium: '#e9c46a',
  hard: '#e76f51',
  insane: '#9b2226',
};

const DIFFICULTY_ORDER = ['easy', 'medium', 'hard', 'insane'];
const PUZZLE_SECTIONS = DIFFICULTY_ORDER.map((difficulty) => ({
  title: difficulty.charAt(0).toUpperCase() + difficulty.slice(1),
  difficulty,
  data: ORDERED_PUZZLES.filter((puzzle) => puzzle.difficulty === difficulty),
})).filter((section) => section.data.length > 0);

export default function SelectScreen() {
  const { width } = useWindowDimensions();
  const [completedIds, setCompletedIds] = useState([]);
  const contentWidth = Math.min(width - 24, 520);

  useFocusEffect(
    useCallback(() => {
      async function fetch() {
        setCompletedIds(await loadCompletedPuzzles());
      }
      fetch();
    }, [])
  );

  const nextPuzzle = getNextPlayablePuzzle(completedIds);

  function handleSelectPuzzle(puzzle) {
    if (!isPuzzleUnlocked(puzzle.id, completedIds)) return;
    router.push(`/puzzle?id=${puzzle.id}`);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={[styles.header, { width: contentWidth }]}>
        <Text style={styles.heading}>Level Path</Text>
        <Text style={styles.subheading}>
          {completedIds.length}/{puzzlesData.length} completed
        </Text>
        <Text style={styles.progressHint}>
          Clear one level to unlock the next.
        </Text>
        {nextPuzzle && (
          <View style={styles.nextLevelPill}>
            <Text style={styles.nextLevelPillText}>
              Current level: {getLevelNumber(nextPuzzle.id)}
            </Text>
          </View>
        )}
      </View>

      <SectionList
        style={[styles.sectionList, { width: contentWidth }]}
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
          const isUnlocked = isPuzzleUnlocked(item.id, completedIds);
          const isCurrent = nextPuzzle?.id === item.id;
          const levelNumber = getLevelNumber(item.id);

          return (
            <TouchableOpacity
              style={[
                styles.card,
                isCompleted && styles.cardCompleted,
                isCurrent && styles.cardCurrent,
                !isUnlocked && styles.cardLocked,
              ]}
              onPress={() => handleSelectPuzzle(item)}
              activeOpacity={isUnlocked ? 0.75 : 1}
              disabled={!isUnlocked}
            >
              <View
                style={[
                  styles.numberCircle,
                  isCompleted && styles.numberCircleCompleted,
                  isCurrent && styles.numberCircleCurrent,
                  !isUnlocked && styles.numberCircleLocked,
                ]}
              >
                <Text
                  style={[
                    styles.numberText,
                    isCompleted && styles.numberTextCompleted,
                    isCurrent && styles.numberTextCompleted,
                    !isUnlocked && styles.numberTextLocked,
                  ]}
                >
                  {isCompleted ? 'OK' : isUnlocked ? levelNumber : 'LOCK'}
                </Text>
              </View>

              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.levelMeta}>Level {levelNumber}</Text>
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
                  <Text style={styles.statusText}>
                    {isCompleted ? 'Cleared' : isCurrent ? 'Ready' : isUnlocked ? 'Open' : 'Locked'}
                  </Text>
                </View>
              </View>

              <Text style={[styles.cardArrow, !isUnlocked && styles.cardArrowLocked]}>
                {isCompleted ? 'Done' : isUnlocked ? 'Play' : 'Locked'}
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
    alignSelf: 'center',
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
  progressHint: {
    marginTop: 8,
    fontSize: 13,
    color: '#667085',
  },
  nextLevelPill: {
    alignSelf: 'flex-start',
    marginTop: 12,
    backgroundColor: '#eef4ff',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  nextLevelPillText: {
    color: '#4361ee',
    fontSize: 12,
    fontWeight: '800',
  },
  list: {
    paddingBottom: 28,
    gap: 8,
  },
  sectionList: {
    alignSelf: 'center',
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
  cardCurrent: {
    borderColor: '#4361ee',
    borderWidth: 2,
  },
  cardLocked: {
    backgroundColor: '#f3f4f7',
    borderColor: '#e5e7eb',
  },
  numberCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#edf2ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  numberCircleCompleted: {
    backgroundColor: '#2a9d8f',
  },
  numberCircleCurrent: {
    backgroundColor: '#4361ee',
  },
  numberCircleLocked: {
    backgroundColor: '#e5e7eb',
  },
  numberText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#4361ee',
  },
  numberTextCompleted: {
    color: '#ffffff',
  },
  numberTextLocked: {
    color: '#98a2b3',
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#12182f',
    marginBottom: 2,
  },
  levelMeta: {
    fontSize: 12,
    color: '#667085',
    marginBottom: 6,
    fontWeight: '700',
  },
  difficultyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
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
  statusText: {
    fontSize: 12,
    color: '#4361ee',
    fontWeight: '800',
    marginLeft: 8,
  },
  cardArrow: {
    fontSize: 13,
    fontWeight: '800',
    color: '#4361ee',
    marginLeft: 8,
  },
  cardArrowLocked: {
    color: '#98a2b3',
  },
});
