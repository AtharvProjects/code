import fs from 'fs';
import { 
    extractSlotsFromMask, 
    solveGridSlotsFast, 
    buildWordCatalog 
} from '../services/dynamicCrosswordSolver';
import { MARATHI_DICTIONARY } from '../services/marathiDictionary';
import { ALL_USER_1000_WORDS } from '../services/userLexicon1000';
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
    return item ? item.clue : 'अस्सल मराठी शब्द';
}

function checkAndExtract(grid: string[][]): { valid: boolean; clues: { word: string; clue: string }[] } {
    const N = grid.length;
    const acrossWords: string[] = [];
    const downWords: string[] = [];

    for (let r = 0; r < N; r++) {
        let cur = '';
        for (let c = 0; c < N; c++) {
            if (grid[r][c] !== '#') {
                cur += grid[r][c];
            } else {
                if (cur.length >= 2) acrossWords.push(cur);
                else if (cur.length === 1) return { valid: false, clues: [] };
                cur = '';
            }
        }
        if (cur.length >= 2) acrossWords.push(cur);
        else if (cur.length === 1) return { valid: false, clues: [] };
    }

    for (let c = 0; c < N; c++) {
        let cur = '';
        for (let r = 0; r < N; r++) {
            if (grid[r][c] !== '#') {
                cur += grid[r][c];
            } else {
                if (cur.length >= 2) downWords.push(cur);
                else if (cur.length === 1) return { valid: false, clues: [] };
                cur = '';
            }
        }
        if (cur.length >= 2) downWords.push(cur);
        else if (cur.length === 1) return { valid: false, clues: [] };
    }

    const all = [...acrossWords, ...downWords];
    for (const w of all) {
        if (!isValidWord(w)) {
            console.log("Invalid word found in checkAndExtract:", w);
            return { valid: false, clues: [] };
        }
    }

    const seen = new Set<string>();
    const clues: { word: string; clue: string }[] = [];
    for (const w of all) {
        if (!seen.has(w)) {
            seen.add(w);
            clues.push({ word: w, clue: getWordClue(w) });
        }
    }

    return { valid: true, clues };
}

// MASKS
export const ALL_VERIFIED_MASKS: Record<number, string[][]> = {
    5: [
        [
            "##00#",
            "#0000",
            "00#00",
            "0000#",
            "#00##"
        ],
        [
            "#00##",
            "#0000",
            "00#00",
            "0000#",
            "##00#"
        ],
        [
            "##000",
            "##000",
            "00#00",
            "000##",
            "000##"
        ]
    ],
    6: [
        [
            "000#00",
            "000#00",
            "##0000",
            "0000##",
            "00#000",
            "00#000"
        ],
        [
            "00#000",
            "00#000",
            "0000##",
            "##0000",
            "000#00",
            "000#00"
        ]
    ],
    7: [
        [
            "00###00",
            "00###00",
            "0000#00",
            "##000##",
            "00#0000",
            "00###00",
            "00###00"
        ],
        [
            "00###00",
            "00###00",
            "00#0000",
            "##000##",
            "0000#00",
            "00###00",
            "00###00"
        ],
        [
            "00###00",
            "00###00",
            "##000##",
            "##000##",
            "##000##",
            "00###00",
            "00###00"
        ]
    ],
    8: [
        [
            "000##000",
            "0000#000",
            "##0000##",
            "00##0000",
            "0000##00",
            "##0000##",
            "000#0000",
            "000##000"
        ],
        [
            "000##000",
            "000#0000",
            "##0000##",
            "0000##00",
            "00##0000",
            "##0000##",
            "0000#000",
            "000##000"
        ],
        [
            "0000##00",
            "0000##00",
            "00###000",
            "##0000##",
            "##0000##",
            "000###00",
            "00##0000",
            "00##0000"
        ]
    ],
    9: [
        [
            "000##0000",
            "0000#0000",
            "##00#00##",
            "000####00",
            "00#####00",
            "00####000",
            "##00#00##",
            "0000#0000",
            "0000##000"
        ],
        [
            "000##0000",
            "0000#0000",
            "##00#00##",
            "00#####00",
            "00#####00",
            "00#####00",
            "##00#00##",
            "0000#0000",
            "0000##000"
        ],
        [
            "0000##000",
            "0000#0000",
            "##00#00##",
            "00####000",
            "00#####00",
            "000####00",
            "##00#00##",
            "0000#0000",
            "000##0000"
        ]
    ]
};

function solvePuzzleForMask(mask: string[], size: number, title: string, theme: string, id: string): MasterGridPuzzle | null {
    const slots = extractSlotsFromMask(mask);
    for (let seed = 1; seed <= 50; seed++) {
        const sol = solveGridSlotsFast(slots, size, catalog, new Set(), seed * 37 + 7);
        if (sol) {
            const check = checkAndExtract(sol.grid);
            if (check.valid && check.clues.length >= slots.length * 0.7) {
                return {
                    id,
                    title,
                    theme,
                    gridSize: size,
                    description: `${size}x${size} आकाराचे अस्सल वृत्तपत्रीय मराठी शब्दकोडे`,
                    grid: sol.grid,
                    clues: check.clues,
                    totalWordCount: check.clues.length
                };
            }
        }
    }
    return null;
}

// Modular 20x20 and 25x25 solving
function generateModularGrid(
    size: 20 | 25,
    subMask: string[],
    subSize: number,
    offset2: number,
    id: string,
    title: string,
    theme: string
): MasterGridPuzzle | null {
    const grid: string[][] = Array(size).fill(null).map(() => Array(size).fill('#'));

    // 4 quadrants
    const qPositions = [
        { r: 0, c: 0, seed: 11 },
        { r: 0, c: offset2, seed: 43 },
        { r: offset2, c: 0, seed: 79 },
        { r: offset2, c: offset2, seed: 113 }
    ];

    const slots = extractSlotsFromMask(subMask);
    const usedWords = new Set<string>();

    for (let q = 0; q < 4; q++) {
        const pos = qPositions[q];
        let solvedQ = null;
        for (let trySeed = 1; trySeed <= 30; trySeed++) {
            solvedQ = solveGridSlotsFast(slots, subSize, catalog, usedWords, pos.seed + trySeed * 17);
            if (solvedQ) break;
        }

        if (!solvedQ) {
            console.log(`Quadrant ${q} failed for size ${size}`);
            return null;
        }

        solvedQ.placedWords.forEach(w => usedWords.add(w.entry.word));

        for (let r = 0; r < subSize; r++) {
            for (let c = 0; c < subSize; c++) {
                grid[pos.r + r][pos.c + c] = solvedQ.grid[r][c];
            }
        }
    }

    const check = checkAndExtract(grid);
    if (!check.valid) {
        console.log(`Check failed for modular ${size}x${size}`);
        return null;
    }

    return {
        id,
        title,
        theme,
        gridSize: size,
        description: `${size}x${size} आकाराचे भव्य व समृद्ध वृत्तपत्रीय मराठी शब्दकोडे`,
        grid,
        clues: check.clues,
        totalWordCount: check.clues.length
    };
}

async function main() {
    console.log("=== GENERATING VERIFIED PUZZLE SUITE ===");
    const results: Record<string, MasterGridPuzzle[]> = {
        "5": [],
        "6": [],
        "7": [],
        "8": [],
        "9": [],
        "20": [],
        "25": []
    };

    // 5x5
    ALL_VERIFIED_MASKS[5].forEach((m, idx) => {
        const p = solvePuzzleForMask(m, 5, `शब्दवेध ५x५ (संच #${idx + 1})`, "मराठी भाषा व ज्ञान", `p5_${idx + 1}`);
        if (p) {
            console.log(`5x5 #${idx + 1} SOLVED! Words: ${p.totalWordCount}`);
            results["5"].push(p);
        }
    });

    // 6x6
    ALL_VERIFIED_MASKS[6].forEach((m, idx) => {
        const p = solvePuzzleForMask(m, 6, `शब्दवेध ६x६ (संच #${idx + 1})`, "मराठी संस्कृती", `p6_${idx + 1}`);
        if (p) {
            console.log(`6x6 #${idx + 1} SOLVED! Words: ${p.totalWordCount}`);
            results["6"].push(p);
        }
    });

    // 7x7
    ALL_VERIFIED_MASKS[7].forEach((m, idx) => {
        const p = solvePuzzleForMask(m, 7, `शब्दवेध ७x७ (संच #${idx + 1})`, "महाराष्ट्र व इतिहास", `p7_${idx + 1}`);
        if (p) {
            console.log(`7x7 #${idx + 1} SOLVED! Words: ${p.totalWordCount}`);
            results["7"].push(p);
        }
    });

    // 8x8
    ALL_VERIFIED_MASKS[8].forEach((m, idx) => {
        const p = solvePuzzleForMask(m, 8, `शब्दवेध ८x८ (संच #${idx + 1})`, "साहित्य व संस्कृती", `p8_${idx + 1}`);
        if (p) {
            console.log(`8x8 #${idx + 1} SOLVED! Words: ${p.totalWordCount}`);
            results["8"].push(p);
        }
    });

    // 9x9
    ALL_VERIFIED_MASKS[9].forEach((m, idx) => {
        const p = solvePuzzleForMask(m, 9, `शब्दवेध ९x९ (संच #${idx + 1})`, "ज्ञान व विज्ञान", `p9_${idx + 1}`);
        if (p) {
            console.log(`9x9 #${idx + 1} SOLVED! Words: ${p.totalWordCount}`);
            results["9"].push(p);
        }
    });

    // 20x20: 4 9x9 modules with row 9/10, col 9/10 as black separator
    const m9_sub = ALL_VERIFIED_MASKS[9][0];
    const p20_1 = generateModularGrid(20, m9_sub, 9, 11, 'p20_1', 'महाशब्दवेध २०x२० (संच #१)', 'अस्सल मराठी महाशब्दवेध');
    if (p20_1) {
        console.log(`20x20 #1 SOLVED! Words: ${p20_1.totalWordCount}`);
        results["20"].push(p20_1);
    }

    const m9_sub2 = ALL_VERIFIED_MASKS[9][1];
    const p20_2 = generateModularGrid(20, m9_sub2, 9, 11, 'p20_2', 'महाशब्दवेध २०x२० (संच #२)', 'महाराष्ट्र संस्कृती व ज्ञान');
    if (p20_2) {
        console.log(`20x20 #2 SOLVED! Words: ${p20_2.totalWordCount}`);
        results["20"].push(p20_2);
    }

    // 25x25: 4 12x12 modules with row 12, col 12 as black separator
    // In 25x25, offset2 is 13 (rows 0..11, row 12 is #, rows 13..24)
    const { INTERLOCKING_MASKS_12X12 } = await import('../services/dynamicCrosswordSolver');
    const m12_sub = INTERLOCKING_MASKS_12X12[0];
    const p25_1 = generateModularGrid(25, m12_sub, 12, 13, 'p25_1', 'महासम्राट शब्दवेध २५x२५ (संच #१)', 'अस्सल मराठी महासम्राट शब्दवेध');
    if (p25_1) {
        console.log(`25x25 #1 SOLVED! Words: ${p25_1.totalWordCount}`);
        results["25"].push(p25_1);
    }

    const m12_sub2 = INTERLOCKING_MASKS_12X12[1];
    const p25_2 = generateModularGrid(25, m12_sub2, 12, 13, 'p25_2', 'महासम्राट शब्दवेध २५x२५ (संच #२)', 'मराठी भाषा व ज्ञानसागर');
    if (p25_2) {
        console.log(`25x25 #2 SOLVED! Words: ${p25_2.totalWordCount}`);
        results["25"].push(p25_2);
    }

    fs.writeFileSync('verified_puzzles_complete.json', JSON.stringify(results, null, 2));
    console.log("=== COMPLETED ALL PUZZLE GENERATIONS SUCCESSFULLY ===");
}

main().catch(console.error);
