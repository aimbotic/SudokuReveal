import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
  useWindowDimensions,
  SafeAreaView,
  Modal,
  Switch,
  Animated,
  Easing,
  Vibration,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Redirect, router, useFocusEffect, useLocalSearchParams } from 'expo-router';

import puzzlesData from '../assets/puzzles.json';
import {
  markPuzzleCompleted,
  saveBoardState,
  loadBoardState,
  clearBoardState,
} from '../utils/progress';
import {
  getBackgroundImageSource,
  loadSelectedBackground,
} from '../utils/background';

const SETTINGS_KEY = 'puzzle_feature_settings';
const MAX_MISTAKES = 3;
const POINTS_PER_CORRECT = 75;
const LINE_CLEAR_BONUS = 13000;
const MEGA_COMBO_TARGET = 10;
const MEGA_COMBO_BONUS = 10000;
const ULTIMATE_COMBO_TARGET = 15;
const ULTIMATE_COMBO_BONUS = 50000;
const BOT_PROFILES = {
  easy: { name: 'Easy Bot', moveChance: 0.3, delay: 900 },
  medium: { name: 'Medium Bot', moveChance: 0.55, delay: 720 },
  hard: { name: 'Hard Bot', moveChance: 0.8, delay: 520 },
  insane: { name: 'Insane Bot', moveChance: 1, delay: 300 },
};
const COMBO_BLOCKS = [
  { x: -92, y: -74, color: '#4cc9f0' },
  { x: -54, y: -118, color: '#4361ee' },
  { x: 0, y: -96, color: '#ffd166' },
  { x: 58, y: -118, color: '#06d6a0' },
  { x: 96, y: -68, color: '#f72585' },
  { x: -112, y: -12, color: '#ffd166' },
  { x: 112, y: 10, color: '#4cc9f0' },
  { x: -88, y: 72, color: '#06d6a0' },
  { x: -28, y: 110, color: '#f72585' },
  { x: 34, y: 110, color: '#4361ee' },
  { x: 92, y: 72, color: '#ffd166' },
];
const ASH_BLOCKS = [
  { x: -26, y: 58, rotate: -42 },
  { x: -8, y: 72, rotate: 28 },
  { x: 14, y: 62, rotate: -18 },
  { x: 32, y: 78, rotate: 46 },
  { x: -36, y: 90, rotate: 16 },
  { x: 6, y: 100, rotate: -54 },
];
const CONFETTI_PIECES = Array.from({ length: 96 }, (_, index) => ({
  x: ((index % 17) - 8) * 24,
  y: -190 - (index % 8) * 22,
  fall: 250 + (index % 11) * 18,
  rotate: index % 2 === 0 ? 320 : -320,
  color: ['#ffd166', '#06d6a0', '#4cc9f0', '#f72585', '#4361ee'][index % 5],
}));
const ULTIMATE_CONFETTI_PIECES = Array.from({ length: 180 }, (_, index) => ({
  x: ((index % 25) - 12) * 21,
  y: -245 - (index % 10) * 24,
  fall: 315 + (index % 14) * 20,
  rotate: index % 2 === 0 ? 540 : -540,
  color: ['#ff006e', '#ffbe0b', '#3a86ff', '#06d6a0', '#ffffff', '#8338ec'][index % 6],
}));
const DEFAULT_FEATURE_SETTINGS = {
  notes: true,
  undo: true,
  pause: true,
  hints: true,
  mistakeCounting: true,
  lockCorrect: false,
  darkMode: false,
};

// ─── Helpers ─────────────────────────────────────────────────────

function copyGrid(grid) {
  return grid.map((row) => [...row]);
}

function createEmptyNotes() {
  return Array.from({ length: 9 }, () =>
    Array.from({ length: 9 }, () => [])
  );
}

function copyNotes(notes) {
  return notes.map((row) => row.map((cellNotes) => [...cellNotes]));
}

function removeNoteFromPeers(notes, row, col, number) {
  const nextNotes = copyNotes(notes);

  for (let i = 0; i < 9; i++) {
    if (i !== col) {
      nextNotes[row][i] = nextNotes[row][i].filter((n) => n !== number);
    }
    if (i !== row) {
      nextNotes[i][col] = nextNotes[i][col].filter((n) => n !== number);
    }
  }

  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  for (let r = boxRow; r < boxRow + 3; r++)
    for (let c = boxCol; c < boxCol + 3; c++)
      if (r !== row || c !== col) {
        nextNotes[r][c] = nextNotes[r][c].filter((n) => n !== number);
      }

  return nextNotes;
}

function isBoardSolved(board, solution) {
  for (let r = 0; r < 9; r++)
    for (let c = 0; c < 9; c++)
      if (board[r][c] !== solution[r][c]) return false;
  return true;
}

function isLineSolved(board, solution, type, index) {
  for (let i = 0; i < 9; i++) {
    const row = type === 'row' ? index : i;
    const col = type === 'row' ? i : index;
    if (board[row][col] !== solution[row][col]) return false;
  }
  return true;
}

function isBoxSolved(board, solution, boxIndex) {
  const boxRow = Math.floor(boxIndex / 3) * 3;
  const boxCol = (boxIndex % 3) * 3;
  for (let row = boxRow; row < boxRow + 3; row++)
    for (let col = boxCol; col < boxCol + 3; col++)
      if (board[row][col] !== solution[row][col]) return false;
  return true;
}

function getSolvedLineIds(board, solution) {
  const solvedLines = [];
  for (let index = 0; index < 9; index++) {
    if (isLineSolved(board, solution, 'row', index)) {
      solvedLines.push(`row-${index}`);
    }
    if (isLineSolved(board, solution, 'col', index)) {
      solvedLines.push(`col-${index}`);
    }
  }
  return solvedLines;
}

function getSolvedBoxIds(board, solution) {
  const solvedBoxes = [];
  for (let index = 0; index < 9; index++) {
    if (isBoxSolved(board, solution, index)) {
      solvedBoxes.push(`box-${index}`);
    }
  }
  return solvedBoxes;
}

function getCorrectUserCellKeys(board, puzzle) {
  const correctCells = [];
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (
        puzzle.given[row][col] === 0 &&
        board[row][col] !== 0 &&
        board[row][col] === puzzle.solution[row][col]
      ) {
        correctCells.push(`${row}-${col}`);
      }
    }
  }
  return correctCells;
}

function getCorrectFillCount(board, puzzle) {
  let count = 0;
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (board[row][col] === puzzle.solution[row][col]) {
        count += 1;
      }
    }
  }
  return count;
}

function getOpenSolutionCells(board, puzzle) {
  const cells = [];
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (board[row][col] !== puzzle.solution[row][col]) {
        cells.push({ row, col });
      }
    }
  }
  return cells;
}

function hasConflict(board, row, col) {
  const val = board[row][col];
  if (val === 0) return false;
  for (let i = 0; i < 9; i++) {
    if (i !== col && board[row][i] === val) return true;
    if (i !== row && board[i][col] === val) return true;
  }
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  for (let r = boxRow; r < boxRow + 3; r++)
    for (let c = boxCol; c < boxCol + 3; c++)
      if ((r !== row || c !== col) && board[r][c] === val) return true;
  return false;
}

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const s = (totalSeconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

let sharedAudioContext = null;

function getAudioContext() {
  const AudioContext = globalThis.AudioContext ?? globalThis.webkitAudioContext;
  if (!AudioContext) return false;

  if (!sharedAudioContext) {
    sharedAudioContext = new AudioContext();
  }

  if (sharedAudioContext.state === 'suspended') {
    sharedAudioContext.resume?.();
  }

  return sharedAudioContext;
}

function playTone(
  frequency,
  duration = 0.12,
  delay = 0,
  { type = 'square', gainValue = 0.07, detune = 0, attack = 0.012 } = {}
) {
  const audioContext = getAudioContext();
  if (!audioContext) return false;

  try {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const startAt = audioContext.currentTime + delay;

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, startAt);
    oscillator.detune.setValueAtTime(detune, startAt);
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(gainValue, startAt + attack);
    gain.gain.exponentialRampToValueAtTime(gainValue * 0.55, startAt + duration * 0.45);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(startAt);
    oscillator.stop(startAt + duration + 0.02);
    return true;
  } catch {
    return false;
  }
}

function playLayeredTone(frequency, duration = 0.12, delay = 0, gainValue = 0.045) {
  const layers = [
    playTone(frequency, duration, delay, { type: 'triangle', gainValue }),
    playTone(frequency * 2, duration * 0.75, delay + 0.004, { type: 'sine', gainValue: gainValue * 0.42 }),
    playTone(frequency * 1.005, duration * 0.82, delay, { type: 'square', gainValue: gainValue * 0.25, detune: 6 }),
  ];
  return layers.some(Boolean);
}

function playChord(frequencies, duration = 0.18, delay = 0, gainValue = 0.04) {
  return frequencies
    .map((frequency, index) =>
      playLayeredTone(frequency, duration, delay + index * 0.003, gainValue)
    )
    .some(Boolean);
}

function playComboSound(comboCount) {
  const streak = Math.max(1, Math.min(comboCount, ULTIMATE_COMBO_TARGET));
  const climb = Math.pow(1.155, streak - 1);
  const base = Math.min(1760, 330 * climb);
  const sparkleDelay = 0.035 + Math.min(0.055, streak * 0.003);
  const played = [
    playLayeredTone(base, 0.105, 0, 0.04),
    playLayeredTone(base * 1.25, 0.1, sparkleDelay, 0.038),
    playLayeredTone(base * 1.5, 0.115, sparkleDelay * 2, 0.034),
    playTone(base * 2.01, 0.065, sparkleDelay * 2.7, { type: 'sine', gainValue: 0.032 }),
  ].some(Boolean);
  if (!played) {
    Vibration.vibrate(streak === 1 ? 18 : [0, 16, 18, 24]);
  }
}

function playComboBreakSound() {
  const played = [
    playTone(210, 0.18, 0, { type: 'sawtooth', gainValue: 0.07 }),
    playTone(155, 0.2, 0.06, { type: 'sawtooth', gainValue: 0.06 }),
    playTone(96, 0.24, 0.13, { type: 'triangle', gainValue: 0.05 }),
    playTone(64, 0.18, 0.2, { type: 'square', gainValue: 0.035 }),
  ].some(Boolean);
  if (!played) {
    Vibration.vibrate([0, 50, 28, 90]);
  }
}

function playLineClearSound() {
  const notes = [523, 659, 784, 988, 1175, 1568, 1976];
  const played = notes
    .map((frequency, index) => playLayeredTone(frequency, 0.14, index * 0.043, 0.038))
    .some(Boolean);

  playChord([392, 523, 659, 988], 0.32, 0.3, 0.035);
  playTone(2349, 0.12, 0.42, { type: 'sine', gainValue: 0.036 });

  if (!played) {
    Vibration.vibrate([0, 22, 18, 32, 18, 72]);
  }
}

function playBoxCompleteSound() {
  const notes = [440, 554, 659, 880, 1108, 1318];
  const played = notes
    .map((frequency, index) => playLayeredTone(frequency, 0.115, index * 0.045, 0.038))
    .some(Boolean);

  playChord([554, 659, 880, 1318], 0.3, 0.24, 0.04);
  playTone(1760, 0.15, 0.36, { type: 'sine', gainValue: 0.035 });

  if (!played) {
    Vibration.vibrate([0, 24, 18, 44, 18, 80]);
  }
}

function playMegaBonusSound() {
  const notes = [
    523, 659, 784, 1046, 1318,
    784, 1046, 1318, 1568, 2093,
    1046, 1318, 1568, 2093, 2637,
  ];
  const played = notes
    .map((frequency, index) => playLayeredTone(frequency, 0.15, index * 0.048, 0.04))
    .some(Boolean);

  [262, 330, 392, 523, 659, 784, 1046].forEach((frequency, index) => {
    playTone(frequency, 0.62, 0.74 + index * 0.018, { type: 'triangle', gainValue: 0.034 });
  });
  [1568, 1976, 2637, 3136].forEach((frequency, index) => {
    playTone(frequency, 0.12, 0.88 + index * 0.055, { type: 'sine', gainValue: 0.038 });
  });

  if (!played) {
    Vibration.vibrate([0, 28, 18, 28, 18, 58, 24, 92, 28, 130]);
  }
}

function playUltimateComboSound() {
  const notes = [
    392, 523, 659, 784, 988, 1175,
    659, 784, 988, 1175, 1568, 1976,
    1046, 1318, 1568, 2093, 2637, 3136,
  ];
  const played = notes
    .map((frequency, index) => playLayeredTone(frequency, 0.145, index * 0.037, 0.04))
    .some(Boolean);

  [196, 294, 392, 587, 784, 1175, 1568].forEach((frequency, index) => {
    playTone(frequency, 0.82, 0.7 + index * 0.026, { type: 'triangle', gainValue: 0.034 });
  });
  [2093, 2637, 3136, 3951, 4186, 5274].forEach((frequency, index) => {
    playTone(frequency, 0.1, 0.92 + index * 0.045, { type: 'sine', gainValue: 0.034 });
  });

  if (!played) {
    Vibration.vibrate([0, 35, 18, 35, 18, 75, 24, 120, 28, 170, 32, 220]);
  }
}

async function loadFeatureSettings() {
  try {
    const json = await AsyncStorage.getItem(SETTINGS_KEY);
    if (json === null) return DEFAULT_FEATURE_SETTINGS;
    return { ...DEFAULT_FEATURE_SETTINGS, ...JSON.parse(json) };
  } catch (error) {
    console.error('Failed to load settings:', error);
    return DEFAULT_FEATURE_SETTINGS;
  }
}

async function saveFeatureSettings(settings) {
  try {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Failed to save settings:', error);
  }
}

// ─── Main Screen ─────────────────────────────────────────────────

export default function PuzzleScreen() {
  const { id, mode, room, bot } = useLocalSearchParams();
  const puzzle = puzzlesData.find((p) => p.id === id);
  const isOnlineRace = mode === 'race';
  const isBotBattle = mode === 'bot';
  const botDifficulty = BOT_PROFILES[bot] ? bot : 'easy';
  const botProfile = BOT_PROFILES[botDifficulty];
  const isProgressMode = !isOnlineRace && !isBotBattle;
  const roomCode = typeof room === 'string' ? room : 'QUICK';

  // All null until we load from storage —
  // prevents a flash of empty grid before data arrives
  const [board, setBoard]               = useState(null);
  const [botBoard, setBotBoard]         = useState(null);
  const [notes, setNotes]               = useState(null);
  const [undoStack, setUndoStack]       = useState(null);
  const [seconds, setSeconds]           = useState(null);
  const [mistakes, setMistakes]         = useState(0);
  const [hintsUsed, setHintsUsed]       = useState(0);
  const [score, setScore]               = useState(0);
  const [completedLines, setCompletedLines] = useState([]);
  const [completedBoxes, setCompletedBoxes] = useState([]);
  const [ultimateComboCount, setUltimateComboCount] = useState(0);
  const [isLoaded, setIsLoaded]         = useState(false);

  const [selectedCell, setSelectedCell] = useState(null);
  const [isNoteMode, setIsNoteMode]     = useState(false);
  const [isPaused, setIsPaused]         = useState(false);
  const [isAdOpen, setIsAdOpen]         = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isRaceShielded, setIsRaceShielded] = useState(false);
  const [isBotThinking, setIsBotThinking] = useState(false);
  const [botResult, setBotResult]       = useState(null);
  const [featureSettings, setFeatureSettings] = useState(DEFAULT_FEATURE_SETTINGS);
  const [backgroundSelection, setBackgroundSelection] = useState(null);
  const [isSolved, setIsSolved]         = useState(false);
  const [isFailed, setIsFailed]         = useState(false);
  const [comboCount, setComboCount]     = useState(0);
  const [comboDisplay, setComboDisplay] = useState(null);
  const [isComboBroken, setIsComboBroken] = useState(false);
  const [cellFeedback, setCellFeedback] = useState(null);
  const [cellFeedbackCombo, setCellFeedbackCombo] = useState(1);
  const [lineClearFeedback, setLineClearFeedback] = useState(null);
  const [boxCompleteDisplay, setBoxCompleteDisplay] = useState(null);
  const [isMegaParty, setIsMegaParty]   = useState(false);
  const [isUltimateParty, setIsUltimateParty] = useState(false);
  const timerRef                        = useRef(null);
  const botMoveTimerRef                 = useRef(null);
  const comboAnim                       = useRef(new Animated.Value(0)).current;
  const comboBreakAnim                  = useRef(new Animated.Value(0)).current;
  const correctCellAnim                 = useRef(new Animated.Value(0)).current;
  const wrongCellAnim                   = useRef(new Animated.Value(0)).current;
  const lineClearAnim                   = useRef(new Animated.Value(0)).current;
  const boxCompleteAnim                 = useRef(new Animated.Value(0)).current;
  const megaPartyAnim                   = useRef(new Animated.Value(0)).current;
  const ultimatePartyAnim               = useRef(new Animated.Value(0)).current;
  const isDarkMode                      = featureSettings.darkMode;
  const backgroundSource                = getBackgroundImageSource(backgroundSelection);
  const revealedBackgroundCells         =
    board && puzzle ? getCorrectUserCellKeys(board, puzzle) : [];
  const playerFillCount                 =
    board && puzzle ? getCorrectFillCount(board, puzzle) : 0;
  const botFillCount                    =
    botBoard && puzzle ? getCorrectFillCount(botBoard, puzzle) : 0;

  useFocusEffect(
    useCallback(() => {
      async function fetchBackground() {
        const background = await loadSelectedBackground();
        setBackgroundSelection(background);
      }
      fetchBackground();
    }, [])
  );

  useEffect(() => {
    if (!isOnlineRace) return;

    function handleHiddenChange() {
      if (typeof document !== 'undefined') {
        setIsRaceShielded(document.hidden);
      }
    }

    function handleBlur() {
      setIsRaceShielded(true);
    }

    function handleFocus() {
      setIsRaceShielded(false);
    }

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleHiddenChange);
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('blur', handleBlur);
      window.addEventListener('focus', handleFocus);
    }

    return () => {
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleHiddenChange);
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('blur', handleBlur);
        window.removeEventListener('focus', handleFocus);
      }
    };
  }, [isOnlineRace]);

  // ── Restore saved state on mount ─────────────────────────────
  useEffect(() => {
    if (!puzzle) return;
    setIsLoaded(false);
    setIsPaused(false);
    setIsSolved(false);
    setIsFailed(false);
    setBotResult(null);
    setIsBotThinking(false);
    clearTimeout(botMoveTimerRef.current);
    setComboCount(0);
    setComboDisplay(null);
    setIsComboBroken(false);
    setCellFeedback(null);
    setCellFeedbackCombo(1);
    setLineClearFeedback(null);
    setBoxCompleteDisplay(null);
    setIsMegaParty(false);
    setIsUltimateParty(false);

    async function restore() {
      const saved = isProgressMode ? await loadBoardState(puzzle.id) : null;
      const settings = await loadFeatureSettings();
      setFeatureSettings(settings);
      if (!settings.notes) {
        setIsNoteMode(false);
      }
      if (saved) {
        setBoard(saved.board);
        setBotBoard(copyGrid(puzzle.given));
        setNotes(saved.notes ?? createEmptyNotes());
        setUndoStack(saved.undoStack);
        setSeconds(saved.seconds);
        setMistakes(saved.mistakes ?? 0);
        setHintsUsed(saved.hintsUsed ?? 0);
        setScore(saved.score ?? 0);
        setCompletedLines(saved.completedLines ?? getSolvedLineIds(saved.board, puzzle.solution));
        setCompletedBoxes(saved.completedBoxes ?? getSolvedBoxIds(saved.board, puzzle.solution));
        setUltimateComboCount(saved.ultimateComboCount ?? 0);
      } else {
        setBoard(copyGrid(puzzle.given));
        setBotBoard(copyGrid(puzzle.given));
        setNotes(createEmptyNotes());
        setUndoStack([]);
        setSeconds(0);
        setMistakes(0);
        setHintsUsed(0);
        setScore(0);
        setCompletedLines([]);
        setCompletedBoxes([]);
        setUltimateComboCount(0);
      }
      setIsLoaded(true);
    }
    restore();
  }, [puzzle?.id, isProgressMode]);

  // ── Start timer after load ────────────────────────────────────
  useEffect(() => {
    if (!isLoaded || isPaused || isSolved || isFailed) return;
    timerRef.current = setInterval(() => {
      setSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [isLoaded, isPaused, isSolved, isFailed]);

  // ── Stop timer on solve ───────────────────────────────────────
  useEffect(() => {
    if (isSolved || isFailed) clearInterval(timerRef.current);
  }, [isSolved, isFailed]);

  useEffect(() => () => clearTimeout(botMoveTimerRef.current), []);

  // ── Cell selection ────────────────────────────────────────────
  if (!puzzle) {
    return <Redirect href="/select" />;
  }

  function handleCellPress(row, col) {
    if (isBotThinking) return;
    setSelectedCell({ row, col });
  }

  function takeBotTurn(currentBotBoard = botBoard) {
    if (!isBotBattle || !currentBotBoard || isSolved || isFailed || botResult !== null) return;

    setIsBotThinking(true);
    clearTimeout(botMoveTimerRef.current);
    botMoveTimerRef.current = setTimeout(() => {
      setBotBoard((latestBotBoard) => {
        if (!latestBotBoard || Math.random() > botProfile.moveChance) {
          setIsBotThinking(false);
          return latestBotBoard;
        }

        const openCells = getOpenSolutionCells(latestBotBoard, puzzle);
        if (openCells.length === 0) {
          setIsBotThinking(false);
          setBotResult('bot');
          setIsFailed(true);
          return latestBotBoard;
        }

        const cell = openCells[Math.floor(Math.random() * openCells.length)];
        const nextBotBoard = copyGrid(latestBotBoard);
        nextBotBoard[cell.row][cell.col] = puzzle.solution[cell.row][cell.col];

        if (isBoardSolved(nextBotBoard, puzzle.solution)) {
          setBotResult('bot');
          setIsFailed(true);
        }

        setIsBotThinking(false);
        return nextBotBoard;
      });
    }, botProfile.delay);
  }

  function triggerComboEffect(nextComboCount, pointsEarned, megaBonus, soundComboCount = nextComboCount) {
    setComboDisplay({ count: soundComboCount, pointsEarned, megaBonus });
    comboAnim.stopAnimation();
    comboAnim.setValue(0);
    playComboSound(soundComboCount);
    Animated.sequence([
      Animated.timing(comboAnim, {
        toValue: 0.18,
        duration: 70,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(comboAnim, {
        toValue: 1,
        duration: 520,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => setComboDisplay(null));
  }

  function triggerComboBreakEffect() {
    setIsComboBroken(true);
    comboBreakAnim.stopAnimation();
    comboBreakAnim.setValue(0);
    playComboBreakSound();
    Animated.timing(comboBreakAnim, {
      toValue: 1,
      duration: 520,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => setIsComboBroken(false));
  }

  function triggerMegaParty() {
    setIsMegaParty(true);
    megaPartyAnim.stopAnimation();
    megaPartyAnim.setValue(0);
    playMegaBonusSound();
    Animated.timing(megaPartyAnim, {
      toValue: 1,
      duration: 1800,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => setIsMegaParty(false));
  }

  function triggerUltimateParty() {
    setIsUltimateParty(true);
    ultimatePartyAnim.stopAnimation();
    ultimatePartyAnim.setValue(0);
    playUltimateComboSound();
    Animated.timing(ultimatePartyAnim, {
      toValue: 1,
      duration: 2600,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => setIsUltimateParty(false));
  }

  function triggerLineClearEffect(lines, bonusPoints) {
    setLineClearFeedback({ lines, bonusPoints });
    lineClearAnim.stopAnimation();
    lineClearAnim.setValue(0);
    playLineClearSound();
    Animated.timing(lineClearAnim, {
      toValue: 1,
      duration: 980,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => setLineClearFeedback(null));
  }

  function triggerBoxCompleteEffect(boxNumber) {
    setBoxCompleteDisplay({ boxNumber });
    boxCompleteAnim.stopAnimation();
    boxCompleteAnim.setValue(0);
    playBoxCompleteSound();
    Animated.sequence([
      Animated.timing(boxCompleteAnim, {
        toValue: 0.18,
        duration: 80,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(boxCompleteAnim, {
        toValue: 1,
        duration: 900,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => setBoxCompleteDisplay(null));
  }

  function triggerRewardEffectsInPointOrder(rewards) {
    rewards
      .filter(Boolean)
      .sort((a, b) => a.points - b.points)
      .forEach((reward, index) => {
        setTimeout(reward.trigger, index * 720);
      });
  }

  function triggerCellFeedback(row, col, type, comboSize = 1) {
    setCellFeedback({ row, col, type });
    setCellFeedbackCombo(comboSize);
    const anim = type === 'correct' ? correctCellAnim : wrongCellAnim;
    anim.stopAnimation();
    anim.setValue(0);
    Animated.sequence([
      Animated.timing(anim, {
        toValue: 0.45,
        duration: 90,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(anim, {
        toValue: 1,
        duration: 430,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => setCellFeedback(null));
  }

  async function handleFeatureToggle(feature, value) {
    const nextSettings = { ...featureSettings, [feature]: value };
    setFeatureSettings(nextSettings);
    await saveFeatureSettings(nextSettings);

    if (feature === 'notes' && !value) {
      setIsNoteMode(false);
    }
    if (feature === 'pause' && !value) {
      setIsPaused(false);
    }
    if (feature === 'mistakeCounting' && !value) {
      setMistakes(0);
      setIsFailed(false);
      if (isProgressMode) {
        await saveBoardState(puzzle.id, {
          board,
          notes,
          undoStack,
          seconds,
          mistakes: 0,
          hintsUsed,
          score,
          completedLines,
          completedBoxes,
          ultimateComboCount,
        });
      }
    }
  }

  // ── Number input ──────────────────────────────────────────────
  async function restartCurrentPuzzle() {
    if (isProgressMode) {
      await clearBoardState(puzzle.id);
    }
    setBoard(copyGrid(puzzle.given));
    setBotBoard(copyGrid(puzzle.given));
    setNotes(createEmptyNotes());
    setUndoStack([]);
    setSeconds(0);
    setMistakes(0);
    setHintsUsed(0);
    setScore(0);
    setCompletedLines([]);
    setCompletedBoxes([]);
    setUltimateComboCount(0);
    setSelectedCell(null);
    setIsNoteMode(false);
    setIsPaused(false);
    setIsFailed(false);
    setBotResult(null);
    setIsBotThinking(false);
    clearTimeout(botMoveTimerRef.current);
    setComboCount(0);
    setComboDisplay(null);
    setIsComboBroken(false);
    setCellFeedback(null);
    setCellFeedbackCombo(1);
    setLineClearFeedback(null);
    setBoxCompleteDisplay(null);
    setIsMegaParty(false);
    setIsUltimateParty(false);
  }

  function getHintCell() {
    if (
      selectedCell &&
      puzzle.given[selectedCell.row][selectedCell.col] === 0 &&
      board[selectedCell.row][selectedCell.col] !== puzzle.solution[selectedCell.row][selectedCell.col]
    ) {
      return selectedCell;
    }

    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (
          puzzle.given[row][col] === 0 &&
          board[row][col] !== puzzle.solution[row][col]
        ) {
          return { row, col };
        }
      }
    }

    return null;
  }

  async function applyHint() {
    const hintCell = getHintCell();
    if (!hintCell) return;

    const { row, col } = hintCell;
    const prevValue = board[row][col];
    const prevNotes = notes[row][col];
    const newBoard = copyGrid(board);
    let newNotes = copyNotes(notes);
    const hintedValue = puzzle.solution[row][col];
    const newHintsUsed = hintsUsed + 1;
    const newUndoStack = [
      ...undoStack,
      { row, col, prev: prevValue, prevNotes, prevNotesGrid: notes },
    ];

    newBoard[row][col] = hintedValue;
    newNotes[row][col] = [];
    newNotes = removeNoteFromPeers(newNotes, row, col, hintedValue);

    setBoard(newBoard);
    setNotes(newNotes);
    setUndoStack(newUndoStack);
    setHintsUsed(newHintsUsed);
    setSelectedCell({ row, col });

    if (isProgressMode) {
      await saveBoardState(puzzle.id, {
        board: newBoard,
        notes: newNotes,
        undoStack: newUndoStack,
        seconds,
        mistakes,
        hintsUsed: newHintsUsed,
        score,
        completedLines,
        completedBoxes,
        ultimateComboCount,
      });
    }

    if (isBoardSolved(newBoard, puzzle.solution)) {
      if (isProgressMode) {
        await markPuzzleCompleted(puzzle.id);
        await clearBoardState(puzzle.id);
      }
      if (isBotBattle) {
        setBotResult('player');
      }
      setIsSolved(true);
    }
  }

  async function handleHintPress() {
    if (!featureSettings.hints) return;
    if (!getHintCell()) return;

    if (hintsUsed === 0) {
      await applyHint();
    } else {
      setIsAdOpen(true);
    }
  }

  async function handleAdComplete() {
    setIsAdOpen(false);
    await applyHint();
  }

  async function handleNumberPress(number) {
    if (isBotThinking || botResult !== null) return;
    if (selectedCell === null) return;
    const { row, col } = selectedCell;
    if (puzzle.given[row][col] !== 0) return;

    const prevValue = board[row][col];
    if (
      featureSettings.lockCorrect &&
      prevValue !== 0 &&
      prevValue === puzzle.solution[row][col]
    ) {
      return;
    }

    const prevNotes = notes[row][col];
    let newBoard = board;
    let newNotes = notes;
    let newMistakes = mistakes;
    let newUltimateComboCount = ultimateComboCount;
    const isAnswerEntry = !(featureSettings.notes && isNoteMode && prevValue === 0);
    const isCorrectAnswer = number !== 0 && number === puzzle.solution[row][col];
    const isWrongAnswer = number !== 0 && number !== puzzle.solution[row][col];
    const isNewCorrectAnswer =
      isAnswerEntry &&
      isCorrectAnswer &&
      prevValue !== puzzle.solution[row][col];
    let newScore = score;
    let newCompletedLines = completedLines;
    let newCompletedBoxes = completedBoxes;

    if (!isAnswerEntry) {
      newNotes = copyNotes(notes);
      if (number === 0) {
        newNotes[row][col] = [];
      } else if (newNotes[row][col].includes(number)) {
        newNotes[row][col] = newNotes[row][col].filter((n) => n !== number);
      } else {
        newNotes[row][col] = [...newNotes[row][col], number].sort((a, b) => a - b);
      }
    } else {
      newBoard = copyGrid(board);
      newNotes = copyNotes(notes);
      newBoard[row][col] = number;
      newNotes[row][col] = [];

      if (number !== 0) {
        newNotes = removeNoteFromPeers(newNotes, row, col, number);
      }

      if (
        featureSettings.mistakeCounting &&
        number !== 0 &&
        number !== puzzle.solution[row][col]
      ) {
        newMistakes += 1;
      }
    }

    const newUndoStack = [
      ...undoStack,
      { row, col, prev: prevValue, prevNotes, prevNotesGrid: notes },
    ];

    setBoard(newBoard);
    setNotes(newNotes);
    setUndoStack(newUndoStack);
    setMistakes(newMistakes);

    if (isAnswerEntry && number !== 0) {
      if (isCorrectAnswer) {
        const nextComboCount = comboCount + 1;
        triggerCellFeedback(row, col, 'correct', nextComboCount);

        if (isNewCorrectAnswer) {
          const pointsEarned = POINTS_PER_CORRECT * nextComboCount;
          const megaBonus = nextComboCount === MEGA_COMBO_TARGET ? MEGA_COMBO_BONUS : 0;
          newUltimateComboCount = ultimateComboCount + 1;
          const isUltimateBonus = newUltimateComboCount === ULTIMATE_COMBO_TARGET;
          const ultimateBonus =
            isUltimateBonus ? ULTIMATE_COMBO_BONUS : 0;
          const newlyCompletedLines = [
            { type: 'row', index: row, id: `row-${row}` },
            { type: 'col', index: col, id: `col-${col}` },
          ].filter(
            (line) =>
              !completedLines.includes(line.id) &&
              isLineSolved(newBoard, puzzle.solution, line.type, line.index)
          );
          const boxIndex = Math.floor(row / 3) * 3 + Math.floor(col / 3);
          const newlyCompletedBoxes = !completedBoxes.includes(`box-${boxIndex}`) &&
            isBoxSolved(newBoard, puzzle.solution, boxIndex)
            ? [{ index: boxIndex, id: `box-${boxIndex}` }]
            : [];
          const lineBonus = newlyCompletedLines.length * LINE_CLEAR_BONUS;
          newScore += pointsEarned + megaBonus + ultimateBonus;
          newScore += lineBonus;
          setScore(newScore);
          setComboCount(nextComboCount === MEGA_COMBO_TARGET ? 0 : nextComboCount);
          if (isUltimateBonus) {
            newUltimateComboCount = 0;
          }
          setUltimateComboCount(newUltimateComboCount);
          const soundComboCount = isUltimateBonus
            ? ULTIMATE_COMBO_TARGET
            : newUltimateComboCount;
          if (newlyCompletedLines.length > 0) {
            newCompletedLines = [
              ...completedLines,
              ...newlyCompletedLines.map((line) => line.id),
            ];
            setCompletedLines(newCompletedLines);
          }
          if (newlyCompletedBoxes.length > 0) {
            newCompletedBoxes = [
              ...completedBoxes,
              ...newlyCompletedBoxes.map((box) => box.id),
            ];
            setCompletedBoxes(newCompletedBoxes);
          }
          triggerRewardEffectsInPointOrder([
            {
              points: pointsEarned,
              trigger: () => triggerComboEffect(nextComboCount, pointsEarned, 0, soundComboCount),
            },
            nextComboCount === MEGA_COMBO_TARGET && {
              points: MEGA_COMBO_BONUS,
              trigger: triggerMegaParty,
            },
            newlyCompletedLines.length > 0 && {
              points: lineBonus,
              trigger: () => triggerLineClearEffect(newlyCompletedLines, lineBonus),
            },
            newlyCompletedBoxes.length > 0 && {
              points: lineBonus + 1,
              trigger: () => triggerBoxCompleteEffect(newlyCompletedBoxes[0].index + 1),
            },
            isUltimateBonus && {
              points: ULTIMATE_COMBO_BONUS,
              trigger: triggerUltimateParty,
            },
          ]);
        }
      } else if (isWrongAnswer) {
        triggerCellFeedback(row, col, 'wrong');
        if (comboCount > 0 || ultimateComboCount > 0) {
          triggerComboBreakEffect();
        }
        setComboCount(0);
        setUltimateComboCount(0);
        newUltimateComboCount = 0;
      }
    }

    if (!isBotBattle && featureSettings.mistakeCounting && newMistakes >= MAX_MISTAKES) {
      if (isProgressMode) {
        await clearBoardState(puzzle.id);
      }
      setIsFailed(true);
      return;
    }

    // Save offline games after every move so closing the app loses nothing.
    if (isProgressMode) {
      await saveBoardState(puzzle.id, {
        board: newBoard,
        notes: newNotes,
        undoStack: newUndoStack,
        seconds,
        mistakes: newMistakes,
        hintsUsed,
        score: newScore,
        completedLines: newCompletedLines,
        completedBoxes: newCompletedBoxes,
        ultimateComboCount: newUltimateComboCount,
      });
    }

    if (isBoardSolved(newBoard, puzzle.solution)) {
      if (isProgressMode) {
        await markPuzzleCompleted(puzzle.id);
        await clearBoardState(puzzle.id);
      }
      if (isBotBattle) {
        setBotResult('player');
      }
      setIsSolved(true);
    } else if (isBotBattle && isAnswerEntry && number !== 0) {
      takeBotTurn(botBoard);
    }
  }

  // ── Undo ──────────────────────────────────────────────────────
  async function handleUndo() {
    if (!featureSettings.undo) return;
    if (undoStack.length === 0) return;

    const lastMove     = undoStack[undoStack.length - 1];
    const newUndoStack = undoStack.slice(0, -1);
    const newBoard     = copyGrid(board);
    newBoard[lastMove.row][lastMove.col] = lastMove.prev;
    const newNotes = lastMove.prevNotesGrid
      ? copyNotes(lastMove.prevNotesGrid)
      : copyNotes(notes);
    if (!lastMove.prevNotesGrid) {
      newNotes[lastMove.row][lastMove.col] = lastMove.prevNotes ?? [];
    }

    setBoard(newBoard);
    setNotes(newNotes);
    setUndoStack(newUndoStack);
    setSelectedCell({ row: lastMove.row, col: lastMove.col });

    if (isProgressMode) {
      await saveBoardState(puzzle.id, {
        board: newBoard,
        notes: newNotes,
        undoStack: newUndoStack,
        seconds,
        mistakes,
        hintsUsed,
        score,
        completedLines,
        completedBoxes,
        ultimateComboCount,
      });
    }
  }

  // ── Loading screen ────────────────────────────────────────────
  if (!isLoaded) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading puzzle…</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Main render ───────────────────────────────────────────────
  return (
    <SafeAreaView style={[styles.safeArea, isDarkMode && styles.safeAreaDark]}>
      <View style={styles.screenBackground}>
      <View style={[styles.container, isDarkMode && styles.containerDark]}>

        {/* Header — title on the left, timer on the right */}
        <View style={styles.topControlsBand}>
        {isOnlineRace && (
          <View style={styles.raceBanner}>
            <Text style={styles.raceBannerTitle}>Race Room {roomCode}</Text>
            <Text style={styles.raceBannerText}>First full board wins</Text>
          </View>
        )}
        {isBotBattle && (
          <View style={styles.raceBanner}>
            <Text style={styles.raceBannerTitle}>{botProfile.name}</Text>
            <Text style={styles.raceBannerText}>
              You {playerFillCount}/81  Bot {botFillCount}/81
            </Text>
          </View>
        )}
        <View style={styles.header}>
          <View style={styles.headerInfo}>
            <Text style={[styles.heading, isDarkMode && styles.headingDark]}>{puzzle.title}</Text>
            <Text style={[styles.difficulty, isDarkMode && styles.subtleTextDark]}>{puzzle.difficulty}</Text>
            {isBotBattle ? (
              <Text style={styles.mistakeCounter}>
                {isBotThinking ? 'Bot thinking...' : 'Mistakes unlimited'}
              </Text>
            ) : featureSettings.mistakeCounting && (
              <Text style={styles.mistakeCounter}>
                Errors {mistakes}/{MAX_MISTAKES}
              </Text>
            )}
          </View>
          <Text style={styles.scoreText}>{score}</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.headerIconButton, isDarkMode && styles.controlDark]}
              onPress={() => router.replace('/')}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Go to home screen"
            >
              <Text style={styles.homeIconButtonText}>⌂</Text>
            </TouchableOpacity>
            <View style={[styles.timerBox, isDarkMode && styles.controlDark]}>
              <Text style={styles.timerText}>{formatTime(seconds)}</Text>
            </View>
            {featureSettings.pause && (
              <TouchableOpacity
                style={[styles.headerIconButton, isDarkMode && styles.controlDark]}
                onPress={() => setIsPaused(true)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Pause puzzle"
              >
                <Text style={styles.headerIconButtonText}>Ⅱ</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.headerIconButton, isDarkMode && styles.controlDark]}
              onPress={() => setIsSettingsOpen(true)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Open settings"
            >
              <Text style={styles.settingsButtonText}>⚙</Text>
            </TouchableOpacity>
          </View>
        </View>
        </View>

        {/* 9×9 grid */}
        <SudokuGrid
          puzzle={puzzle}
          board={board}
          notes={notes}
          backgroundSource={backgroundSource}
          revealedBackgroundCells={revealedBackgroundCells}
          selectedCell={selectedCell}
          isDarkMode={isDarkMode}
          cellFeedback={cellFeedback}
          cellFeedbackCombo={cellFeedbackCombo}
          lineClearFeedback={lineClearFeedback}
          correctCellAnim={correctCellAnim}
          wrongCellAnim={wrongCellAnim}
          lineClearAnim={lineClearAnim}
          onCellPress={handleCellPress}
        />

        <ComboEffects
          comboCount={comboDisplay}
          comboAnim={comboAnim}
          isComboBroken={isComboBroken}
          comboBreakAnim={comboBreakAnim}
          isMegaParty={isMegaParty}
          megaPartyAnim={megaPartyAnim}
          isUltimateParty={isUltimateParty}
          ultimatePartyAnim={ultimatePartyAnim}
          lineClearFeedback={lineClearFeedback}
          lineClearAnim={lineClearAnim}
          boxCompleteDisplay={boxCompleteDisplay}
          boxCompleteAnim={boxCompleteAnim}
        />

        <View style={styles.bottomControlsBand}>
          {/* Undo button */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[
                    styles.actionButton,
                    isDarkMode && styles.controlDark,
                    (!featureSettings.undo || undoStack.length === 0) && styles.actionButtonDisabled,
              ]}
              onPress={handleUndo}
              disabled={!featureSettings.undo || undoStack.length === 0}
              activeOpacity={0.7}
            >
              <Text style={styles.actionButtonIcon}>↩</Text>
              <Text style={[
                styles.actionButtonLabel,
                (!featureSettings.undo || undoStack.length === 0) && styles.actionButtonLabelDisabled,
              ]}>
                Undo
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.actionButton,
                isDarkMode && styles.controlDark,
                (!featureSettings.hints || !getHintCell()) && styles.actionButtonDisabled,
              ]}
              onPress={handleHintPress}
              disabled={!featureSettings.hints || !getHintCell()}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.actionButtonIcon,
                !featureSettings.hints && styles.actionButtonLabelDisabled,
              ]}>
                Hint
              </Text>
              <Text style={[
                styles.actionButtonLabel,
                !featureSettings.hints && styles.actionButtonLabelDisabled,
              ]}>
                {hintsUsed === 0 ? 'Free' : 'Ad'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                    styles.actionButton,
                    isDarkMode && styles.controlDark,
                    featureSettings.notes && isNoteMode && styles.actionButtonActive,
                !featureSettings.notes && styles.actionButtonDisabled,
              ]}
              onPress={() => {
                if (featureSettings.notes) {
                  setIsNoteMode((active) => !active);
                }
              }}
              disabled={!featureSettings.notes}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.actionButtonIcon,
                featureSettings.notes && isNoteMode && styles.actionButtonActiveText,
                !featureSettings.notes && styles.actionButtonLabelDisabled,
              ]}>
                Notes
              </Text>
              <Text style={[
                styles.actionButtonLabel,
                featureSettings.notes && isNoteMode && styles.actionButtonActiveText,
                !featureSettings.notes && styles.actionButtonLabelDisabled,
              ]}>
                {featureSettings.notes && isNoteMode ? 'On' : 'Off'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* 1–9 number pad + erase */}
          <NumberPad
            isNoteMode={isNoteMode}
            isNoteFeatureEnabled={featureSettings.notes}
            isDarkMode={isDarkMode}
            onNumberPress={handleNumberPress}
          />
        </View>

      </View>

      </View>

      {/* Win modal — appears on top when puzzle is solved */}
      <WinModal
        visible={isSolved && !isBotBattle}
        time={formatTime(seconds)}
        isRaceMode={isOnlineRace}
        onReveal={() => {
          if (isOnlineRace) {
            router.replace('/online');
          } else {
            router.replace(`/completion?id=${puzzle.id}`);
          }
        }}
      />

      <BotResultModal
        visible={isBotBattle && botResult !== null}
        didPlayerWin={botResult === 'player'}
        botName={botProfile.name}
        time={formatTime(seconds)}
        onRestart={restartCurrentPuzzle}
        onChooseBot={() => router.replace('/bot')}
      />

      <RacePrivacyShield visible={isOnlineRace && isRaceShielded && !isSolved && !isFailed} />

      <SettingsModal
        visible={isSettingsOpen}
        settings={featureSettings}
        isDarkMode={isDarkMode}
        onClose={() => setIsSettingsOpen(false)}
        onToggle={handleFeatureToggle}
      />

      <AdModal
        visible={isAdOpen}
        isDarkMode={isDarkMode}
        onCancel={() => setIsAdOpen(false)}
        onComplete={handleAdComplete}
      />

      <PauseModal
        visible={isPaused}
        time={formatTime(seconds)}
        isDarkMode={isDarkMode}
        onResume={() => setIsPaused(false)}
      />

      <FailedModal
        visible={isFailed && !isBotBattle}
        onRestart={restartCurrentPuzzle}
      />

    </SafeAreaView>
  );
}

// ─── Win Modal ───────────────────────────────────────────────────

function SettingsModal({
  visible,
  settings,
  isDarkMode,
  onClose,
  onToggle,
}) {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.settingsCard, isDarkMode && styles.settingsCardDark]}>
          <View style={styles.settingsHeader}>
            <Text style={[styles.settingsTitle, isDarkMode && styles.headingDark]}>Settings</Text>
            <TouchableOpacity
              style={[styles.settingsCloseButton, isDarkMode && styles.settingsCloseButtonDark]}
              onPress={onClose}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Close settings"
            >
              <Text style={[styles.settingsCloseText, isDarkMode && styles.subtleTextDark]}>X</Text>
            </TouchableOpacity>
          </View>

          <FeatureToggle
            label="Notes"
            value={settings.notes}
            isDarkMode={isDarkMode}
            onValueChange={(value) => onToggle('notes', value)}
          />
          <FeatureToggle
            label="Undo"
            value={settings.undo}
            isDarkMode={isDarkMode}
            onValueChange={(value) => onToggle('undo', value)}
          />
          <FeatureToggle
            label="Pause timer"
            value={settings.pause}
            isDarkMode={isDarkMode}
            onValueChange={(value) => onToggle('pause', value)}
          />
          <FeatureToggle
            label="Hints"
            value={settings.hints}
            isDarkMode={isDarkMode}
            onValueChange={(value) => onToggle('hints', value)}
          />
          <FeatureToggle
            label="Mistake counting"
            value={settings.mistakeCounting}
            isDarkMode={isDarkMode}
            onValueChange={(value) => onToggle('mistakeCounting', value)}
          />
          <FeatureToggle
            label="Lock correct answers"
            value={settings.lockCorrect}
            isDarkMode={isDarkMode}
            onValueChange={(value) => onToggle('lockCorrect', value)}
          />
          <FeatureToggle
            label="Dark mode"
            value={settings.darkMode}
            isDarkMode={isDarkMode}
            onValueChange={(value) => onToggle('darkMode', value)}
          />
        </View>
      </View>
    </Modal>
  );
}

function FeatureToggle({ label, value, isDarkMode, onValueChange }) {
  return (
    <View style={[styles.settingsRow, isDarkMode && styles.settingsRowDark]}>
      <Text style={[styles.settingsRowLabel, isDarkMode && styles.headingDark]}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#dee2e6', true: '#c8d0f5' }}
        thumbColor={value ? '#4361ee' : '#ffffff'}
      />
    </View>
  );
}

function ComboEffects({
  comboCount,
  comboAnim,
  isComboBroken,
  comboBreakAnim,
  isMegaParty,
  megaPartyAnim,
  isUltimateParty,
  ultimatePartyAnim,
  lineClearFeedback,
  lineClearAnim,
  boxCompleteDisplay,
  boxCompleteAnim,
}) {
  const comboInfo = comboCount;
  const comboNumber = comboInfo?.count ?? null;
  const comboOpacity = comboAnim.interpolate({
    inputRange: [0, 0.15, 0.78, 1],
    outputRange: [0, 1, 1, 0],
  });
  const comboScale = comboAnim.interpolate({
    inputRange: [0, 0.18, 1],
    outputRange: [0.72, 1.08, 1.24],
  });
  const breakOpacity = comboBreakAnim.interpolate({
    inputRange: [0, 0.2, 1],
    outputRange: [0, 0.92, 0],
  });
  const breakScale = comboBreakAnim.interpolate({
    inputRange: [0, 0.18, 1],
    outputRange: [0.9, 1.03, 1.14],
  });
  const partyOpacity = megaPartyAnim.interpolate({
    inputRange: [0, 0.08, 0.9, 1],
    outputRange: [0, 1, 1, 0],
  });
  const partyScale = megaPartyAnim.interpolate({
    inputRange: [0, 0.2, 1],
    outputRange: [0.72, 1.1, 1.18],
  });
  const lineOpacity = lineClearAnim.interpolate({
    inputRange: [0, 0.12, 0.82, 1],
    outputRange: [0, 1, 1, 0],
  });
  const lineScale = lineClearAnim.interpolate({
    inputRange: [0, 0.2, 1],
    outputRange: [0.78, 1.08, 1.12],
  });
  const boxCompleteOpacity = boxCompleteAnim.interpolate({
    inputRange: [0, 0.12, 0.86, 1],
    outputRange: [0, 1, 1, 0],
  });
  const boxCompleteScale = boxCompleteAnim.interpolate({
    inputRange: [0, 0.18, 1],
    outputRange: [0.7, 1.16, 1.22],
  });
  const ultimateOpacity = ultimatePartyAnim.interpolate({
    inputRange: [0, 0.06, 0.92, 1],
    outputRange: [0, 1, 1, 0],
  });
  const ultimateScale = ultimatePartyAnim.interpolate({
    inputRange: [0, 0.18, 0.62, 1],
    outputRange: [0.48, 1.24, 1.02, 1.2],
  });
  const ultimateRingScale = ultimatePartyAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 3.2],
  });

  return (
    <View pointerEvents="none" style={styles.fxLayer}>
      {lineClearFeedback !== null && (
        <Animated.View
          style={[
            styles.lineClearBadge,
            {
              opacity: lineOpacity,
              transform: [{ scale: lineScale }],
            },
          ]}
        >
          <Text style={styles.lineClearTitle}>Line Clear</Text>
          <Text style={styles.lineClearPoints}>+{lineClearFeedback.bonusPoints}</Text>
        </Animated.View>
      )}

      {isMegaParty && (
        <Animated.View
          style={[
            styles.megaPartyBadge,
            {
              opacity: partyOpacity,
              transform: [{ scale: partyScale }],
            },
          ]}
        >
          <Text style={styles.megaPartyTitle}>Mega Combo</Text>
          <Text style={styles.megaPartyPoints}>+{MEGA_COMBO_BONUS}</Text>
        </Animated.View>
      )}

      {isMegaParty && CONFETTI_PIECES.map((piece, index) => {
        const confettiX = megaPartyAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, piece.x],
        });
        const confettiY = megaPartyAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [piece.y, piece.fall],
        });
        const rotate = megaPartyAnim.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', `${piece.rotate}deg`],
        });

        return (
          <Animated.View
            key={index}
            style={[
              styles.confettiPiece,
              {
                backgroundColor: piece.color,
                opacity: partyOpacity,
                transform: [
                  { translateX: confettiX },
                  { translateY: confettiY },
                  { rotate },
                ],
              },
            ]}
          />
        );
      })}

      {boxCompleteDisplay !== null && (
        <Animated.View
          style={[
            styles.boxCompleteBadge,
            {
              opacity: boxCompleteOpacity,
              transform: [{ scale: boxCompleteScale }],
            },
          ]}
        >
          <Text style={styles.boxCompleteTitle}>Box {boxCompleteDisplay.boxNumber}</Text>
        </Animated.View>
      )}

      {isUltimateParty && (
        <Animated.View
          style={[
            styles.ultimateShockwave,
            {
              opacity: ultimateOpacity,
              transform: [{ scale: ultimateRingScale }],
            },
          ]}
        />
      )}

      {isUltimateParty && (
        <Animated.View
          style={[
            styles.ultimatePartyBadge,
            {
              opacity: ultimateOpacity,
              transform: [{ scale: ultimateScale }],
            },
          ]}
        >
          <Text style={styles.ultimatePartyKicker}>15 Square Streak</Text>
          <Text style={styles.ultimatePartyTitle}>Ultimate Combo</Text>
          <Text style={styles.ultimatePartyPoints}>+{ULTIMATE_COMBO_BONUS}</Text>
        </Animated.View>
      )}

      {isUltimateParty && ULTIMATE_CONFETTI_PIECES.map((piece, index) => {
        const confettiX = ultimatePartyAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, piece.x],
        });
        const confettiY = ultimatePartyAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [piece.y, piece.fall],
        });
        const rotate = ultimatePartyAnim.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', `${piece.rotate}deg`],
        });

        return (
          <Animated.View
            key={`ultimate-${index}`}
            style={[
              styles.ultimateConfettiPiece,
              {
                backgroundColor: piece.color,
                opacity: ultimateOpacity,
                transform: [
                  { translateX: confettiX },
                  { translateY: confettiY },
                  { rotate },
                ],
              },
            ]}
          />
        );
      })}

      {comboInfo !== null && (
        <Animated.View
          style={[
            styles.comboBadge,
            {
              opacity: comboOpacity,
              transform: [{ scale: comboScale }],
            },
          ]}
        >
          <Text style={styles.comboBadgeText}>{comboNumber}x Combo</Text>
          <Text style={styles.comboPointsText}>+{comboInfo.pointsEarned}</Text>
          {comboInfo.megaBonus > 0 && (
            <Text style={styles.megaBonusText}>Mega Bonus +{comboInfo.megaBonus}</Text>
          )}
        </Animated.View>
      )}

      {comboInfo !== null && COMBO_BLOCKS.map((block, index) => {
        const travelX = comboAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, block.x],
        });
        const travelY = comboAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, block.y],
        });
        const rotate = comboAnim.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', `${index % 2 === 0 ? 145 : -145}deg`],
        });

        return (
          <Animated.View
            key={`${block.color}-${index}`}
            style={[
              styles.comboBlock,
              {
                backgroundColor: block.color,
                opacity: comboOpacity,
                transform: [
                  { translateX: travelX },
                  { translateY: travelY },
                  { rotate },
                  { scale: comboScale },
                ],
              },
            ]}
          />
        );
      })}

      {isComboBroken && (
        <Animated.View
          style={[
            styles.comboBreakPulse,
            {
              opacity: breakOpacity,
              transform: [{ scale: breakScale }],
            },
          ]}
        >
          <Text style={styles.comboBreakText}>Combo Lost</Text>
        </Animated.View>
      )}
    </View>
  );
}

function AdModal({ visible, isDarkMode, onCancel, onComplete }) {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.adCard, isDarkMode && styles.settingsCardDark]}>
          <Text style={[styles.adTitle, isDarkMode && styles.headingDark]}>Watch Ad</Text>
          <Text style={[styles.adSubtitle, isDarkMode && styles.subtleTextDark]}>
            Watch a short ad to unlock another hint.
          </Text>

          <View style={[styles.adPreview, isDarkMode && styles.adPreviewDark]}>
            <Text style={styles.adPreviewText}>Ad</Text>
          </View>

          <TouchableOpacity
            style={styles.adPrimaryButton}
            onPress={onComplete}
            activeOpacity={0.85}
          >
            <Text style={styles.adPrimaryButtonText}>Finish Ad</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.adCancelButton}
            onPress={onCancel}
            activeOpacity={0.7}
          >
            <Text style={[styles.adCancelButtonText, isDarkMode && styles.subtleTextDark]}>
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function PauseModal({ visible, time, isDarkMode, onResume }) {
  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      onRequestClose={onResume}
    >
      <SafeAreaView style={[styles.pauseScreen, isDarkMode && styles.pauseScreenDark]}>
        <View style={styles.pauseContent}>
          <Text style={styles.pauseTitle}>Paused</Text>
          <Text style={styles.pauseTime}>{time}</Text>
          <TouchableOpacity
            style={styles.resumeButton}
            onPress={onResume}
            activeOpacity={0.8}
          >
            <Text style={styles.resumeButtonText}>Resume</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

function FailedModal({ visible, onRestart }) {
  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      onRequestClose={onRestart}
    >
      <SafeAreaView style={styles.failedScreen}>
        <View style={styles.failedContent}>
          <Text style={styles.failedTitle}>You Failed</Text>
          <Text style={styles.failedSubtitle}>Three mistakes ends the attempt.</Text>
          <TouchableOpacity
            style={styles.failedRestartButton}
            onPress={onRestart}
            activeOpacity={0.85}
          >
            <Text style={styles.failedRestartButtonText}>Restart Puzzle</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

function WinModal({ visible, time, isRaceMode, onReveal }) {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>

          <Text style={styles.modalEmoji}>{isRaceMode ? '🏁' : '🎉'}</Text>
          <Text style={styles.modalTitle}>{isRaceMode ? 'You Won!' : 'Puzzle Solved!'}</Text>
          <Text style={styles.modalTime}>{isRaceMode ? `Winning time ${time}` : `Completed in ${time}`}</Text>
          <Text style={styles.modalSubtitle}>
            {isRaceMode
              ? 'First complete board takes the race.'
              : "You've unlocked a hidden image reward."}
          </Text>

          <TouchableOpacity
            style={styles.revealButton}
            onPress={onReveal}
            activeOpacity={0.8}
          >
            <Text style={styles.revealButtonText}>{isRaceMode ? 'Race Again' : 'Reveal Reward →'}</Text>
          </TouchableOpacity>

        </View>
      </View>
    </Modal>
  );
}

// ─── Grid ────────────────────────────────────────────────────────

function SudokuGrid({
  puzzle,
  board,
  notes,
  backgroundSource,
  revealedBackgroundCells,
  selectedCell,
  isDarkMode,
  cellFeedback,
  cellFeedbackCombo,
  lineClearFeedback,
  correctCellAnim,
  wrongCellAnim,
  lineClearAnim,
  onCellPress,
}) {
  const { width } = useWindowDimensions();
  const gridSize  = width - 32;
  const cellSize  = gridSize / 9;
  const revealedCellSet = new Set(revealedBackgroundCells);

  const selectedValue =
    selectedCell !== null ? board[selectedCell.row][selectedCell.col] : 0;
  const GridFrame = backgroundSource ? ImageBackground : View;
  const gridFrameProps = backgroundSource
    ? {
        source: backgroundSource,
        resizeMode: 'cover',
        imageStyle: styles.gridBackgroundImage,
      }
    : {};

  return (
    <GridFrame
      {...gridFrameProps}
      style={[
      styles.grid,
      isDarkMode && styles.gridDark,
      { width: gridSize, height: gridSize },
    ]}>
      {board.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {row.map((value, colIndex) => {
            const isGiven = puzzle.given[rowIndex][colIndex] !== 0;

            const isSelected =
              selectedCell?.row === rowIndex &&
              selectedCell?.col === colIndex;

            // Highlight cells in the same row, column, OR 3×3 box
            const isPeer =
              selectedCell !== null &&
              (
                selectedCell.row === rowIndex ||
                selectedCell.col === colIndex ||
                (
                  Math.floor(selectedCell.row / 3) === Math.floor(rowIndex / 3) &&
                  Math.floor(selectedCell.col / 3) === Math.floor(colIndex / 3)
                )
              ) &&
              !isSelected;

            // Highlight cells that share the same number as selected
            const isSameNumber =
              value !== 0 &&
              selectedValue !== 0 &&
              value === selectedValue &&
              !isSelected;

            // Red if the number is wrong
            const isMistake =
              !isGiven &&
              value !== 0 &&
              (
                hasConflict(board, rowIndex, colIndex) ||
                value !== puzzle.solution[rowIndex][colIndex]
              );
            const feedbackType =
              cellFeedback?.row === rowIndex && cellFeedback?.col === colIndex
                ? cellFeedback.type
                : null;
            const isBackgroundRevealed = revealedCellSet.has(`${rowIndex}-${colIndex}`);
            const lineFlashPosition = lineClearFeedback
              ? lineClearFeedback.lines.reduce((position, line) => {
                  if (line.type === 'row' && line.index === rowIndex) {
                    return Math.min(position, colIndex);
                  }
                  if (line.type === 'col' && line.index === colIndex) {
                    return Math.min(position, rowIndex);
                  }
                  return position;
                }, 99)
              : null;

            return (
              <SudokuCell
                key={colIndex}
                value={value}
                notes={notes[rowIndex][colIndex]}
                cellSize={cellSize}
                rowIndex={rowIndex}
                colIndex={colIndex}
                isGiven={isGiven}
                isSelected={isSelected}
                isPeer={isPeer}
                isSameNumber={isSameNumber}
                isMistake={isMistake}
                isBackgroundRevealed={isBackgroundRevealed}
                isDarkMode={isDarkMode}
                feedbackType={feedbackType}
                feedbackCombo={cellFeedbackCombo}
                lineFlashPosition={lineFlashPosition === 99 ? null : lineFlashPosition}
                correctCellAnim={correctCellAnim}
                wrongCellAnim={wrongCellAnim}
                lineClearAnim={lineClearAnim}
                onPress={() => onCellPress(rowIndex, colIndex)}
              />
            );
          })}
        </View>
      ))}
    </GridFrame>
  );
}

function RacePrivacyShield({ visible }) {
  if (!visible) return null;

  return (
    <View pointerEvents="auto" style={styles.racePrivacyShield}>
      <Text style={styles.racePrivacyTitle}>Race Shield Active</Text>
      <Text style={styles.racePrivacyText}>Return to the game window to show the board.</Text>
    </View>
  );
}

function BotResultModal({ visible, didPlayerWin, botName, time, onRestart, onChooseBot }) {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <Text style={styles.modalEmoji}>{didPlayerWin ? '🏆' : '🤖'}</Text>
          <Text style={styles.modalTitle}>{didPlayerWin ? 'You Beat the Bot!' : `${botName} Won`}</Text>
          <Text style={styles.modalTime}>Time {time}</Text>
          <Text style={styles.modalSubtitle}>
            {didPlayerWin
              ? 'First full board wins. Nice turn-based solve.'
              : 'The bot completed its board first. Run it back.'}
          </Text>

          <TouchableOpacity
            style={styles.revealButton}
            onPress={onRestart}
            activeOpacity={0.8}
          >
            <Text style={styles.revealButtonText}>Rematch</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.botChooseButton}
            onPress={onChooseBot}
            activeOpacity={0.75}
          >
            <Text style={styles.botChooseButtonText}>Choose Bot</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Cell ────────────────────────────────────────────────────────

function SudokuCell({
  value, notes, cellSize, rowIndex, colIndex,
  isGiven, isSelected, isPeer, isSameNumber, isMistake, isDarkMode,
  isBackgroundRevealed,
  feedbackType, feedbackCombo, lineFlashPosition,
  correctCellAnim, wrongCellAnim, lineClearAnim, onPress,
}) {
  const borderRight  = colIndex === 8 ? 2 : colIndex % 3 === 2 ? 2 : 0.5;
  const borderBottom = rowIndex === 8 ? 2 : rowIndex % 3 === 2 ? 2 : 0.5;
  const borderLeft   = colIndex === 0 ? 2 : 0;
  const borderTop    = rowIndex === 0 ? 2 : 0;

  // Background: selected > mistake > same number > peer > plain white
  let backgroundColor = isDarkMode ? '#111827' : '#ffffff';
  if (isSelected)        backgroundColor = '#4361ee';
  else if (isMistake)    backgroundColor = isDarkMode ? '#4a1016' : '#fde8e8';
  else if (isSameNumber) backgroundColor = isDarkMode ? '#273566' : '#c8d0f5';
  else if (isPeer)       backgroundColor = isDarkMode ? '#1f2937' : '#eef0fb';
  if (isBackgroundRevealed) backgroundColor = isSelected ? 'rgba(67,97,238,0.44)' : 'transparent';

  // Text colour: mistake = red, user entry = blue, given = dark, selected = white
  let textColor = isDarkMode ? '#f8f9fa' : '#1a1a2e';
  if (isMistake)              textColor = '#e63946';
  if (!isGiven && !isMistake) textColor = '#4361ee';
  if (isBackgroundRevealed)   textColor = '#ffffff';
  if (isSelected)             textColor = '#ffffff';
  const comboScaleBoost = Math.min(0.45, Math.max(0, (feedbackCombo - 1) * 0.045));
  const correctScale = correctCellAnim.interpolate({
    inputRange: [0, 0.45, 1],
    outputRange: [1, 1.12 + comboScaleBoost, 1],
  });
  const correctOpacity = correctCellAnim.interpolate({
    inputRange: [0, 0.2, 1],
    outputRange: [0, 1, 0],
  });
  const wrongFall = wrongCellAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, cellSize * 0.7],
  });
  const wrongOpacity = wrongCellAnim.interpolate({
    inputRange: [0, 0.18, 1],
    outputRange: [0, 1, 0],
  });
  const wrongScale = wrongCellAnim.interpolate({
    inputRange: [0, 0.2, 1],
    outputRange: [1, 1.03, 0.88],
  });
  const hasLineFlash = typeof lineFlashPosition === 'number';
  const lineDelay = hasLineFlash ? 0.03 + lineFlashPosition * 0.07 : 0.03;
  const lineFlashOpacity = lineClearAnim.interpolate({
    inputRange: [0, lineDelay, Math.min(lineDelay + 0.16, 0.96), Math.min(lineDelay + 0.48, 1)],
    outputRange: [0, 0, 1, 0],
    extrapolate: 'clamp',
  });
  const lineFlashScale = lineClearAnim.interpolate({
    inputRange: [0, lineDelay, Math.min(lineDelay + 0.16, 0.96), 1],
    outputRange: [1, 1, 1.1, 1],
    extrapolate: 'clamp',
  });

  return (
    <TouchableOpacity
      style={[
        styles.cell,
        {
          width: cellSize,
          height: cellSize,
          borderRightWidth: borderRight,
          borderBottomWidth: borderBottom,
          borderLeftWidth: borderLeft,
          borderTopWidth: borderTop,
          backgroundColor,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {isBackgroundRevealed && <View pointerEvents="none" style={styles.revealedCellShade} />}
      {hasLineFlash && (
        <Animated.View
          style={[
            styles.lineCellFlash,
            {
              opacity: lineFlashOpacity,
              transform: [{ scale: lineFlashScale }],
            },
          ]}
        />
      )}
      {feedbackType === 'correct' && (
        <Animated.View
          style={[
            styles.correctCellFlash,
            {
              opacity: correctOpacity,
              transform: [{ scale: correctScale }],
            },
          ]}
        />
      )}
      <Animated.View
        style={[
          styles.cellContent,
          feedbackType === 'correct' && { transform: [{ scale: correctScale }] },
          feedbackType === 'wrong' && {
            opacity: wrongCellAnim.interpolate({
              inputRange: [0, 0.35, 1],
              outputRange: [1, 0.45, 1],
            }),
            transform: [{ scale: wrongScale }],
          },
        ]}
      >
        {value !== 0 && (
          <Text style={[
            styles.cellText,
            {
              fontSize: cellSize * 0.48,
              color: textColor,
              fontWeight: isGiven ? '600' : '400',
            },
            isBackgroundRevealed && styles.revealedCellText,
          ]}>
            {value}
          </Text>
        )}
        {value === 0 && notes.length > 0 && (
          <View style={styles.notesGrid}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((note) => (
              <Text
                key={note}
                style={[
                  styles.noteText,
                  {
                    fontSize: cellSize * 0.18,
                    color: isSelected ? '#ffffff' : isDarkMode ? '#adb5bd' : '#6c757d',
                  },
                ]}
              >
                {notes.includes(note) ? note : ''}
              </Text>
            ))}
          </View>
        )}
      </Animated.View>
      {feedbackType === 'wrong' && ASH_BLOCKS.map((ash, index) => {
        const ashX = wrongCellAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, ash.x],
        });
        const ashRotate = wrongCellAnim.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', `${ash.rotate}deg`],
        });

        return (
          <Animated.View
            key={index}
            style={[
              styles.ashBlock,
              {
                width: cellSize * 0.18,
                height: cellSize * 0.18,
                opacity: wrongOpacity,
                transform: [
                  { translateX: ashX },
                  { translateY: wrongFall },
                  { rotate: ashRotate },
                  { scale: wrongScale },
                ],
              },
            ]}
          />
        );
      })}
    </TouchableOpacity>
  );
}

// ─── Number Pad ──────────────────────────────────────────────────

function NumberPad({ isNoteMode, isNoteFeatureEnabled, isDarkMode, onNumberPress }) {
  return (
    <View style={styles.padContainer}>
      {isNoteFeatureEnabled && (
        <Text style={[styles.padModeText, isDarkMode && styles.subtleTextDark]}>
          {isNoteMode ? 'Adding notes' : 'Entering answers'}
        </Text>
      )}

      <View style={styles.padRow}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <TouchableOpacity
            key={n}
            style={[styles.padButton, isDarkMode && styles.controlDark]}
            onPress={() => onNumberPress(n)}
            activeOpacity={0.7}
          >
            <Text style={[styles.padButtonText, isDarkMode && styles.headingDark]}>{n}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.eraseButton, isDarkMode && styles.controlDark]}
        onPress={() => onNumberPress(0)}
        activeOpacity={0.7}
      >
        <Text style={styles.eraseButtonText}>⌫  Erase</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#000000' },
  safeAreaDark: { backgroundColor: '#000000' },
  screenBackground: { flex: 1, backgroundColor: '#000000' },
  container: { flex: 1, alignItems: 'center', paddingTop: 10, zIndex: 2 },
  containerDark: {},

  // Loading
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontSize: 16, color: '#6c757d' },

  // Header
  topControlsBand: {
    width: '100%',
    backgroundColor: '#000000',
  },
  bottomControlsBand: {
    width: '100%',
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    width: '100%',
    paddingHorizontal: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 12,
    minHeight: 92,
    paddingTop: 42,
  },
  raceBanner: {
    marginHorizontal: 14,
    marginTop: 8,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#061b16',
    borderWidth: 1,
    borderColor: '#06d6a0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  raceBannerTitle: {
    color: '#06d6a0',
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  raceBannerText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  headerInfo: {
    maxWidth: '38%',
    zIndex: 2,
  },
  heading: { fontSize: 20, fontWeight: '900', color: '#ffffff' },
  headingDark: { color: '#f8f9fa' },
  subtleTextDark: { color: '#d1d5db' },
  difficulty: {
    fontSize: 11, color: '#d1d5db',
    textTransform: 'uppercase', letterSpacing: 1.2, marginTop: 2,
  },
  mistakeCounter: {
    fontSize: 12,
    color: '#e63946',
    fontWeight: '700',
    marginTop: 4,
  },
  scoreText: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    textAlign: 'center',
    fontSize: 36,
    color: '#188f7f',
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 2,
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  settingsButtonText: {
    fontSize: 22,
    color: '#4361ee',
    lineHeight: 24,
  },
  headerIconButton: {
    minWidth: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  headerIconButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4361ee',
  },
  controlDark: {
    backgroundColor: '#1f2937',
    shadowOpacity: 0,
  },
  homeIconButtonText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#4361ee',
    lineHeight: 28,
  },

  // Timer
  timerBox: {
    backgroundColor: '#111827',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  timerText: {
    fontSize: 19,
    fontWeight: '800',
    color: '#4361ee',
    fontVariant: ['tabular-nums'],
    letterSpacing: 1,
  },

  // Grid
  grid: {
    backgroundColor: '#ffffff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    overflow: 'hidden',
  },
  gridBackgroundImage: { opacity: 1 },
  gridDark: {
    backgroundColor: '#111827',
    shadowOpacity: 0,
  },
  fxLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 116,
    height: 360,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 8,
  },
  comboBadge: {
    position: 'absolute',
    backgroundColor: '#1a1a2e',
    borderRadius: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderWidth: 3,
    borderColor: '#ffd166',
  },
  comboBadgeText: {
    color: '#ffffff',
    fontSize: 21,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  comboPointsText: {
    color: '#ffd166',
    fontSize: 17,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: 2,
  },
  megaBonusText: {
    color: '#06d6a0',
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  comboBlock: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 5,
  },
  comboBreakPulse: {
    position: 'absolute',
    backgroundColor: '#e63946',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  comboBreakText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  lineClearBadge: {
    position: 'absolute',
    top: 42,
    backgroundColor: '#063b2f',
    borderRadius: 10,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderWidth: 3,
    borderColor: '#57cc99',
    zIndex: 10,
  },
  lineClearTitle: {
    color: '#ffffff',
    fontSize: 19,
    fontWeight: '900',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  lineClearPoints: {
    color: '#57cc99',
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: 2,
  },
  boxCompleteBadge: {
    position: 'absolute',
    top: 154,
    backgroundColor: '#001d3d',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderWidth: 4,
    borderColor: '#4cc9f0',
    zIndex: 13,
  },
  boxCompleteTitle: {
    color: '#ffffff',
    fontSize: 26,
    fontWeight: '900',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  megaPartyBadge: {
    position: 'absolute',
    top: 72,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingHorizontal: 30,
    paddingVertical: 18,
    borderWidth: 5,
    borderColor: '#ffd166',
    zIndex: 12,
  },
  megaPartyTitle: {
    color: '#f72585',
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  megaPartyPoints: {
    color: '#4361ee',
    fontSize: 26,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: 2,
  },
  confettiPiece: {
    position: 'absolute',
    top: 94,
    width: 12,
    height: 26,
    borderRadius: 3,
    zIndex: 11,
  },
  ultimateShockwave: {
    position: 'absolute',
    top: 134,
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 8,
    borderColor: '#ffbe0b',
    backgroundColor: 'rgba(255, 0, 110, 0.18)',
    zIndex: 14,
  },
  ultimatePartyBadge: {
    position: 'absolute',
    top: 54,
    backgroundColor: '#14002e',
    borderRadius: 18,
    paddingHorizontal: 32,
    paddingVertical: 20,
    borderWidth: 6,
    borderColor: '#ffbe0b',
    zIndex: 16,
  },
  ultimatePartyKicker: {
    color: '#06d6a0',
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'center',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  ultimatePartyTitle: {
    color: '#ffffff',
    fontSize: 30,
    fontWeight: '900',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  ultimatePartyPoints: {
    color: '#ffbe0b',
    fontSize: 30,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: 2,
  },
  ultimateConfettiPiece: {
    position: 'absolute',
    top: 86,
    width: 14,
    height: 30,
    borderRadius: 4,
    zIndex: 15,
  },
  row: { flexDirection: 'row' },
  cell: {
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: '#111827',
    overflow: 'visible',
  },
  revealedCellShade: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(0,0,0,0.24)',
  },
  cellContent: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  correctCellFlash: {
    position: 'absolute',
    top: 1,
    right: 1,
    bottom: 1,
    left: 1,
    borderRadius: 8,
    backgroundColor: '#57cc99',
    borderWidth: 2,
    borderColor: '#b7ffd8',
  },
  lineCellFlash: {
    position: 'absolute',
    top: 1,
    right: 1,
    bottom: 1,
    left: 1,
    borderRadius: 8,
    backgroundColor: '#57cc99',
    borderWidth: 2,
    borderColor: '#d8ffe7',
  },
  ashBlock: {
    position: 'absolute',
    borderRadius: 3,
    backgroundColor: '#555555',
  },
  cellText: { textAlign: 'center' },
  revealedCellText: {
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  notesGrid: {
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignContent: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  noteText: {
    width: '33.333%',
    height: '33.333%',
    textAlign: 'center',
    fontWeight: '600',
  },

  // Undo button row
  actionRow: {
    flexDirection: 'row',
    width: '100%',
    paddingHorizontal: 14,
    paddingTop: 14,
    justifyContent: 'space-between',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111827',
    paddingVertical: 11,
    paddingHorizontal: 10,
    borderRadius: 12,
    gap: 6,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  actionButtonDisabled: {
    backgroundColor: '#1f2937',
    elevation: 0,
  },
  actionButtonActive: {
    backgroundColor: '#4361ee',
  },
  actionButtonIcon: { fontSize: 16, color: '#4361ee', fontWeight: '800' },
  actionButtonLabel: { fontSize: 13, fontWeight: '800', color: '#4361ee' },
  actionButtonLabelDisabled: { color: '#adb5bd' },
  actionButtonActiveText: { color: '#ffffff' },

  // Number pad
  padContainer: {
    width: '100%',
    paddingHorizontal: 14,
    paddingTop: 10,
    alignItems: 'center',
  },
  padModeText: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 7,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  padRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 12,
  },
  padButton: {
    flex: 1,
    marginHorizontal: 2,
    paddingVertical: 13,
    backgroundColor: '#111827',
    borderRadius: 9,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  padButtonText: { fontSize: 20, fontWeight: '800', color: '#ffffff' },
  eraseButton: {
    paddingVertical: 14,
    paddingHorizontal: 40,
    backgroundColor: '#111827',
    borderRadius: 9,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  eraseButtonText: { fontSize: 15, fontWeight: '800', color: '#e63946' },

  // Win modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 36,
    alignItems: 'center',
    width: '80%',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  racePrivacyShield: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 100,
    backgroundColor: '#020617',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  racePrivacyTitle: {
    color: '#06d6a0',
    fontSize: 30,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 10,
  },
  racePrivacyText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 23,
  },
  settingsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 22,
    width: '82%',
    maxWidth: 360,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  settingsCardDark: {
    backgroundColor: '#111827',
  },
  settingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  settingsTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  settingsCloseButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f3f5',
  },
  settingsCloseButtonDark: {
    backgroundColor: '#1f2937',
  },
  settingsCloseText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#6c757d',
  },
  settingsRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  settingsRowDark: {
    borderTopColor: '#334155',
  },
  settingsRowLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a2e',
  },
  adCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 24,
    width: '82%',
    maxWidth: 360,
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  adTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1a1a2e',
    marginBottom: 8,
  },
  adSubtitle: {
    fontSize: 15,
    color: '#6c757d',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 18,
  },
  adPreview: {
    width: '100%',
    height: 110,
    borderRadius: 10,
    backgroundColor: '#eef0fb',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  adPreviewDark: {
    backgroundColor: '#1f2937',
  },
  adPreviewText: {
    fontSize: 30,
    fontWeight: '900',
    color: '#4361ee',
    textTransform: 'uppercase',
  },
  adPrimaryButton: {
    width: '100%',
    backgroundColor: '#4361ee',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  adPrimaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  adCancelButton: {
    paddingTop: 16,
  },
  adCancelButtonText: {
    color: '#6c757d',
    fontSize: 15,
    fontWeight: '700',
  },
  modalEmoji: { fontSize: 56, marginBottom: 12 },
  modalTitle: { fontSize: 26, fontWeight: 'bold', color: '#1a1a2e', marginBottom: 4 },
  modalTime: { fontSize: 15, color: '#4361ee', fontWeight: '600', marginBottom: 8 },
  modalSubtitle: {
    fontSize: 15,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 22,
  },
  revealButton: {
    backgroundColor: '#4361ee',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
  },
  revealButtonText: { color: '#ffffff', fontSize: 17, fontWeight: 'bold' },
  botChooseButton: {
    paddingTop: 16,
  },
  botChooseButtonText: {
    color: '#4361ee',
    fontSize: 15,
    fontWeight: '800',
  },
  pauseScreen: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  pauseScreenDark: {
    backgroundColor: '#020617',
  },
  pauseContent: {
    width: '100%',
    alignItems: 'center',
  },
  pauseTitle: {
    fontSize: 34,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 10,
  },
  pauseTime: {
    fontSize: 24,
    fontWeight: '700',
    color: '#c8d0f5',
    fontVariant: ['tabular-nums'],
    marginBottom: 28,
  },
  resumeButton: {
    backgroundColor: '#ffffff',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 14,
    alignItems: 'center',
  },
  resumeButtonText: {
    color: '#4361ee',
    fontSize: 17,
    fontWeight: '800',
  },
  failedScreen: {
    flex: 1,
    backgroundColor: '#ff1f1f',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  failedContent: {
    width: '100%',
    alignItems: 'center',
  },
  failedTitle: {
    fontSize: 42,
    fontWeight: '900',
    color: '#ffffff',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  failedSubtitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 30,
    textAlign: 'center',
  },
  failedRestartButton: {
    backgroundColor: '#ffffff',
    paddingVertical: 16,
    paddingHorizontal: 36,
    borderRadius: 14,
    alignItems: 'center',
  },
  failedRestartButtonText: {
    color: '#d90429',
    fontSize: 17,
    fontWeight: '900',
  },
});
