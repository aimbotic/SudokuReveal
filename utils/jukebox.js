import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';

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

let activePlayer = null;
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
  await setAudioModeAsync({
    playsInSilentMode: true,
    shouldPlayInBackground: false,
    interruptionMode: 'duckOthers',
  });
}

function unloadCurrentPlayer() {
  if (!activePlayer) return;

  const player = activePlayer;
  activePlayer = null;
  player.pause();
  player.remove();
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

    if (currentTrackId === trackId && activePlayer) {
      activePlayer.play();
      isPlaying = true;
      return;
    }

    unloadCurrentPlayer();

    const player = createAudioPlayer(track.source);
    player.loop = true;
    player.volume = 0.68;
    player.play();

    activePlayer = player;
    currentTrackId = trackId;
    isPlaying = true;
  } finally {
    isLoading = false;
    emit();
  }
}

export async function pauseJukebox() {
  if (!activePlayer) return;
  activePlayer.pause();
  isPlaying = false;
  emit();
}

export async function stopJukebox() {
  unloadCurrentPlayer();
  currentTrackId = null;
  isPlaying = false;
  emit();
}
