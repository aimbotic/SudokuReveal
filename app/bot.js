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

const BOT_LEVELS = [
  {
    id: 'easy',
    name: 'Easy Bot',
    label: 'Very Bad',
    description: 'Skips lots of turns and moves slowly.',
  },
  {
    id: 'medium',
    name: 'Medium Bot',
    label: 'Decent',
    description: 'Sometimes misses a turn, but can keep pressure on you.',
  },
  {
    id: 'hard',
    name: 'Hard Bot',
    label: 'Strong',
    description: 'Rarely skips and solves at a steady pace.',
  },
  {
    id: 'insane',
    name: 'Insane Bot',
    label: 'Very Good',
    description: 'Takes a correct square almost every turn.',
  },
];

function getPuzzleForBot(botId) {
  return puzzlesData.find((puzzle) => puzzle.difficulty === botId) ?? puzzlesData[0];
}

export default function BotScreen() {
  const [selectedBot, setSelectedBot] = useState('easy');
  const selectedPuzzle = useMemo(() => getPuzzleForBot(selectedBot), [selectedBot]);

  function startBattle() {
    router.push(`/puzzle?id=${selectedPuzzle.id}&mode=bot&bot=${selectedBot}`);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.kicker}>Turn-Based Offline Race</Text>
        <Text style={styles.title}>Bot Battle</Text>
        <Text style={styles.subtitle}>
          Take a turn, then the bot gets a turn. Mistakes are unlimited.
        </Text>

        <View style={styles.botList}>
          {BOT_LEVELS.map((bot) => {
            const isActive = selectedBot === bot.id;
            return (
              <TouchableOpacity
                key={bot.id}
                style={[styles.botCard, isActive && styles.botCardActive]}
                onPress={() => setSelectedBot(bot.id)}
                activeOpacity={0.78}
              >
                <View style={styles.botHeader}>
                  <Text style={[styles.botName, isActive && styles.botNameActive]}>
                    {bot.name}
                  </Text>
                  <Text style={[styles.botLabel, isActive && styles.botLabelActive]}>
                    {bot.label}
                  </Text>
                </View>
                <Text style={[styles.botDescription, isActive && styles.botDescriptionActive]}>
                  {bot.description}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity style={styles.primaryButton} onPress={startBattle} activeOpacity={0.82}>
          <Text style={styles.primaryButtonText}>Start Bot Battle</Text>
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
    backgroundColor: '#f4f6fb',
  },
  container: {
    flex: 1,
    paddingHorizontal: 22,
    paddingTop: 38,
    paddingBottom: 30,
  },
  kicker: {
    color: '#4361ee',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1.3,
    marginBottom: 8,
  },
  title: {
    color: '#12182f',
    fontSize: 38,
    fontWeight: '900',
    marginBottom: 8,
  },
  subtitle: {
    color: '#667085',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
    marginBottom: 18,
  },
  botList: {
    flex: 1,
    gap: 10,
  },
  botCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 2,
    borderColor: '#e7ebf3',
  },
  botCardActive: {
    backgroundColor: '#1a1a2e',
    borderColor: '#ffd166',
  },
  botHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 7,
  },
  botName: {
    color: '#12182f',
    fontSize: 18,
    fontWeight: '900',
  },
  botNameActive: {
    color: '#ffffff',
  },
  botLabel: {
    color: '#4361ee',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  botLabelActive: {
    color: '#ffd166',
  },
  botDescription: {
    color: '#667085',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  botDescriptionActive: {
    color: '#c8d0f5',
  },
  primaryButton: {
    backgroundColor: '#4361ee',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
  },
  secondaryButton: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e7ebf3',
  },
  secondaryButtonText: {
    color: '#4361ee',
    fontSize: 16,
    fontWeight: '800',
  },
});
