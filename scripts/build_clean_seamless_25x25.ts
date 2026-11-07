import fs from 'fs';
import { ALL_USER_1000_WORDS } from '../services/userLexicon1000';
import { MARATHI_DICTIONARY, isAuthenticMarathiWord, sanitizeClue } from '../services/marathiDictionary';
import { buildWordCatalog, extractSlotsFromMask, solveGridSlotsFast } from '../services/dynamicCrosswordSolver';
import { getGraphemes, extractPlacedWordsFromGrid } from '../services/crosswordService';
import { MasterGridPuzzle, GridCell } from '../types';

const catalog = buildWordCatalog();
const validWordsSet = new Set([...ALL_USER_1000_WORDS, ...Object.keys(MARATHI_DICTIONARY)]);

function getWordClue(w: string): string {
    if (MARATHI_DICTIONARY[w]) return MARATHI_DICTIONARY[w];
    const item = catalog.find(x => x.word === w);
    return item ? item.clue : 'अस्सल मराठी शब्दार्थ';
}

// Design a 25x25 mask that has 180-degree rotational symmetry and NO solid black rows or columns!
// Standard newspaper crossword layout:
export function createSymmetricNewspaperMask25(): string[] {
    const N = 25;
    const mask = Array(N).fill(null).map(() => Array(N).fill('0'));

    // Alternating black squares with 180° rotational symmetry
    for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
            if ((r % 4 === 1 && c % 4 === 1) || (r % 4 === 3 && c % 4 === 3)) {
                mask[r][c] = '#';
                mask[N - 1 - r][N - 1 - c] = '#';
            }
        }
    }

    // Add symmetrical center breaks so max slot length <= 5
    let changed = true;
    let iters = 0;
    while (changed && iters < 80) {
        changed = false;
        iters++;
        const strMask = mask.map(row => row.join(''));
        const slots = extractSlotsFromMask(strMask);
        for (const s of slots) {
            if (s.len > 5) {
                const midIdx = Math.floor(s.len / 2);
                const cell = s.cells[midIdx];
                if (mask[cell.r][cell.c] !== '#') {
                    mask[cell.r][cell.c] = '#';
                    mask[N - 1 - cell.r][N - 1 - cell.c] = '#';
                    changed = true;
                    break;
                }
            }
        }
    }

    // Clean isolated cells where BOTH across and down have len < 2
    for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
            if (mask[r][c] === '0') {
                const h = (c > 0 && mask[r][c - 1] === '0') || (c < N - 1 && mask[r][c + 1] === '0');
                const v = (r > 0 && mask[r - 1][c] === '0') || (r < N - 1 && mask[r + 1][c] === '0');
                if (!h && !v) {
                    mask[r][c] = '#';
                    mask[N - 1 - r][N - 1 - c] = '#';
                }
            }
        }
    }

    return mask.map(row => row.join(''));
}

console.log("createSymmetricNewspaperMask25 ready.");
