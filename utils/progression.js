import puzzlesData from '../assets/puzzles.json';

const DIFFICULTY_ORDER = {
  easy: 0,
  medium: 1,
  hard: 2,
  insane: 3,
};

export const ORDERED_PUZZLES = [...puzzlesData].sort((a, b) => {
  const difficultyDelta =
    (DIFFICULTY_ORDER[a.difficulty] ?? 99) - (DIFFICULTY_ORDER[b.difficulty] ?? 99);

  if (difficultyDelta !== 0) {
    return difficultyDelta;
  }

  const aNumber = Number(a.id.replace(/\D/g, ''));
  const bNumber = Number(b.id.replace(/\D/g, ''));
  return aNumber - bNumber;
});

export function getPuzzleIndex(puzzleId) {
  return ORDERED_PUZZLES.findIndex((puzzle) => puzzle.id === puzzleId);
}

export function getUnlockedPuzzleIds(completedIds) {
  const completedSet = new Set(completedIds);
  const unlockedIds = [];
  let firstIncompleteFound = false;

  ORDERED_PUZZLES.forEach((puzzle) => {
    if (completedSet.has(puzzle.id)) {
      unlockedIds.push(puzzle.id);
      return;
    }

    if (!firstIncompleteFound) {
      unlockedIds.push(puzzle.id);
      firstIncompleteFound = true;
    }
  });

  return unlockedIds;
}

export function isPuzzleUnlocked(puzzleId, completedIds) {
  return getUnlockedPuzzleIds(completedIds).includes(puzzleId);
}

export function getNextPlayablePuzzle(completedIds) {
  const unlockedIds = getUnlockedPuzzleIds(completedIds);
  const completedSet = new Set(completedIds);
  return ORDERED_PUZZLES.find(
    (puzzle) => unlockedIds.includes(puzzle.id) && !completedSet.has(puzzle.id)
  ) ?? null;
}

export function getNextPuzzleAfter(puzzleId) {
  const currentIndex = getPuzzleIndex(puzzleId);
  if (currentIndex < 0 || currentIndex >= ORDERED_PUZZLES.length - 1) {
    return null;
  }

  return ORDERED_PUZZLES[currentIndex + 1];
}

export function getLevelNumber(puzzleId) {
  const index = getPuzzleIndex(puzzleId);
  return index >= 0 ? index + 1 : null;
}
