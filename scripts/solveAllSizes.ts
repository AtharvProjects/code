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
    const MAX_STEPS = 50000;

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

        // Try top candidates
        const candidatesToTry = bestMatching.slice(0, 40);
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
        theme: "मराठी भाषा व ज्ञान",
        gridSize: N,
        description: `${N}x${N} प्रमाणित मराठी शब्दकोडे`,
        grid,
        clues,
        totalWordCount: clues.length
    };
}

// Highly interlocking, newspaper-style symmetric masks with max <= 2 consecutive #
const MASKS_5X5 = [
    [
        '00#00',
        '00#00',
        '##0##',
        '00#00',
        '00#00'
    ],
    [
        '000#0',
        '0#000',
        '00#00',
        '000#0',
        '0#000'
    ],
    [
        '00#00',
        '0#0#0',
        '00000',
        '0#0#0',
        '00#00'
    ]
];

const MASKS_6X6 = [
    [
        '000#00',
        '0#0#00',
        '000000',
        '000000',
        '00#0#0',
        '00#000'
    ],
    [
        '0000#0',
        '0#0000',
        '00#000',
        '000#00',
        '0000#0',
        '0#0000'
    ]
];

const MASKS_7X7 = [
    [
        '000#000',
        '0#000#0',
        '000#000',
        '#00000#',
        '000#000',
        '0#000#0',
        '000#000'
    ],
    [
        '0000#00',
        '0#0#000',
        '000#0#0',
        '#00000#',
        '0#0#000',
        '000#0#0',
        '00#0000'
    ]
];

const MASKS_8X8 = [
    [
        '0000#000',
        '0#0#00#0',
        '0000#000',
        '#00#00#0',
        '0#00#00#',
        '000#0000',
        '0#00#0#0',
        '000#0000'
    ],
    [
        '000#0000',
        '0#00#0#0',
        '0000#000',
        '#0#00#00',
        '00#00#0#',
        '000#0000',
        '0#0#00#0',
        '0000#000'
    ]
];

const MASKS_9X9 = [
    [
        '0000#0000',
        '0#0#00#0#',
        '0000#0000',
        '#00#00#00',
        '000000000',
        '00#00#00#',
        '0000#0000',
        '#0#00#0#0',
        '0000#0000'
    ],
    [
        '000#00000',
        '0#00#0#00',
        '0000#0000',
        '#0#00#0#0',
        '000000000',
        '0#0#00#0#',
        '0000#0000',
        '00#0#00#0',
        '00000#000'
    ]
];

// Clean 12x12 masks with max 2 consecutive #
const MASKS_12X12 = [
    [
        '0000#000#0000',
        '0#0#0#0#0#0#0',
        '0000#000#0000',
        '#00#000#00#0#',
        '00000#00000#0',
        '0#0#00#0#0#00',
        '00#0#0#00#0#0',
        '0#00000#00000',
        '#0#00#000#00#',
        '0000#000#0000',
        '0#0#0#0#0#0#0',
        '0000#000#0000'
    ],
    [
        '000#0000#0000',
        '0#00#0#00#0#0',
        '0000#0000#000',
        '#0#00#0#00#0#',
        '000000#000000',
        '0#0#000#0#0#0',
        '0#0#0#000#0#0',
        '000000#000000',
        '#0#00#0#00#0#',
        '000#0000#0000',
        '0#0#00#0#00#0',
        '0000#0000#000'
    ]
];

// Clean 15x15 mask with NO more than 2 consecutive # anywhere
const MASKS_15X15 = [
    [
        '0000#000#000#000',
        '0#0#0#0#0#0#00#0',
        '0000#000#0000000',
        '#00#000#00#0#0#0',
        '00000#00000#0000',
        '0#0#00#0#0#00#0#',
        '00#0#0#00#0#0#00',
        '0#00000#00000#0#',
        '00#0#0#00#0#0#00',
        '#0#00#0#0#00#0#0',
        '0000#00000#00000',
        '0#0#0#00#000#00#',
        '0000000#000#0000',
        '0#00#0#0#0#0#0#0',
        '000#000#000#0000'
    ]
];

const results: Record<number, MasterGridPuzzle[]> = {
    5: [], 6: [], 7: [], 8: [], 9: [], 12: [], 15: []
};

const configs = [
    { size: 5, masks: MASKS_5X5, target: 4 },
    { size: 6, masks: MASKS_6X6, target: 4 },
    { size: 7, masks: MASKS_7X7, target: 3 },
    { size: 8, masks: MASKS_8X8, target: 3 },
    { size: 9, masks: MASKS_9X9, target: 3 },
    { size: 12, masks: MASKS_12X12, target: 2 },
    { size: 15, masks: MASKS_15X15, target: 2 }
];

console.log("Starting puzzle generation for all sizes...");

for (const cfg of configs) {
    console.log(`\nSolving size ${cfg.size}x${cfg.size}...`);
    for (let i = 0; i < cfg.target; i++) {
        const mask = cfg.masks[i % cfg.masks.length];
        for (let seed = 1 + i * 23; seed <= 300; seed++) {
            const puzzle = solveGrid(mask, seed);
            if (puzzle) {
                const val = validateGridAgainstLexicon(puzzle.grid);
                if (val.isValid && val.downWords.length > 0) {
                    puzzle.id = `p${cfg.size}_${results[cfg.size].length + 1}`;
                    puzzle.title = `शब्दवेध ${cfg.size}x${cfg.size} (संच #${results[cfg.size].length + 1})`;
                    results[cfg.size].push(puzzle);
                    console.log(`  [OK] Size ${cfg.size}x${cfg.size} #${results[cfg.size].length} (seed ${seed}, words: ${puzzle.clues.length})`);
                    break;
                }
            }
        }
    }
}

fs.writeFileSync('./solved_all_sizes.json', JSON.stringify(results, null, 2));
console.log("\nDone! Written to solved_all_sizes.json");
