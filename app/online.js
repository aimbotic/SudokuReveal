import { useMemo, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { router } from 'expo-router';

import puzzlesData from '../assets/puzzles.json';

const DIFFICULTIES = ['easy', 'medium', 'hard', 'insane'];

function getPuzzleForDifficulty(difficulty) {
  return puzzlesData.find((puzzle) => puzzle.difficulty === difficulty) ?? puzzlesData[0];
}

function createRoomCode(difficulty) {
  const prefix = difficulty.slice(0, 2).toUpperCase();
  const number = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${number}`;
}

export default function OnlineScreen() {
  const [difficulty, setDifficulty] = useState('medium');
  const [roomCode, setRoomCode] = useState(() => createRoomCode('medium'));
  const selectedPuzzle = useMemo(() => getPuzzleForDifficulty(difficulty), [difficulty]);

  function handleDifficultyPress(nextDifficulty) {
    setDifficulty(nextDifficulty);
    setRoomCode(createRoomCode(nextDifficulty));
  }

  function startRace() {
    router.push(`/puzzle?id=${selectedPuzzle.id}&mode=race&room=${roomCode}`);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.kicker}>Race Room</Text>
          <Text style={styles.title}>Online Play</Text>
          <Text style={styles.subtitle}>First player to solve the board wins.</Text>
        </View>

        <View style={styles.roomCard}>
          <Text style={styles.roomLabel}>Room Code</Text>
          <Text style={styles.roomCode}>{roomCode}</Text>
          <Text style={styles.roomMeta}>{selectedPuzzle.title}</Text>
        </View>

        <View style={styles.segmentRow}>
          {DIFFICULTIES.map((level) => {
            const isActive = level === difficulty;
            return (
              <TouchableOpacity
                key={level}
                style={[styles.segmentButton, isActive && styles.segmentButtonActive]}
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

        <View style={styles.antiCaptureCard}>
          <Text style={styles.antiCaptureTitle}>Anti-Capture Race Shield</Text>
          <Text style={styles.antiCaptureText}>
            Race boards hide when the window loses focus, and race mode shows a protected-room overlay.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={startRace}
          activeOpacity={0.82}
        >
          <Text style={styles.primaryButtonText}>Start Race</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.replace('/')}
          activeOpacity={0.75}
        >
          <Text style={styles.secondaryButtonText}>Back Home</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#050816',
  },
  container: {
    flex: 1,
    paddingHorizontal: 22,
    paddingTop: 42,
    paddingBottom: 30,
  },
  header: {
    marginBottom: 24,
  },
  kicker: {
    color: '#06d6a0',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1.4,
    marginBottom: 8,
  },
  title: {
    color: '#ffffff',
    fontSize: 38,
    fontWeight: '900',
    marginBottom: 8,
  },
  subtitle: {
    color: '#c8d0f5',
    fontSize: 16,
    fontWeight: '700',
  },
  roomCard: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(6,214,160,0.34)',
    marginBottom: 16,
  },
  roomLabel: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  roomCode: {
    color: '#ffffff',
    fontSize: 42,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    marginVertical: 8,
  },
  roomMeta: {
    color: '#06d6a0',
    fontSize: 15,
    fontWeight: '800',
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  segmentButton: {
    flex: 1,
    backgroundColor: '#111827',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1f2937',
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
  antiCaptureCard: {
    flex: 1,
    backgroundColor: '#0b1020',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1f2937',
    justifyContent: 'center',
    marginBottom: 18,
  },
  antiCaptureTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 10,
  },
  antiCaptureText: {
    color: '#aab4cf',
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
  },
  primaryButton: {
    width: '100%',
    backgroundColor: '#06d6a0',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#061b16',
    fontSize: 18,
    fontWeight: '900',
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
});
