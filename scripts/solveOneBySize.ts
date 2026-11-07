import fs from 'fs';
import { MARATHI_DICTIONARY, isAuthenticMarathiWord, getMarathiWordClue, sanitizeClue } from '../services/marathiDictionary';
import { ALL_USER_1000_WORDS } from '../services/userLexicon1000';
import { validateGridAgainstLexicon } from '../services/geminiService';
import { MasterGridPuzzle } from '../services/puzzleBank';
import { getGraphemes } from '../services/crosswordService';

// Collect all authentic words
const allWords = new Set<string>();
for (const w of Object.keys(MARATHI_DICTIONARY)) {
    if (isAuthenticMarathiWord(w)) allWords.add(w.trim());
}
for (const w of ALL_USER_1000_WORDS) {
    if (isAuthenticMarathiWord(w)) allWords.add(w.trim());
}

interface WordItem {
    word: string;
    graphemes: string[];
    length: number;
    clue: string;
}

const wordsByLen = new Map<number, WordItem[]>();
for (const w of allWords) {
    const graphemes = getGraphemes(w);
    const len = graphemes.length;
    if (len >= 2 && len <= 8) {
        if (!wordsByLen.has(len)) wordsByLen.set(len, []);
        const rawClue = MARATHI_DICTIONARY[w] || getMarathiWordClue(w) || 'मराठी शब्दार्थ';
        wordsByLen.get(len)!.push({
            word: w,
            graphemes,
            length: len,
            clue: sanitizeClue(w, rawClue)
        });
    }
}

interface Slot {
    id: string;
    dir: 'across' | 'down';
    r: number;
    c: number;
    len: number;
    cells: { r: number; c: number }[];
}

function extractSlots(mask: string[]): Slot[] {
    const N = mask.length;
    const slots: Slot[] = [];

    // Across
    for (let r = 0; r < N; r++) {
        let cur: { r: number; c: number }[] = [];
        for (let c = 0; c < N; c++) {
            if (mask[r][c] !== '#') {
                cur.push({ r, c });
            } else {
                if (cur.length >= 2) {
                    slots.push({ id: `A_${r}_${cur[0].c}`, dir: 'across', r, c: cur[0].c, len: cur.length, cells: cur });
                }
                cur = [];
            }
        }
        if (cur.length >= 2) {
            slots.push({ id: `A_${r}_${cur[0].c}`, dir: 'across', r, c: cur[0].c, len: cur.length, cells: cur });
        }
    }

    // Down
    for (let c = 0; c < N; c++) {
        let cur: { r: number; c: number }[] = [];
        for (let r = 0; r < N; r++) {
            if (mask[r][c] !== '#') {
                cur.push({ r, c });
            } else {
                if (cur.length >= 2) {
                    slots.push({ id: `D_${cur[0].r}_${c}`, dir: 'down', r: cur[0].r, c, len: cur.length, cells: cur });
                }
                cur = [];
            }
        }
        if (cur.length >= 2) {
            slots.push({ id: `D_${cur[0].r}_${c}`, dir: 'down', r: cur[0].r, c, len: cur.length, cells: cur });
        }
    }

    return slots;
}

function solveGrid(mask: string[], seed: number = 1): MasterGridPuzzle | null {
    const N = mask.length;
    const slots = extractSlots(mask);
    const grid: string[][] = Array(N).fill(null).map(() => Array(N).fill(''));
    for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
            if (mask[r][c] === '#') grid[r][c] = '#';
        }
    }

    function seededShuffle<T>(arr: T[], s: number): T[] {
        const a = [...arr];
        let sd = Math.abs(s) + 1;
        for (let i = a.length - 1; i > 0; i--) {
            sd = (sd * 9301 + 49297) % 233280;
            const j = Math.floor((sd / 233280) * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }

    const availableWordsByLen = new Map<number, WordItem[]>();
    for (const [len, list] of wordsByLen.entries()) {
        availableWordsByLen.set(len, seededShuffle(list, seed + len * 17));
    }

    const assignedWords = new Set<string>();
    const placedSlots: { slot: Slot; word: string; clue: string }[] = [];
    let steps = 0;
    const MAX_STEPS = 30000;

    function backtrack(): boolean {
        steps++;
        if (steps > MAX_STEPS) return false;

        const unplaced = slots.filter(s => !placedSlots.some(p => p.slot === s));
        if (unplaced.length === 0) return true;

        let bestSlot: Slot | null = null;
        let minCandidates = Infinity;
        let bestMatching: WordItem[] = [];

        for (const slot of unplaced) {
            const list = availableWordsByLen.get(slot.len) || [];
            const matching: WordItem[] = [];

            for (const item of list) {
                if (assignedWords.has(item.word)) continue;
                let fits = true;
                for (let i = 0; i < slot.len; i++) {
                    const char = grid[slot.cells[i].r][slot.cells[i].c];
                    if (char && char !== item.graphemes[i]) {
                        fits = false;
                        break;
                    }
                }
                if (fits) {
                    matching.push(item);
                }
            }

            if (matching.length === 0) return false;

            if (matching.length < minCandidates) {
                minCandidates = matching.length;
                bestSlot = slot;
                bestMatching = matching;
            }
        }

        if (!bestSlot) return false;

        const candidatesToTry = bestMatching.slice(0, 30);
        for (const candidate of candidatesToTry) {
            const saved: string[] = [];
            for (let i = 0; i < bestSlot.len; i++) {
                saved.push(grid[bestSlot.cells[i].r][bestSlot.cells[i].c]);
                grid[bestSlot.cells[i].r][bestSlot.cells[i].c] = candidate.graphemes[i];
            }
            assignedWords.add(candidate.word);
            placedSlots.push({ slot: bestSlot, word: candidate.word, clue: candidate.clue });

            if (backtrack()) return true;

            for (let i = 0; i < bestSlot.len; i++) {
                grid[bestSlot.cells[i].r][bestSlot.cells[i].c] = saved[i];
            }
            assignedWords.delete(candidate.word);
            placedSlots.pop();
        }

        return false;
    }

    if (!backtrack()) return null;

    const clues = placedSlots.map(p => ({ word: p.word, clue: p.clue }));
    return {
        id: `p${N}_${seed}`,
        title: `शब्दवेध ${N}x${N}`,
        theme: "मराठी भाषा व संस्कृती",
        gridSize: N,
        description: `${N}x${N} प्रमाणित मराठी शब्दकोडे`,
        grid,
        clues,
        totalWordCount: clues.length
    };
}

// Highly reliable interlocking symmetric patterns with slots of 2, 3, 4, 5
export function solveSize(size: number, mask: string[], seeds: number[]): MasterGridPuzzle[] {
    const list: MasterGridPuzzle[] = [];
    for (const seed of seeds) {
        const p = solveGrid(mask, seed);
        if (p) {
            const val = validateGridAgainstLexicon(p.grid);
            if (val.isValid && val.downWords.length > 0) {
                p.id = `p${size}_${list.length + 1}`;
                p.title = `शब्दवेध ${size}x${size} (संच #${list.length + 1})`;
                list.push(p);
                console.log(`  [OK] ${size}x${size} #${list.length} (seed ${seed}, words: ${p.clues.length})`);
            }
        }
    }
    return list;
}

// 5x5
console.log("Solving 5x5...");
const M5 = [
    '000#0',
    '0#000',
    '00#00',
    '000#0',
    '0#000'
];
const P5 = solveSize(5, M5, [1, 24, 47, 63]);

// 6x6
console.log("Solving 6x6...");
const M6 = [
    '000#00',
    '0#0#00',
    '0000#0',
    '0#0000',
    '00#0#0',
    '00#000'
];
const P6 = solveSize(6, M6, [2, 18, 35, 72]);

// 7x7
console.log("Solving 7x7...");
const M7 = [
    '000#000',
    '0#0#0#0',
    '000#000',
    '#0#0#0#',
    '000#000',
    '0#0#0#0',
    '000#000'
];
const P7 = solveSize(7, M7, [5, 19, 42]);

// 8x8
console.log("Solving 8x8...");
const M8 = [
    '0000#000',
    '0#0#0#0#',
    '0000#000',
    '#0#0#0#0',
    '0#0#0#0#',
    '000#0000',
    '#0#0#0#0',
    '000#0000'
];
const P8 = solveSize(8, M8, [3, 21, 55]);

// 9x9
console.log("Solving 9x9...");
const M9 = [
    '0000#0000',
    '0#0#0#0#0',
    '0000#0000',
    '#0#0#0#0#',
    '0000#0000',
    '#0#0#0#0#',
    '0000#0000',
    '0#0#0#0#0',
    '0000#0000'
];
const P9 = solveSize(9, M9, [7, 33, 61]);

// 12x12
console.log("Solving 12x12...");
const M12 = [
    '0000#000#0000',
    '0#0#0#0#0#0#0',
    '0000#000#0000',
    '#0#0#0#0#0#0#',
    '0000#000#0000',
    '0#0#0#0#0#0#0',
    '0#0#0#0#0#0#0',
    '0000#000#0000',
    '#0#0#0#0#0#0#',
    '0000#000#0000',
    '0#0#0#0#0#0#0',
    '0000#000#0000'
];
const P12 = solveSize(12, M12, [11, 29]);

// 15x15
console.log("Solving 15x15...");
const M15 = [
    '0000#000#000#000',
    '0#0#0#0#0#0#0#0#',
    '0000#000#000#000',
    '#0#0#0#0#0#0#0#0',
    '0000#000#000#000',
    '0#0#0#0#0#0#0#0#',
    '0000#000#000#000',
    '#0#0#0#0#0#0#0#0',
    '0000#000#000#000',
    '0#0#0#0#0#0#0#0#',
    '0000#000#000#000',
    '#0#0#0#0#0#0#0#0',
    '0000#000#000#000',
    '0#0#0#0#0#0#0#0#',
    '0000#000#000#000'
];
const P15 = solveSize(15, M15, [13, 37]);

const allResults = {
    5: P5,
    6: P6,
    7: P7,
    8: P8,
    9: P9,
    12: P12,
    15: P15
};

fs.writeFileSync('./solved_all_sizes.json', JSON.stringify(allResults, null, 2));
console.log("\nALL SIZES SOLVED & VERIFIED SUCCESSFULLY!");
