import { useEffect, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';

import {
  JUKEBOX_TRACKS,
  getJukeboxState,
  pauseJukebox,
  playJukeboxTrack,
  stopJukebox,
  subscribeToJukebox,
} from '../utils/jukebox';

export default function JukeboxScreen() {
  const { width, height } = useWindowDimensions();
  const [playerState, setPlayerState] = useState(getJukeboxState());
  const contentWidth = Math.min(width - 24, 500);
  const isSmallPhone = width <= 390;
  const isShortPhone = height <= 760;

  useEffect(() => subscribeToJukebox(setPlayerState), []);

  async function handleTrackPress(trackId) {
    if (playerState.currentTrackId === trackId && playerState.isPlaying) {
      await pauseJukebox();
      return;
    }

    await playJukeboxTrack(trackId);
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
        <Text style={[styles.title, isSmallPhone && styles.titleSmall]}>Jukebox</Text>
        <Text style={styles.subtitle}>Built-in calm tracks for long puzzle sessions.</Text>

        <View style={styles.statusCard}>
          <Text style={styles.statusLabel}>Now Playing</Text>
          <Text style={styles.statusValue}>
            {playerState.currentTrackId
              ? JUKEBOX_TRACKS.find((track) => track.id === playerState.currentTrackId)?.title
              : 'Nothing yet'}
          </Text>
          <Text style={styles.statusHint}>
            {playerState.isLoading
              ? 'Loading track...'
              : playerState.isPlaying
                ? 'Looping softly in the background'
                : 'Paused and ready'}
          </Text>
        </View>

        <View style={styles.trackList}>
          {JUKEBOX_TRACKS.map((track) => {
            const isActive = playerState.currentTrackId === track.id;
            const isPlaying = isActive && playerState.isPlaying;

            return (
              <TouchableOpacity
                key={track.id}
                style={[
                  styles.trackCard,
                  isActive && styles.trackCardActive,
                  { borderColor: track.color },
                ]}
                onPress={() => handleTrackPress(track.id)}
                activeOpacity={0.82}
              >
                <View style={[styles.trackAccent, { backgroundColor: track.color }]} />
                <View style={styles.trackInfo}>
                  <Text style={styles.trackTitle}>{track.title}</Text>
                  <Text style={styles.trackSubtitle}>{track.subtitle}</Text>
                </View>
                <Text style={[styles.trackAction, isPlaying && styles.trackActionPlaying]}>
                  {isPlaying ? 'Pause' : isActive ? 'Resume' : 'Play'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={[styles.stopButton, !playerState.currentTrackId && styles.stopButtonDisabled]}
          onPress={stopJukebox}
          disabled={!playerState.currentTrackId}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.stopButtonText,
              !playerState.currentTrackId && styles.stopButtonTextDisabled,
            ]}
          >
            Stop Music
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f4f6fb',
  },
  scroll: {
    flex: 1,
  },
  container: {
    alignSelf: 'center',
    paddingTop: 20,
    paddingBottom: 28,
  },
  containerShort: {
    paddingTop: 14,
  },
  title: {
    fontSize: 30,
    fontWeight: '900',
    color: '#12182f',
  },
  titleSmall: {
    fontSize: 28,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    color: '#667085',
    fontWeight: '600',
    marginBottom: 18,
  },
  statusCard: {
    backgroundColor: '#12182f',
    borderRadius: 20,
    padding: 18,
    marginBottom: 18,
  },
  statusLabel: {
    color: '#8bd3ff',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  statusValue: {
    marginTop: 8,
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '900',
  },
  statusHint: {
    marginTop: 6,
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '600',
  },
  trackList: {
    gap: 12,
  },
  trackCard: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  trackCardActive: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
  },
  trackAccent: {
    width: 12,
    height: 52,
    borderRadius: 10,
  },
  trackInfo: {
    flex: 1,
  },
  trackTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#12182f',
  },
  trackSubtitle: {
    marginTop: 3,
    fontSize: 13,
    color: '#667085',
  },
  trackAction: {
    fontSize: 14,
    fontWeight: '800',
    color: '#4361ee',
  },
  trackActionPlaying: {
    color: '#2a9d8f',
  },
  stopButton: {
    marginTop: 18,
    backgroundColor: '#111827',
    borderRadius: 18,
    paddingVertical: 17,
    alignItems: 'center',
  },
  stopButtonDisabled: {
    backgroundColor: '#d7dce5',
  },
  stopButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  stopButtonTextDisabled: {
    color: '#7b8798',
  },
});
