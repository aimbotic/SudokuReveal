import { useCallback, useState } from 'react';
import {
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useFocusEffect } from 'expo-router';

import {
  BUILT_IN_BACKGROUNDS,
  chooseCustomBackground,
  clearCustomBackground,
  getBackgroundImageSource,
  isSelectedBackground,
  loadSelectedBackground,
  selectBuiltInBackground,
} from '../utils/background';
import { flushSyncQueue, getPendingSyncCount } from '../utils/offlineSync';
import { loadPlayerProfile, savePlayerProfile } from '../utils/player';
import { isSupabaseConfigured } from '../utils/supabase';

export default function SettingsScreen() {
  const [backgroundSelection, setBackgroundSelection] = useState(null);
  const [playerProfile, setPlayerProfile] = useState(null);
  const [displayNameDraft, setDisplayNameDraft] = useState('');
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const { width } = useWindowDimensions();
  const phoneWidth = Math.min(width, 440);
  const contentWidth = Math.min(phoneWidth - 24, 416);
  const isSmallPhone = phoneWidth <= 390;
  const tileGap = 12;
  const tileWidth = (contentWidth - tileGap) / 2;
  const hasBackground = getBackgroundImageSource(backgroundSelection) !== undefined;

  useFocusEffect(
    useCallback(() => {
      async function fetchSettings() {
        setBackgroundSelection(await loadSelectedBackground());
        const profile = await loadPlayerProfile();
        setPlayerProfile(profile);
        setDisplayNameDraft(profile.displayName);
        await refreshSyncStatus();
      }
      fetchSettings();
    }, [])
  );

  async function refreshSyncStatus() {
    if (isSupabaseConfigured()) {
      setIsSyncing(true);
      const result = await flushSyncQueue();
      setPendingSyncCount(result.pending);
      setIsSyncing(false);
      return;
    }

    setPendingSyncCount(await getPendingSyncCount());
  }

  async function handleSelectBuiltIn(backgroundId) {
    setBackgroundSelection(await selectBuiltInBackground(backgroundId));
  }

  async function handleChooseCustom() {
    const selection = await chooseCustomBackground();
    if (selection) {
      setBackgroundSelection(selection);
    }
  }

  async function handleClearBackground() {
    await clearCustomBackground();
    setBackgroundSelection(null);
  }

  async function handleSaveProfile() {
    const profile = await savePlayerProfile({ displayName: displayNameDraft });
    setPlayerProfile(profile);
    setDisplayNameDraft(profile.displayName);
    await refreshSyncStatus();
  }

  const syncStatusText = isSupabaseConfigured()
    ? isSyncing
      ? 'syncing...'
      : pendingSyncCount > 0
        ? `${pendingSyncCount} pending`
        : 'synced'
    : 'offline-only until Supabase env is set';

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={[styles.content, { width: contentWidth }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.sectionHeader}>
          <Text style={styles.heading}>Player</Text>
          <Text style={styles.subheading}>
            This profile is saved on this device first and syncs to Supabase when available.
          </Text>
        </View>

        <View style={styles.profileCard}>
          <Text style={styles.inputLabel}>Display Name</Text>
          <TextInput
            style={styles.textInput}
            value={displayNameDraft}
            onChangeText={setDisplayNameDraft}
            placeholder="Player"
            maxLength={24}
            autoCapitalize="words"
          />
          <Text style={styles.profileMeta} numberOfLines={1}>
            Local ID: {playerProfile?.id ?? 'Loading...'}
          </Text>
          <Text style={styles.profileMeta}>
            Sync: {syncStatusText}
          </Text>
          <TouchableOpacity
            style={styles.profileSaveButton}
            onPress={handleSaveProfile}
            activeOpacity={0.8}
          >
            <Text style={styles.profileSaveButtonText}>Save Player</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.heading}>Background</Text>
          <Text style={styles.subheading}>Choose a built-in image or use one from your device.</Text>
        </View>

        <View style={[styles.actionRow, isSmallPhone && styles.actionRowSmall]}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleChooseCustom}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>Pick Custom</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.secondaryButton,
              isSmallPhone && styles.secondaryButtonSmall,
              !hasBackground && styles.disabledButton,
            ]}
            onPress={handleClearBackground}
            disabled={!hasBackground}
            activeOpacity={0.8}
          >
            <Text style={[styles.secondaryButtonText, !hasBackground && styles.disabledButtonText]}>
              Clear
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.grid}>
          {BUILT_IN_BACKGROUNDS.map((background) => {
            const selected = isSelectedBackground(backgroundSelection, background.id);

            return (
              <TouchableOpacity
                key={background.id}
                style={[
                  styles.backgroundTile,
                  { width: tileWidth },
                  selected && styles.backgroundTileSelected,
                ]}
                onPress={() => handleSelectBuiltIn(background.id)}
                activeOpacity={0.82}
              >
                <Image source={background.source} style={styles.backgroundImage} resizeMode="cover" />
                <View style={styles.tileFooter}>
                  <Text style={styles.tileTitle} numberOfLines={1}>
                    {background.title}
                  </Text>
                  {selected && <Text style={styles.selectedText}>Selected</Text>}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    alignSelf: 'center',
    paddingTop: 24,
    paddingBottom: 40,
  },
  sectionHeader: {
    marginBottom: 18,
  },
  profileCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e7ebf3',
    marginBottom: 24,
  },
  inputLabel: {
    color: '#667085',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  textInput: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#dbe2ff',
    paddingHorizontal: 12,
    color: '#1a1a2e',
    fontSize: 16,
    fontWeight: '700',
    backgroundColor: '#ffffff',
    marginBottom: 10,
  },
  profileMeta: {
    color: '#667085',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  profileSaveButton: {
    backgroundColor: '#111827',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 8,
  },
  profileSaveButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
  },
  heading: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1a1a2e',
    marginBottom: 6,
  },
  subheading: {
    fontSize: 14,
    color: '#6c757d',
    lineHeight: 20,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 22,
  },
  actionRowSmall: {
    flexDirection: 'column',
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#4361ee',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryButton: {
    width: 100,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#dbe2ff',
  },
  secondaryButtonSmall: {
    width: '100%',
  },
  secondaryButtonText: {
    color: '#4361ee',
    fontSize: 15,
    fontWeight: '800',
  },
  disabledButton: {
    opacity: 0.55,
  },
  disabledButtonText: {
    color: '#8a94a6',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  backgroundTile: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: 'transparent',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  backgroundTileSelected: {
    borderColor: '#4361ee',
  },
  backgroundImage: {
    width: '100%',
    aspectRatio: 9 / 12,
  },
  tileFooter: {
    minHeight: 54,
    paddingHorizontal: 10,
    paddingVertical: 8,
    justifyContent: 'center',
  },
  tileTitle: {
    color: '#1a1a2e',
    fontSize: 13,
    fontWeight: '700',
  },
  selectedText: {
    color: '#4361ee',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 3,
  },
});
