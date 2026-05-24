import { useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';

import puzzlesData from '../assets/puzzles.json';
import { BOT_ROSTER } from '../utils/bots';

function getPuzzleForBot(bot) {
  return puzzlesData.find((puzzle) => puzzle.difficulty === bot.difficulty) ?? puzzlesData[0];
}

export default function BotScreen() {
  const { width, height } = useWindowDimensions();
  const [selectedBotId, setSelectedBotId] = useState(BOT_ROSTER[0].id);
  const selectedBot = BOT_ROSTER.find((bot) => bot.id === selectedBotId) ?? BOT_ROSTER[0];
  const selectedPuzzle = getPuzzleForBot(selectedBot);
  const contentWidth = Math.min(width - 24, 520);
  const isSmallPhone = width <= 390;
  const isTinyPhone = width <= 360;
  const isShortPhone = height <= 760;

  function startBattle() {
    router.push(`/puzzle?id=${selectedPuzzle.id}&mode=bot&bot=${selectedBot.id}`);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View
        style={[
          styles.container,
          isShortPhone && styles.containerShort,
          { width: contentWidth },
        ]}
      >
        <Text style={styles.kicker}>Turn-Based Offline Race</Text>
        <Text style={[styles.title, isSmallPhone && styles.titleSmall]}>Choose Your Bot</Text>
        <Text style={styles.subtitle}>
          Pick an opponent from the ladder. Every bot has a different pace, confidence level, and puzzle difficulty.
        </Text>

        <ScrollView
          style={styles.botList}
          contentContainerStyle={styles.botListContent}
          showsVerticalScrollIndicator={false}
        >
          {BOT_ROSTER.map((bot) => {
            const isActive = selectedBotId === bot.id;
            return (
              <TouchableOpacity
                key={bot.id}
                style={[
                  styles.botCard,
                  isSmallPhone && styles.botCardSmall,
                  { backgroundColor: bot.panel, borderColor: bot.accent },
                  isActive && styles.botCardActive,
                ]}
                onPress={() => setSelectedBotId(bot.id)}
                activeOpacity={0.82}
              >
                <View style={[styles.avatar, isSmallPhone && styles.avatarSmall, { backgroundColor: bot.accent }]}>
                  <Text style={styles.avatarText}>{bot.name.slice(0, 1)}</Text>
                </View>

                <View style={styles.botInfo}>
                  <View style={styles.botTopRow}>
                    <Text
                      style={[styles.botName, isTinyPhone && styles.botNameTiny, isActive && styles.botNameActive]}
                      numberOfLines={1}
                    >
                      {bot.name}
                    </Text>
                    <Text style={[styles.botRating, isActive && styles.botRatingActive]}>{bot.rating}</Text>
                  </View>

                  <View style={styles.botMetaRow}>
                    <Text style={[styles.botDifficulty, isActive && styles.botDifficultyActive]}>
                      {bot.label}
                    </Text>
                    <Text
                      style={[styles.botTagline, isTinyPhone && styles.botTaglineTiny, isActive && styles.botTaglineActive]}
                      numberOfLines={1}
                    >
                      {bot.tagline}
                    </Text>
                  </View>

                  <Text
                    style={[styles.botDescription, isShortPhone && styles.botDescriptionShort, isActive && styles.botDescriptionActive]}
                    numberOfLines={isShortPhone ? 2 : 3}
                  >
                    {bot.description}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={[styles.previewCard, isShortPhone && styles.previewCardShort]}>
          <Text style={styles.previewLabel}>Selected Opponent</Text>
          <Text style={styles.previewName}>{selectedBot.name}</Text>
          <Text style={styles.previewSubtitle}>
            {selectedBot.label} bot on a {selectedBot.difficulty} puzzle
          </Text>
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
    alignSelf: 'center',
    paddingTop: 34,
    paddingBottom: 24,
  },
  containerShort: {
    paddingTop: 18,
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
  titleSmall: {
    fontSize: 32,
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
  },
  botListContent: {
    gap: 10,
    paddingBottom: 10,
  },
  botCard: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 2,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  botCardSmall: {
    borderRadius: 14,
    padding: 13,
  },
  botCardActive: {
    backgroundColor: '#12182f',
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarSmall: {
    width: 46,
    height: 46,
    borderRadius: 23,
    marginRight: 12,
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '900',
  },
  botInfo: {
    flex: 1,
  },
  botTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  botName: {
    color: '#12182f',
    fontSize: 19,
    fontWeight: '900',
    flex: 1,
    marginRight: 8,
  },
  botNameTiny: {
    fontSize: 17,
  },
  botNameActive: {
    color: '#ffffff',
  },
  botRating: {
    color: '#12182f',
    fontSize: 16,
    fontWeight: '900',
  },
  botRatingActive: {
    color: '#ffd166',
  },
  botMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 7,
  },
  botDifficulty: {
    color: '#4361ee',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  botDifficultyActive: {
    color: '#8bd3ff',
  },
  botTagline: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    flex: 1,
  },
  botTaglineTiny: {
    fontSize: 11,
  },
  botTaglineActive: {
    color: '#ffd166',
  },
  botDescription: {
    color: '#667085',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  botDescriptionShort: {
    fontSize: 13,
    lineHeight: 18,
  },
  botDescriptionActive: {
    color: '#d8e2ff',
  },
  previewCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#e7ebf3',
    marginTop: 12,
    marginBottom: 12,
  },
  previewCardShort: {
    paddingVertical: 11,
    marginTop: 8,
    marginBottom: 9,
  },
  previewLabel: {
    color: '#667085',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  previewName: {
    color: '#12182f',
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 2,
  },
  previewSubtitle: {
    color: '#4361ee',
    fontSize: 14,
    fontWeight: '700',
  },
  primaryButton: {
    backgroundColor: '#4361ee',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
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
