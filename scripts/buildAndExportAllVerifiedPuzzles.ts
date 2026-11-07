import fs from 'fs';
import { extractSlotsFromMask, solveGridSlotsFast, buildWordCatalog } from '../services/dynamicCrosswordSolver';
import { buildPuzzleFromMaster } from '../services/crosswordService';
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
    return item ? item.clue : 'अस्सल मराठी शब्दार्थ';
}

function checkAndSanitizePuzzle(master: MasterGridPuzzle): { valid: boolean; badWords: string[]; puzzle: MasterGridPuzzle } {
    const built = buildPuzzleFromMaster(master);
    const badWords: string[] = [];

    for (const c of built.clues.across) {
        if (!isValidWord(c.word)) badWords.push(`Across: ${c.word}`);
    }
    for (const c of built.clues.down) {
        if (!isValidWord(c.word)) badWords.push(`Down: ${c.word}`);
    }

    const allCluesMap = new Map<string, string>();
    for (const c of [...built.clues.across, ...built.clues.down]) {
        if (!allCluesMap.has(c.word)) {
            allCluesMap.set(c.word, getWordClue(c.word));
        }
    }

    const cleanClues = Array.from(allCluesMap.entries()).map(([word, clue]) => ({ word, clue }));

    return {
        valid: badWords.length === 0,
        badWords,
        puzzle: {
            ...master,
            clues: cleanClues,
            totalWordCount: cleanClues.length
        }
    };
}

// 1. 5x5 Masks
const MASKS_5X5 = [
    [
        "00#00",
        "00000",
        "##0##",
        "00000",
        "00#00"
    ],
    [
        "00000",
        "0#0#0",
        "00000",
        "0#0#0",
        "00000"
    ],
    [
        "00#00",
        "00000",
        "0#0#0",
        "00000",
        "00#00"
    ]
];

// 2. 6x6 Masks
const MASKS_6X6 = [
    [
        "000#00",
        "000000",
        "00##00",
        "00##00",
        "000000",
        "00#000"
    ],
    [
        "0000#0",
        "0#0000",
        "00#000",
        "000#00",
        "0000#0",
        "0#0000"
    ],
    [
        "00#000",
        "000000",
        "#00#0#",
        "#0#00#",
        "000000",
        "000#00"
    ]
];

// 3. 7x7 Masks
const MASKS_7X7 = [
    [
        "0000#00",
        "0000#00",
        "00#00##",
        "#00#00#",
        "##00#00",
        "00#0000",
        "00#0000"
    ],
    [
        "00#0000",
        "00#0000",
        "##00#00",
        "#00#00#",
        "00#00##",
        "0000#00",
        "0000#00"
    ],
    [
        "000#000",
        "0#000#0",
        "00#0#00",
        "000#000",
        "00#0#00",
        "0#000#0",
        "000#000"
    ]
];

// 4. 8x8 Masks
const MASKS_8X8 = [
    [
        "000##000",
        "0#0000#0",
        "00#00#00",
        "#00##00#",
        "#00##00#",
        "00#00#00",
        "0#0000#0",
        "000##000"
    ],
    [
        "0000#000",
        "0#00#000",
        "00#0#0#0",
        "000000##",
        "##000000",
        "0#0#0#00",
        "000#00#0",
        "000#0000"
    ],
    [
        "000#0000",
        "0#00#0#0",
        "00#00000",
        "#000##00",
        "00##000#",
        "00000#00",
        "0#0#00#0",
        "0000#000"
    ]
];

// 5. 9x9 Masks
const MASKS_9X9 = [
    [
        "0000#0000",
        "0#00#00#0",
        "00#0#0#00",
        "0000#0000",
        "#########",
        "0000#0000",
        "00#0#0#00",
        "0#00#00#0",
        "0000#0000"
    ],
    [
        "000#000#0",
        "000#000#0",
        "0#00000#0",
        "#00#0#00#",
        "0000#0000",
        "#00#0#00#",
        "0#00000#0",
        "0#000#000",
        "0#000#000"
    ],
    [
        "0000#0000",
        "00#000#00",
        "000#0#000",
        "0#00#00#0",
        "####0####",
        "0#00#00#0",
        "000#0#000",
        "00#000#00",
        "0000#0000"
    ]
];

function solvePuzzleForGrid(
    mask: string[],
    size: number,
    id: string,
    title: string,
    theme: string,
    seedOffset: number = 0
): MasterGridPuzzle | null {
    const slots = extractSlotsFromMask(mask);
    for (let s = 1; s <= 60; s++) {
        const seed = s * 31 + seedOffset * 79 + size * 13;
        const sol = solveGridSlotsFast(slots, size, catalog, new Set(), seed);
        if (sol) {
            const rawMaster: MasterGridPuzzle = {
                id,
                title,
                theme,
                gridSize: size,
                description: `${size}x${size} आकाराचे अस्सल मराठी वृत्तपत्रीय शब्दकोडे`,
                grid: sol.grid,
                clues: sol.placedWords.map(p => ({ word: p.entry.word, clue: p.entry.clue })),
                totalWordCount: sol.placedWords.length
            };
            const check = checkAndSanitizePuzzle(rawMaster);
            if (check.valid) {
                return check.puzzle;
            }
        }
    }
    return null;
}

export function buildAllSizes(): Record<string, MasterGridPuzzle[]> {
    console.log("=== GENERATING VERIFIED PUZZLES FOR ALL SIZES ===");
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
    for (let i = 0; i < MASKS_5X5.length; i++) {
        const p = solvePuzzleForGrid(MASKS_5X5[i], 5, `p5_${i + 1}`, `शब्दवेध (मिनी ५x५ - संच #${i + 1})`, "सुलभ मराठी शब्दवेध", i * 17);
        if (p) {
            console.log(`5x5 #${i + 1} solved: ${p.totalWordCount} words`);
            results["5"].push(p);
        } else {
            console.log(`5x5 #${i + 1} failed`);
        }
    }

    // 6x6
    for (let i = 0; i < MASKS_6X6.length; i++) {
        const p = solvePuzzleForGrid(MASKS_6X6[i], 6, `p6_${i + 1}`, `शब्दवेध (६x६ - संच #${i + 1})`, "अस्सल मराठी शब्दवेध", i * 23);
        if (p) {
            console.log(`6x6 #${i + 1} solved: ${p.totalWordCount} words`);
            results["6"].push(p);
        } else {
            console.log(`6x6 #${i + 1} failed`);
        }
    }

    // 7x7
    for (let i = 0; i < MASKS_7X7.length; i++) {
        const p = solvePuzzleForGrid(MASKS_7X7[i], 7, `p7_${i + 1}`, `शब्दवेध (७x७ - संच #${i + 1})`, "अस्सल मराठी शब्दवेध", i * 37);
        if (p) {
            console.log(`7x7 #${i + 1} solved: ${p.totalWordCount} words`);
            results["7"].push(p);
        } else {
            console.log(`7x7 #${i + 1} failed`);
        }
    }

    // 8x8
    for (let i = 0; i < MASKS_8X8.length; i++) {
        const p = solvePuzzleForGrid(MASKS_8X8[i], 8, `p8_${i + 1}`, `शब्दवेध (८x८ - संच #${i + 1})`, "अस्सल मराठी शब्दवेध", i * 43);
        if (p) {
            console.log(`8x8 #${i + 1} solved: ${p.totalWordCount} words`);
            results["8"].push(p);
        } else {
            console.log(`8x8 #${i + 1} failed`);
        }
    }

    // 9x9
    for (let i = 0; i < MASKS_9X9.length; i++) {
        const p = solvePuzzleForGrid(MASKS_9X9[i], 9, `p9_${i + 1}`, `शब्दवेध (९x९ - संच #${i + 1})`, "अस्सल मराठी शब्दवेध", i * 53);
        if (p) {
            console.log(`9x9 #${i + 1} solved: ${p.totalWordCount} words`);
            results["9"].push(p);
        } else {
            console.log(`9x9 #${i + 1} failed`);
        }
    }

    // 20x20 assembled from four 9x9 quadrants with row 9/10, col 9/10 as decorative black border
    if (results["9"].length >= 2) {
        for (let v = 0; v < 3; v++) {
            const q1 = results["9"][v % results["9"].length];
            const q2 = results["9"][(v + 1) % results["9"].length];
            const g20 = Array(20).fill(null).map(() => Array(20).fill("#"));

            for (let r = 0; r < 9; r++) {
                for (let c = 0; c < 9; c++) {
                    g20[r][c] = q1.grid[r][c];
                    g20[r][c + 11] = q2.grid[r][c];
                    g20[r + 11][c] = q2.grid[8 - r][c];
                    g20[r + 11][c + 11] = q1.grid[8 - r][8 - c];
                }
            }

            const rawMaster: MasterGridPuzzle = {
                id: `p20_verified_${v + 1}`,
                title: `महाशब्दवेध (२०x२० - संच #${v + 1})`,
                theme: "अस्सल मराठी महाशब्दवेध",
                gridSize: 20,
                description: "२०x२० आकाराचे भव्य, आव्हानात्मक व समृद्ध वृत्तपत्रीय शब्दकोडे",
                grid: g20,
                clues: [...q1.clues, ...q2.clues],
                totalWordCount: q1.clues.length + q2.clues.length
            };

            const check = checkAndSanitizePuzzle(rawMaster);
            if (check.valid) {
                console.log(`20x20 #${v + 1} assembled: ${check.puzzle.totalWordCount} words`);
                results["20"].push(check.puzzle);
            }
        }
    }

    // 25x25 assembled from four 12x12 quadrants with row 12, col 12 as black separator
    try {
        const { VERIFIED_PUZZLES_12X12 } = require('../services/puzzleBank');
        if (VERIFIED_PUZZLES_12X12 && VERIFIED_PUZZLES_12X12.length >= 2) {
            for (let v = 0; v < 3; v++) {
                const q1 = VERIFIED_PUZZLES_12X12[v % VERIFIED_PUZZLES_12X12.length];
                const q2 = VERIFIED_PUZZLES_12X12[(v + 1) % VERIFIED_PUZZLES_12X12.length];
                const g25 = Array(25).fill(null).map(() => Array(25).fill("#"));

                for (let r = 0; r < 12; r++) {
                    for (let c = 0; c < 12; c++) {
                        g25[r][c] = q1.grid[r][c];
                        g25[r][c + 13] = q2.grid[r][c];
                        g25[r + 13][c] = q2.grid[r][c];
                        g25[r + 13][c + 13] = q1.grid[r][c];
                    }
                }

                const rawMaster: MasterGridPuzzle = {
                    id: `p25_verified_${v + 1}`,
                    title: `महासम्राट शब्दवेध (२५x२५ - संच #${v + 1})`,
                    theme: "अस्सल मराठी महासम्राट शब्दवेध",
                    gridSize: 25,
                    description: "२५x२५ आकाराचे भव्य, महाआव्हानात्मक व समृद्ध वृत्तपत्रीय शब्दकोडे",
                    grid: g25,
                    clues: [...q1.clues, ...q2.clues],
                    totalWordCount: q1.clues.length + q2.clues.length
                };

                const check = checkAndSanitizePuzzle(rawMaster);
                if (check.valid) {
                    console.log(`25x25 #${v + 1} assembled: ${check.puzzle.totalWordCount} words`);
                    results["25"].push(check.puzzle);
                }
            }
        }
    } catch (e) {
        console.error("25x25 assemble error:", e);
    }

    return results;
}

const allPuzzles = buildAllSizes();
fs.writeFileSync('all_verified_puzzles_final.json', JSON.stringify(allPuzzles, null, 2));
console.log("SUCCESS! Saved all_verified_puzzles_final.json");
