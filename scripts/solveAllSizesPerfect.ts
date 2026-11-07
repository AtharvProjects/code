import fs from 'fs';
import { buildWordCatalog, extractSlotsFromMask, solveGridSlotsFast } from '../services/dynamicCrosswordSolver';
import { ALL_USER_1000_WORDS } from '../services/userLexicon1000';
import { MARATHI_DICTIONARY } from '../services/marathiDictionary';
import { MasterGridPuzzle } from '../types';

const catalog = buildWordCatalog();
const userWordsSet = new Set(ALL_USER_1000_WORDS);
const dictWordsSet = new Set(Object.keys(MARATHI_DICTIONARY));

function isValidWord(w: string): boolean {
    return userWordsSet.has(w) || dictWordsSet.has(w);
}

function getWordClue(w: string): string {
    if (MARATHI_DICTIONARY[w]) return MARATHI_DICTIONARY[w];
    const item = catalog.find(x => x.word === w);
    return item ? item.clue : 'अस्सल मराठी शब्दार्थ';
}

export function validateGridCompletely(grid: string[][]): { valid: boolean; reason?: string; clues?: { word: string; clue: string }[] } {
    const N = grid.length;
    const acrossWords: { word: string; r: number; c: number }[] = [];
    const downWords: { word: string; r: number; c: number }[] = [];

    // Check across
    for (let r = 0; r < N; r++) {
        let cur = '';
        let startC = 0;
        for (let c = 0; c < N; c++) {
            const cell = grid[r][c];
            if (cell !== '#') {
                if (!cur) startC = c;
                cur += cell;
            } else {
                if (cur.length >= 2) acrossWords.push({ word: cur, r, c: startC });
                else if (cur.length === 1) return { valid: false, reason: `Single letter across at (${r},${startC})` };
                cur = '';
            }
        }
        if (cur.length >= 2) acrossWords.push({ word: cur, r, c: startC });
        else if (cur.length === 1) return { valid: false, reason: `Single letter across at (${r},${startC})` };
    }

    // Check down
    for (let c = 0; c < N; c++) {
        let cur = '';
        let startR = 0;
        for (let r = 0; r < N; r++) {
            const cell = grid[r][c];
            if (cell !== '#') {
                if (!cur) startR = r;
                cur += cell;
            } else {
                if (cur.length >= 2) downWords.push({ word: cur, r: startR, c });
                else if (cur.length === 1) return { valid: false, reason: `Single letter down at (${startR},${c})` };
                cur = '';
            }
        }
        if (cur.length >= 2) downWords.push({ word: cur, r: startR, c });
        else if (cur.length === 1) return { valid: false, reason: `Single letter down at (${startR},${c})` };
    }

    const all = [...acrossWords, ...downWords];
    for (const item of all) {
        if (!isValidWord(item.word)) {
            return { valid: false, reason: `Invalid word "${item.word}"` };
        }
    }

    const seen = new Set<string>();
    const clues: { word: string; clue: string }[] = [];
    for (const item of all) {
        if (!seen.has(item.word)) {
            seen.add(item.word);
            clues.push({ word: item.word, clue: getWordClue(item.word) });
        }
    }

    return { valid: true, clues };
}

export function isMaskValidNoSingles(mask: string[], maxAllowedLen: number = 5): boolean {
    const N = mask.length;
    for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
            if (mask[r][c] === '0') {
                const h = (c > 0 && mask[r][c - 1] === '0') || (c < N - 1 && mask[r][c + 1] === '0');
                const v = (r > 0 && mask[r - 1][c] === '0') || (r < N - 1 && mask[r + 1][c] === '0');
                if (!h || !v) return false;
            }
        }
    }
    const slots = extractSlotsFromMask(mask);
    const maxLen = Math.max(...slots.map(s => s.len));
    if (maxLen > maxAllowedLen) return false;
    return true;
}

// Connected components solver
function getConnectedComponents(slots: any[]) {
    const cellToSlots = new Map<string, number[]>();
    slots.forEach((s, sIdx) => {
        s.cells.forEach((c: any) => {
            const key = `${c.r},${c.c}`;
            if (!cellToSlots.has(key)) cellToSlots.set(key, []);
            cellToSlots.get(key)!.push(sIdx);
        });
    });

    const adj = Array(slots.length).fill(null).map(() => [] as number[]);
    for (const list of cellToSlots.values()) {
        for (let i = 0; i < list.length; i++) {
            for (let j = i + 1; j < list.length; j++) {
                adj[list[i]].push(list[j]);
                adj[list[j]].push(list[i]);
            }
        }
    }

    const visited = new Set<number>();
    const components: any[][] = [];

    for (let i = 0; i < slots.length; i++) {
        if (visited.has(i)) continue;
        const comp: any[] = [];
        const queue = [i];
        visited.add(i);

        while (queue.length > 0) {
            const curr = queue.shift()!;
            comp.push(slots[curr]);
            for (const neighbor of adj[curr]) {
                if (!visited.has(neighbor)) {
                    visited.add(neighbor);
                    queue.push(neighbor);
                }
            }
        }
        components.push(comp);
    }

    return components;
}

export function solveAnyMask(mask: string[], size: number, baseSeed: number = 1): { grid: string[][]; clues: { word: string; clue: string }[] } | null {
    if (!isMaskValidNoSingles(mask, 5)) return null;

    const slots = extractSlotsFromMask(mask);
    const comps = getConnectedComponents(slots);

    const fullMatrix: (string | null)[][] = Array(size).fill(null).map(() => Array(size).fill(null));
    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            if (mask[r][c] === '#') fullMatrix[r][c] = '#';
        }
    }

    const used = new Set<string>();

    for (let cIdx = 0; cIdx < comps.length; cIdx++) {
        const comp = comps[cIdx];
        let solvedComp = null;

        for (let tryIdx = 0; tryIdx < 15; tryIdx++) {
            const seed = baseSeed * 43 + cIdx * 17 + tryIdx * 7 + 1;
            solvedComp = solveGridSlotsFast(comp, size, catalog, used, seed);
            if (solvedComp) break;
        }

        if (!solvedComp) return null;

        for (const p of solvedComp.placedWords) {
            used.add(p.entry.word);
            for (let i = 0; i < p.slot.len; i++) {
                const cell = p.slot.cells[i];
                fullMatrix[cell.r][cell.c] = p.entry.graphemes[i];
            }
        }
    }

    const gridClean: string[][] = fullMatrix.map(row => row.map(cell => cell || '#'));
    const val = validateGridCompletely(gridClean);
    if (!val.valid || !val.clues) return null;

    return { grid: gridClean, clues: val.clues };
}
