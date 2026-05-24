import { Audio } from 'expo-av';

export const JUKEBOX_TRACKS = [
  {
    id: 'meadow-drift',
    title: 'Meadow Drift',
    subtitle: 'Soft piano loops and warm air',
    color: '#7dd3a7',
    source: require('../assets/music/meadow-drift.wav'),
  },
  {
    id: 'rain-lanterns',
    title: 'Rain Lanterns',
    subtitle: 'Gentle drops and glowing chords',
    color: '#8ecae6',
    source: require('../assets/music/rain-lanterns.wav'),
  },
  {
    id: 'quiet-pines',
    title: 'Quiet Pines',
    subtitle: 'Slow arpeggios through the trees',
    color: '#c3bef0',
    source: require('../assets/music/quiet-pines.wav'),
  },
  {
    id: 'moonlit-keys',
    title: 'Moonlit Keys',
    subtitle: 'Soft night tones with a gentle pulse',
    color: '#a5b4fc',
    source: require('../assets/music/moonlit-keys.wav'),
  },
  {
    id: 'ocean-breath',
    title: 'Ocean Breath',
    subtitle: 'Slow swells for relaxed solving',
    color: '#67e8f9',
    source: require('../assets/music/ocean-breath.wav'),
  },
  {
    id: 'cloud-garden',
    title: 'Cloud Garden',
    subtitle: 'Airy chords with quiet shimmer',
    color: '#bbf7d0',
    source: require('../assets/music/cloud-garden.wav'),
  },
  {
    id: 'cedar-glow',
    title: 'Cedar Glow',
    subtitle: 'Warm low notes and forest calm',
    color: '#fcd34d',
    source: require('../assets/music/cedar-glow.wav'),
  },
  {
    id: 'starlit-stream',
    title: 'Starlit Stream',
    subtitle: 'Clear flowing tones for focus',
    color: '#f0abfc',
    source: require('../assets/music/starlit-stream.wav'),
  },
];

let activeSound = null;
let currentTrackId = null;
let isPlaying = false;
let isLoading = false;
let listeners = [];

function emit() {
  const snapshot = getJukeboxState();
  listeners.forEach((listener) => listener(snapshot));
}

function findTrack(trackId) {
  return JUKEBOX_TRACKS.find((track) => track.id === trackId) ?? null;
}

async function configureAudio() {
  await Audio.setAudioModeAsync({
    playsInSilentModeIOS: true,
    staysActiveInBackground: false,
    shouldDuckAndroid: true,
  });
}

async function unloadCurrentSound() {
  if (!activeSound) return;

  const sound = activeSound;
  activeSound = null;
  await sound.unloadAsync();
}

function handlePlaybackStatus(status) {
  if (!status.isLoaded) {
    return;
  }

  isPlaying = status.isPlaying;
  emit();
}

export function getJukeboxState() {
  return {
    currentTrackId,
    isPlaying,
    isLoading,
  };
}

export function subscribeToJukebox(listener) {
  listeners.push(listener);
  listener(getJukeboxState());

  return () => {
    listeners = listeners.filter((entry) => entry !== listener);
  };
}

export async function playJukeboxTrack(trackId) {
  const track = findTrack(trackId);
  if (!track) return;

  isLoading = true;
  emit();

  try {
    await configureAudio();

    if (currentTrackId === trackId && activeSound) {
      await activeSound.playAsync();
      isPlaying = true;
      return;
    }

    await unloadCurrentSound();

    const { sound } = await Audio.Sound.createAsync(track.source, {
      shouldPlay: true,
      isLooping: true,
      volume: 0.68,
    });

    activeSound = sound;
    currentTrackId = trackId;
    isPlaying = true;
    sound.setOnPlaybackStatusUpdate(handlePlaybackStatus);
  } finally {
    isLoading = false;
    emit();
  }
}

export async function pauseJukebox() {
  if (!activeSound) return;
  await activeSound.pauseAsync();
  isPlaying = false;
  emit();
}

export async function stopJukebox() {
  await unloadCurrentSound();
  currentTrackId = null;
  isPlaying = false;
  emit();
}
