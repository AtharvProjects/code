import { ALL_USER_1000_WORDS } from "../services/userLexicon1000";
import { MARATHI_DICTIONARY } from "../services/marathiDictionary";
import { buildWordCatalog, extractSlotsFromMask, solveGridSlotsFast } from "../services/dynamicCrosswordSolver";
import { getGraphemes, extractPlacedWordsFromGrid } from "../services/crosswordService";
import { MasterGridPuzzle, GridCell } from "../types";

const catalog = buildWordCatalog();
const validWordsSet = new Set([...ALL_USER_1000_WORDS, ...Object.keys(MARATHI_DICTIONARY)]);

// Helper to check if a grid has any invalid words:
export function checkAllWordsValid(grid: string[][]): { valid: boolean; invalidWords: string[]; wordsCount: number } {
  const size = grid.length;
  const initialGrid: GridCell[][] = [];

  for (let r = 0; r < size; r++) {
    const row: GridCell[] = [];
    for (let c = 0; c < size; c++) {
      const raw = grid[r][c];
      if (!raw || raw === "#" || raw.trim() === "") {
        row.push({ letter: null, isBlack: true, number: null });
      } else {
        row.push({ letter: raw.trim(), isBlack: false, number: null });
      }
    }
    initialGrid.push(row);
  }

  const placedWords = extractPlacedWordsFromGrid(initialGrid);
  const invalid: string[] = [];

  for (const p of placedWords) {
    if (!validWordsSet.has(p.word)) {
      invalid.push(`${p.word} (${p.direction} at ${p.row},${p.col})`);
    }
  }

  return {
    valid: invalid.length === 0,
    invalidWords: invalid,
    wordsCount: placedWords.length
  };
}

console.log("Validator ready.");
