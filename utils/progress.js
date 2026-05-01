import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Completed puzzle list ────────────────────────────────────────

const COMPLETED_KEY = 'completed_puzzles';

export async function loadCompletedPuzzles() {
  try {
    const json = await AsyncStorage.getItem(COMPLETED_KEY);
    if (json === null) return [];
    return JSON.parse(json);
  } catch (error) {
    console.error('Failed to load progress:', error);
    return [];
  }
}

export async function markPuzzleCompleted(puzzleId) {
  try {
    const completed = await loadCompletedPuzzles();
    if (!completed.includes(puzzleId)) {
      completed.push(puzzleId);
      await AsyncStorage.setItem(COMPLETED_KEY, JSON.stringify(completed));
    }
  } catch (error) {
    console.error('Failed to save progress:', error);
  }
}

export async function resetAllProgress() {
  try {
    // Remove completed list AND every saved board state
    const keys = await AsyncStorage.getAllKeys();
    const boardKeys = keys.filter((k) => k.startsWith('board_state_'));
    await AsyncStorage.multiRemove([COMPLETED_KEY, ...boardKeys]);
  } catch (error) {
    console.error('Failed to reset progress:', error);
  }
}

// ─── Mid-puzzle board state ───────────────────────────────────────
//
// Each puzzle gets its own save slot keyed by puzzle ID.
// We save: the current board, the undo stack, and elapsed seconds.
// This means closing the app mid-solve loses nothing.

function boardKey(puzzleId) {
  return `board_state_${puzzleId}`;
}

// Call this after every move
export async function saveBoardState(puzzleId, state) {
  try {
    await AsyncStorage.setItem(boardKey(puzzleId), JSON.stringify(state));
  } catch (error) {
    console.error('Failed to save board state:', error);
  }
}

// Call this on mount — returns null if puzzle was never started
export async function loadBoardState(puzzleId) {
  try {
    const json = await AsyncStorage.getItem(boardKey(puzzleId));
    if (json === null) return null;
    return JSON.parse(json);
  } catch (error) {
    console.error('Failed to load board state:', error);
    return null;
  }
}

// Call this when a puzzle is completed so stale data is cleaned up
export async function clearBoardState(puzzleId) {
  try {
    await AsyncStorage.removeItem(boardKey(puzzleId));
  } catch (error) {
    console.error('Failed to clear board state:', error);
  }
}