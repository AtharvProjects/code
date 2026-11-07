import fs from 'fs';
import { buildWordCatalog, extractSlotsFromMask, solveGridSlotsFast } from '../services/dynamicCrosswordSolver';
import { ALL_USER_1000_WORDS } from '../services/userLexicon1000';
import { MARATHI_DICTIONARY } from '../services/marathiDictionary';
import { MasterGridPuzzle, GridCell } from '../types';
import { extractPlacedWordsFromGrid, getGraphemes } from '../services/crosswordService';

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

// 1. Solve 5x5
export function generate5x5(seed: number): MasterGridPuzzle {
    const m5 = [
        "0000#",
        "0#0#0",
        "00000",
        "0#0#0",
        "#0000"
    ];
    const slots = extractSlotsFromMask(m5);
    const sol = solveGridSlotsFast(slots, 5, catalog, new Set(), seed)!;
    const val = validateGridStrict(sol.grid);
    return {
        id: `p5_${seed}`,
        title: `शब्दवेध (मिनी ५x५ - संच #${seed % 2 + 1})`,
        theme: "सुलभ मराठी शब्दवेध",
        gridSize: 5,
        description: "५x५ आकाराचे सुलभ व अस्सल वृत्तपत्रीय शब्दकोडे",
        grid: sol.grid,
        clues: val.clues,
        totalWordCount: val.clues.length
    };
}

// 2. Solve 9x9
export function generate9x9(seed: number): MasterGridPuzzle {
    const m9 = [
        "000#000#0",
        "0#0#0#0#0",
        "0000#0000",
        "#0#00#0#0",
        "000#00#00",
        "0#0#00#0#",
        "0000#0000",
        "0#0#0#0#0",
        "0#000#000"
    ];
    const slots = extractSlotsFromMask(m9);
    const sol = solveGridSlotsFast(slots, 9, catalog, new Set(), seed)!;
    const val = validateGridStrict(sol.grid);
    return {
        id: `p9_${seed}`,
        title: `शब्दवेध (९x९ - संच #${seed % 2 + 1})`,
        theme: "अस्सल वृत्तपत्रीय शब्दवेध",
        gridSize: 9,
        description: "९x९ आकाराचे अस्सल मराठी शब्दकोडे",
        grid: sol.grid,
        clues: val.clues,
        totalWordCount: val.clues.length
    };
}

console.log("5x5 and 9x9 generators defined.");
