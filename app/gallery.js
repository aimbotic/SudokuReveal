import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  Modal,
  SafeAreaView,
  useWindowDimensions,
} from 'react-native';
import { useFocusEffect } from 'expo-router';

import puzzlesData from '../assets/puzzles.json';
import { loadCompletedPuzzles } from '../utils/progress';
import { getRewardImageSource } from '../utils/rewards';

// ─── Image map ───────────────────────────────────────────────────
// React Native cannot build require() paths dynamically at runtime.
// Every image must be listed here explicitly.
// Add a new line here whenever you add a new reward image.
const REWARD_IMAGES = {};

// ─── Build gallery item list ──────────────────────────────────────
function buildGalleryItems() {
  const items = [];
  for (const puzzle of puzzlesData) {
    const existing = items.find((item) => item.reward === puzzle.reward);
    if (existing) {
      existing.unlockedByIds.push(puzzle.id);
    } else {
      items.push({
        reward: puzzle.reward,
        unlockedByIds: [puzzle.id],
        title: puzzle.title,
      });
    }
  }
  return items;
}

const GALLERY_ITEMS = buildGalleryItems();

// ─── Main Screen ─────────────────────────────────────────────────

export default function GalleryScreen() {
  const [completedIds, setCompletedIds] = useState([]);
  const [fullscreenItem, setFullscreen] = useState(null);
  const { width }                       = useWindowDimensions();

  // Two columns with a gap between them
  const gap      = 12;
  const padding  = 16;
  const tileSize = (width - padding * 2 - gap) / 2;

  // Reload completed list every time this screen comes into focus
  useFocusEffect(
    useCallback(() => {
      async function fetchCompleted() {
        const ids = await loadCompletedPuzzles();
        setCompletedIds(ids);
      }
      fetchCompleted();
    }, [])
  );

  const unlockedCount = GALLERY_ITEMS.filter((item) =>
    item.unlockedByIds.some((id) => completedIds.includes(id))
  ).length;

  return (
    <SafeAreaView style={styles.safeArea}>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.heading}>Gallery</Text>
        <Text style={styles.subheading}>
          {unlockedCount} of {GALLERY_ITEMS.length} unlocked
        </Text>
      </View>

      {/* Grid of tiles */}
      <FlatList
        data={GALLERY_ITEMS}
        keyExtractor={(item) => item.reward}
        numColumns={2}
        contentContainerStyle={{ padding, paddingBottom: 40 }}
        columnWrapperStyle={{ gap }}
        ItemSeparatorComponent={() => <View style={{ height: gap }} />}
        renderItem={({ item }) => {
          const isUnlocked = item.unlockedByIds.some((id) =>
            completedIds.includes(id)
          );
          return (
            <GalleryTile
              item={item}
              isUnlocked={isUnlocked}
              size={tileSize}
              onPress={() => isUnlocked && setFullscreen(item)}
            />
          );
        }}
      />

      {/* Fullscreen image viewer */}
      <FullscreenModal
        item={fullscreenItem}
        onClose={() => setFullscreen(null)}
      />

    </SafeAreaView>
  );
}

// ─── Gallery Tile ─────────────────────────────────────────────────

function GalleryTile({ item, isUnlocked, size, onPress }) {
  // Safety check — if the image isn't in our map, show locked tile
  const imageSource = getRewardImageSource(item.reward);

  return (
    <TouchableOpacity
      style={[styles.tile, { width: size, height: size }]}
      onPress={onPress}
      activeOpacity={isUnlocked ? 0.8 : 1}
    >
      {isUnlocked && imageSource ? (
        <>
          <Image
            source={imageSource}
            style={styles.tileImage}
            resizeMode="cover"
          />
          <View style={styles.tileLabel}>
            <Text style={styles.tileLabelText} numberOfLines={1}>
              {item.title}
            </Text>
          </View>
        </>
      ) : (
        <View style={styles.lockedTile}>
          <Text style={styles.lockIcon}>🔒</Text>
          <Text style={styles.lockText}>Locked</Text>
          <Text style={styles.lockSubText}>{item.title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── Fullscreen Modal ─────────────────────────────────────────────

function FullscreenModal({ item, onClose }) {
  const { width } = useWindowDimensions();
  const imageSource = item ? getRewardImageSource(item.reward) : null;

  return (
    <Modal
      visible={item !== null}
      transparent={true}
      animationType="fade"
    >
      <View style={styles.fullscreenOverlay}>

        <TouchableOpacity
          style={styles.closeButton}
          onPress={onClose}
          activeOpacity={0.8}
        >
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>

        {imageSource && (
          <>
            <Image
              source={imageSource}
              style={{ width, height: width }}
              resizeMode="cover"
            />
            <Text style={styles.fullscreenCaption}>
              {item.title}
            </Text>
          </>
        )}

      </View>
    </Modal>
  );
}

// ─── Styles ──────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },

  // Header
  header: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 16,
  },
  heading: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 4,
  },
  subheading: {
    fontSize: 14,
    color: '#6c757d',
  },

  // Tile
  tile: {
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#e9ecef',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  tileImage: {
    width: '100%',
    height: '100%',
  },
  tileLabel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  tileLabelText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },

  // Locked tile
  lockedTile: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e9ecef',
    gap: 4,
  },
  lockIcon: { fontSize: 28 },
  lockText: {
    fontSize: 13,
    color: '#6c757d',
    fontWeight: '600',
  },
  lockSubText: {
    fontSize: 11,
    color: '#adb5bd',
    textAlign: 'center',
    paddingHorizontal: 8,
  },

  // Fullscreen
  fullscreenOverlay: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  closeButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  fullscreenCaption: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 20,
    opacity: 0.8,
  },
});
