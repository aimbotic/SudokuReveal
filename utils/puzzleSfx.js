import { Platform } from 'react-native';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';

const EFFECT_SOURCES = {
  'combo-1': require('../assets/sfx/combo-1.wav'),
  'combo-2': require('../assets/sfx/combo-2.wav'),
  'combo-3': require('../assets/sfx/combo-3.wav'),
  'combo-4': require('../assets/sfx/combo-4.wav'),
  'combo-5': require('../assets/sfx/combo-5.wav'),
  'combo-6': require('../assets/sfx/combo-6.wav'),
  'combo-7': require('../assets/sfx/combo-7.wav'),
  'combo-8': require('../assets/sfx/combo-8.wav'),
  'combo-9': require('../assets/sfx/combo-9.wav'),
  'combo-10': require('../assets/sfx/combo-10.wav'),
  'combo-11': require('../assets/sfx/combo-11.wav'),
  'combo-12': require('../assets/sfx/combo-12.wav'),
  'combo-13': require('../assets/sfx/combo-13.wav'),
  'combo-14': require('../assets/sfx/combo-14.wav'),
  'combo-15': require('../assets/sfx/combo-15.wav'),
  'combo-break': require('../assets/sfx/combo-break.wav'),
  'line-clear': require('../assets/sfx/line-clear.wav'),
  'box-complete': require('../assets/sfx/box-complete.wav'),
  'mega-bonus': require('../assets/sfx/mega-bonus.wav'),
  'ultimate-combo': require('../assets/sfx/ultimate-combo.wav'),
};

let hasConfiguredAudio = false;

async function configureAudio() {
  if (hasConfiguredAudio) return;

  await setAudioModeAsync({
    playsInSilentMode: true,
    shouldPlayInBackground: false,
    interruptionMode: 'duckOthers',
  });
  hasConfiguredAudio = true;
}

export function playNativePuzzleEffect(effectId, volume = 0.82) {
  if (Platform.OS === 'web') return false;

  const source = EFFECT_SOURCES[effectId];
  if (!source) return false;

  configureAudio()
    .then(() => {
      const player = createAudioPlayer(source);
      player.volume = volume;
      player.play();
      setTimeout(() => {
        player.pause();
        player.remove();
      }, 2600);
    })
    .catch((error) => {
      console.warn('Failed to play puzzle effect:', error);
    });

  return true;
}
