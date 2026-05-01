import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';

export const BACKGROUND_SELECTION_KEY = 'selected_home_game_background';
export const CUSTOM_BACKGROUND_KEY = 'custom_home_game_background';

export const BUILT_IN_BACKGROUNDS = [
  {
    id: 'aurora-lake',
    title: 'Aurora Lake',
    source: require('../assets/backgrounds/aurora-lake.png'),
  },
  {
    id: 'misty-pines',
    title: 'Misty Pines',
    source: require('../assets/backgrounds/misty-pines.png'),
  },
  {
    id: 'desert-dusk',
    title: 'Desert Dusk',
    source: require('../assets/backgrounds/desert-dusk.png'),
  },
  {
    id: 'ocean-glow',
    title: 'Ocean Glow',
    source: require('../assets/backgrounds/ocean-glow.png'),
  },
  {
    id: 'meadow-morning',
    title: 'Meadow Morning',
    source: require('../assets/backgrounds/meadow-morning.png'),
  },
  {
    id: 'midnight-city',
    title: 'Midnight City',
    source: require('../assets/backgrounds/midnight-city.png'),
  },
  {
    id: 'rose-clouds',
    title: 'Rose Clouds',
    source: require('../assets/backgrounds/rose-clouds.png'),
  },
  {
    id: 'golden-forest',
    title: 'Golden Forest',
    source: require('../assets/backgrounds/golden-forest.png'),
  },
  {
    id: 'lavender-field',
    title: 'Lavender Field',
    source: require('../assets/backgrounds/lavender-field.png'),
  },
  {
    id: 'arctic-night',
    title: 'Arctic Night',
    source: require('../assets/backgrounds/arctic-night.png'),
  },
];

export function getBackgroundImageSource(selection) {
  if (!selection) return undefined;
  if (selection.type === 'custom' && selection.uri) {
    return { uri: selection.uri };
  }
  if (selection.type === 'builtin') {
    return BUILT_IN_BACKGROUNDS.find((background) => background.id === selection.id)?.source;
  }
  return undefined;
}

export function isSelectedBackground(selection, backgroundId) {
  return selection?.type === 'builtin' && selection.id === backgroundId;
}

export async function loadSelectedBackground() {
  try {
    const json = await AsyncStorage.getItem(BACKGROUND_SELECTION_KEY);
    if (json) {
      return JSON.parse(json);
    }

    const legacyCustomBackground = await AsyncStorage.getItem(CUSTOM_BACKGROUND_KEY);
    if (legacyCustomBackground) {
      return { type: 'custom', uri: legacyCustomBackground };
    }

    return null;
  } catch (error) {
    console.error('Failed to load selected background:', error);
    return null;
  }
}

export async function selectBuiltInBackground(backgroundId) {
  const selection = { type: 'builtin', id: backgroundId };
  await AsyncStorage.setItem(BACKGROUND_SELECTION_KEY, JSON.stringify(selection));
  return selection;
}

export async function chooseCustomBackground() {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [9, 16],
    quality: 0.85,
    base64: true,
  });

  if (result.canceled || !result.assets?.[0]) {
    return null;
  }

  const asset = result.assets[0];
  const source = asset.base64
    ? `data:${asset.mimeType ?? 'image/jpeg'};base64,${asset.base64}`
    : asset.uri;
  const selection = { type: 'custom', uri: source };

  await AsyncStorage.setItem(CUSTOM_BACKGROUND_KEY, source);
  await AsyncStorage.setItem(BACKGROUND_SELECTION_KEY, JSON.stringify(selection));
  return selection;
}

export async function clearCustomBackground() {
  await AsyncStorage.multiRemove([BACKGROUND_SELECTION_KEY, CUSTOM_BACKGROUND_KEY]);
}
