import { useCallback, useState } from 'react';
import {
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
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

export default function SettingsScreen() {
  const [backgroundSelection, setBackgroundSelection] = useState(null);
  const { width } = useWindowDimensions();
  const tileGap = 12;
  const tileWidth = (width - 48 - tileGap) / 2;
  const hasBackground = getBackgroundImageSource(backgroundSelection) !== undefined;

  useFocusEffect(
    useCallback(() => {
      async function fetchBackground() {
        setBackgroundSelection(await loadSelectedBackground());
      }
      fetchBackground();
    }, [])
  );

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

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.sectionHeader}>
          <Text style={styles.heading}>Background</Text>
          <Text style={styles.subheading}>Choose a built-in image or use one from your device.</Text>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleChooseCustom}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>Pick Custom</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryButton, !hasBackground && styles.disabledButton]}
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
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
  },
  sectionHeader: {
    marginBottom: 18,
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
