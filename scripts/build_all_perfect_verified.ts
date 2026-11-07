import fs from 'fs';
import { buildWordCatalog, extractSlotsFromMask, solveGridSlotsFast } from '../services/dynamicCrosswordSolver';
import { ALL_USER_1000_WORDS } from '../services/userLexicon1000';
import { MARATHI_DICTIONARY } from '../services/marathiDictionary';
import { MasterGridPuzzle, GridCell } from '../types';
import { getGraphemes, extractPlacedWordsFromGrid } from '../services/crosswordService';

const catalog = buildWordCatalog();
const validWordsSet = new Set([...ALL_USER_1000_WORDS, ...Object.keys(MARATHI_DICTIONARY)]);

function getWordClue(w: string): string {
    if (MARATHI_DICTIONARY[w]) return MARATHI_DICTIONARY[w];
    const item = catalog.find(x => x.word === w);
    return item ? item.clue : 'अस्सल मराठी शब्दार्थ';
}

export function validateGridStrict(grid: string[][]): { valid: boolean; invalidWords: string[]; wordsCount: number; clues: { word: string; clue: string }[] } {
    const size = grid.length;
    const initialGrid: GridCell[][] = [];

    for (let r = 0; r < size; r++) {
        const row: GridCell[] = [];
        for (let c = 0; c < size; c++) {
            const raw = grid[r][c];
            if (!raw || raw === '#' || raw.trim() === '') {
                row.push({ letter: null, isBlack: true, number: null });
            } else {
                row.push({ letter: raw.trim(), isBlack: false, number: null });
            }
        }
        initialGrid.push(row);
    }

    const placedWords = extractPlacedWordsFromGrid(initialGrid);
    const invalid: string[] = [];
    const seen = new Set<string>();
    const clues: { word: string; clue: string }[] = [];

    for (const p of placedWords) {
        if (!validWordsSet.has(p.word)) {
            invalid.push(`${p.word} (${p.direction} at ${p.row},${p.col})`);
        } else if (!seen.has(p.word)) {
            seen.add(p.word);
            clues.push({
                word: p.word,
                clue: getWordClue(p.word)
            });
        }
    }

    return {
        valid: invalid.length === 0,
        invalidWords: invalid,
        wordsCount: placedWords.length,
        clues
    };
}

console.log("Strict validator ready.");
