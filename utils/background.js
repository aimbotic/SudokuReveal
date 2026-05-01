import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';

export const CUSTOM_BACKGROUND_KEY = 'custom_home_game_background';

export async function loadCustomBackground() {
  try {
    return await AsyncStorage.getItem(CUSTOM_BACKGROUND_KEY);
  } catch (error) {
    console.error('Failed to load custom background:', error);
    return null;
  }
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

  await AsyncStorage.setItem(CUSTOM_BACKGROUND_KEY, source);
  return source;
}

export async function clearCustomBackground() {
  await AsyncStorage.removeItem(CUSTOM_BACKGROUND_KEY);
}
