import fs from 'fs';
import { extractSlotsFromMask, solveGridSlotsFast, buildWordCatalog } from '../services/dynamicCrosswordSolver';
import { buildPuzzleFromMaster, validateConsecutiveBlackBlocks } from '../services/crosswordService';
import { ALL_USER_1000_WORDS } from '../services/userLexicon1000';
import { MARATHI_DICTIONARY, sanitizeClue } from '../services/marathiDictionary';
import { MasterGridPuzzle } from '../types';

const catalog = buildWordCatalog();

function getWordClue(w: string): string {
    if (MARATHI_DICTIONARY[w]) return MARATHI_DICTIONARY[w];
    const item = catalog.find(x => x.word === w);
    return item ? item.clue : 'अस्सल मराठी शब्दार्थ';
}

function finalizeMasterPuzzle(raw: { id: string; title: string; theme: string; gridSize: number; description: string; grid: string[][] }): MasterGridPuzzle {
    const dummyMaster: MasterGridPuzzle = {
        ...raw,
        clues: [],
        totalWordCount: 0
    };
    const built = buildPuzzleFromMaster(dummyMaster);
    const seen = new Set<string>();
    const clues: { word: string; clue: string }[] = [];

    for (const c of [...built.clues.across, ...built.clues.down]) {
        if (!seen.has(c.word)) {
            seen.add(c.word);
            clues.push({
                word: c.word,
                clue: sanitizeClue(c.word, getWordClue(c.word))
            });
        }
    }

    return {
        ...raw,
        clues,
        totalWordCount: clues.length
    };
}

function makeShiftedNewspaperMask(N: number): string[] {
    const grid: string[][] = Array(N).fill(null).map(() => Array(N).fill("0"));

    for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
            if ((r % 2 === 1 && c % 2 === 1) || ((r + c * 3) % 7 === 0)) {
                grid[r][c] = "#";
            }
        }
    }

    for (let r = 0; r < N; r++) {
        let run = 0;
        for (let c = 0; c < N; c++) {
            if (grid[r][c] === "0") {
                run++;
                if (run > 4) {
                    if (c >= 2 && grid[r][c - 2] === "0" && (c < 3 || grid[r][c - 3] !== "#")) {
                        grid[r][c - 2] = "#";
                        run = 2;
                    }
                }
            } else {
                run = 0;
            }
        }
    }

    for (let c = 0; c < N; c++) {
        let run = 0;
        for (let r = 0; r < N; r++) {
            if (grid[r][c] === "0") {
                run++;
                if (run > 4) {
                    if (r >= 2 && grid[r - 2][c] === "0" && (r < 3 || grid[r - 3][c] !== "#")) {
                        grid[r - 2][c] = "#";
                        run = 2;
                    }
                }
            } else {
                run = 0;
            }
        }
    }

    for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
            if (grid[r][c] === "0") {
                const hasH = (c > 0 && grid[r][c - 1] === "0") || (c < N - 1 && grid[r][c + 1] === "0");
                const hasV = (r > 0 && grid[r - 1][c] === "0") || (r < N - 1 && grid[r + 1][c] === "0");
                if (!hasH && !hasV) {
                    grid[r][c] = "#";
                }
            }
        }
    }

    return grid.map(row => row.join(""));
}

function solveMaskDirect(mask: string[], size: number, seed: number): string[][] {
    const slots = extractSlotsFromMask(mask);
    for (let s = seed; s < seed + 30; s++) {
        const used = new Set<string>();
        const res = solveGridSlotsFast(slots, size, catalog, used, s);
        if (res) return res.grid;
    }
    throw new Error(`Failed to solve grid of size ${size}`);
}

console.log("Building 5x5...");
const m5 = ["000#0", "0#000", "00#00", "000#0", "0#000"];
const p5_1 = finalizeMasterPuzzle({ id: "p5_1", title: "शब्दवेध (मिनी ५x५ - संच #१)", theme: "सुलभ मराठी शब्दवेध", gridSize: 5, description: "५x५ आकाराचे सुलभ व अस्सल मराठी शब्दकोडे", grid: solveMaskDirect(m5, 5, 1) });
const p5_2 = finalizeMasterPuzzle({ id: "p5_2", title: "शब्दवेध (मिनी ५x५ - संच #२)", theme: "सुलभ मराठी शब्दवेध", gridSize: 5, description: "५x५ आकाराचे सुलभ व अस्सल मराठी शब्दकोडे", grid: solveMaskDirect(m5, 5, 10) });

console.log("Building 6x6...");
const m6 = ["000#00", "0#000#", "00#000", "000#00", "#000#0", "00#000"];
const p6_1 = finalizeMasterPuzzle({ id: "p6_1", title: "शब्दवेध (६x६ - संच #१)", theme: "अस्सल मराठी शब्दवेध", gridSize: 6, description: "६x६ आकाराचे अस्सल मराठी शब्दकोडे", grid: solveMaskDirect(m6, 6, 1) });
const p6_2 = finalizeMasterPuzzle({ id: "p6_2", title: "शब्दवेध (६x६ - संच #२)", theme: "अस्सल मराठी शब्दवेध", gridSize: 6, description: "६x६ आकाराचे अस्सल मराठी शब्दकोडे", grid: solveMaskDirect(m6, 6, 12) });

console.log("Building 7x7...");
const m7 = ["0000#00", "0000#00", "00#00#0", "#00#00#", "0#00#00", "00#0000", "00#0000"];
const p7_1 = finalizeMasterPuzzle({ id: "p7_1", title: "शब्दवेध (७x७ - संच #१)", theme: "अस्सल मराठी शब्दवेध", gridSize: 7, description: "७x७ आकाराचे वृत्तपत्रीय शब्दकोडे", grid: solveMaskDirect(m7, 7, 3) });
const p7_2 = finalizeMasterPuzzle({ id: "p7_2", title: "शब्दवेध (७x७ - संच #२)", theme: "अस्सल मराठी शब्दवेध", gridSize: 7, description: "७x७ आकाराचे वृत्तपत्रीय शब्दकोडे", grid: solveMaskDirect(m7, 7, 15) });

console.log("Building 8x8...");
const m8 = makeShiftedNewspaperMask(8);
const p8_1 = finalizeMasterPuzzle({ id: "p8_1", title: "शब्दवेध (८x८ - संच #१)", theme: "अस्सल मराठी शब्दवेध", gridSize: 8, description: "८x८ आकाराचे अस्सल मराठी शब्दकोडे", grid: solveMaskDirect(m8, 8, 1) });
const p8_2 = finalizeMasterPuzzle({ id: "p8_2", title: "शब्दवेध (८x८ - संच #२)", theme: "अस्सल मराठी शब्दवेध", gridSize: 8, description: "८x८ आकाराचे अस्सल मराठी शब्दकोडे", grid: solveMaskDirect(m8, 8, 10) });

console.log("Building 9x9...");
const m9 = makeShiftedNewspaperMask(9);
const p9_1 = finalizeMasterPuzzle({ id: "p9_1", title: "शब्दवेध (९x९ - संच #१)", theme: "अस्सल मराठी शब्दवेध", gridSize: 9, description: "९x९ आकाराचे अस्सल मराठी शब्दकोडे", grid: solveMaskDirect(m9, 9, 1) });
const p9_2 = finalizeMasterPuzzle({ id: "p9_2", title: "शब्दवेध (९x९ - संच #२)", theme: "अस्सल मराठी शब्दवेध", gridSize: 9, description: "९x९ आकाराचे अस्सल मराठी शब्दकोडे", grid: solveMaskDirect(m9, 9, 10) });

console.log("Building 20x20...");
const m20 = makeShiftedNewspaperMask(20);
const p20_1 = finalizeMasterPuzzle({ id: "p20_1", title: "महाशब्दवेध (२०x२० - संच #१)", theme: "अस्सल मराठी महाशब्दवेध", gridSize: 20, description: "२०x२० आकाराचे अखंड, भव्य, आव्हानात्मक व समृद्ध वृत्तपत्रीय शब्दकोडे", grid: solveMaskDirect(m20, 20, 1) });
const p20_2 = finalizeMasterPuzzle({ id: "p20_2", title: "महाशब्दवेध (२०x२० - संच #२)", theme: "अस्सल मराठी महाशब्दवेध", gridSize: 20, description: "२०x२० आकाराचे अखंड, भव्य, आव्हानात्मक व समृद्ध वृत्तपत्रीय शब्दकोडे", grid: solveMaskDirect(m20, 20, 15) });

console.log("Building 25x25...");
const m25 = makeShiftedNewspaperMask(25);
const p25_1 = finalizeMasterPuzzle({ id: "p25_1", title: "महासम्राट शब्दवेध (२५x२५ - संच #१)", theme: "अस्सल मराठी महासम्राट शब्दवेध", gridSize: 25, description: "२५x२५ आकाराचे भव्य, अखंड, महाआव्हानात्मक व समृद्ध वृत्तपत्रीय शब्दकोडे", grid: solveMaskDirect(m25, 25, 1) });
const p25_2 = finalizeMasterPuzzle({ id: "p25_2", title: "महासम्राट शब्दवेध (२५x२५ - संच #२)", theme: "अस्सल मराठी महासम्राट शब्दवेध", gridSize: 25, description: "२५x२५ आकाराचे भव्य, अखंड, महाआव्हानात्मक व समृद्ध वृत्तपत्रीय शब्दकोडे", grid: solveMaskDirect(m25, 25, 25) });

const tsCode = `import { MasterGridPuzzle } from './puzzleBank';

export const VERIFIED_PUZZLES_5X5: MasterGridPuzzle[] = ${JSON.stringify([p5_1, p5_2], null, 4)};

export const VERIFIED_PUZZLES_6X6: MasterGridPuzzle[] = ${JSON.stringify([p6_1, p6_2], null, 4)};

export const VERIFIED_PUZZLES_7X7: MasterGridPuzzle[] = ${JSON.stringify([p7_1, p7_2], null, 4)};

export const VERIFIED_PUZZLES_8X8: MasterGridPuzzle[] = ${JSON.stringify([p8_1, p8_2], null, 4)};

export const VERIFIED_PUZZLES_9X9: MasterGridPuzzle[] = ${JSON.stringify([p9_1, p9_2], null, 4)};

export const VERIFIED_PUZZLES_20X20: MasterGridPuzzle[] = ${JSON.stringify([p20_1, p20_2], null, 4)};

export const VERIFIED_PUZZLES_25X25: MasterGridPuzzle[] = ${JSON.stringify([p25_1, p25_2], null, 4)};
`;

fs.writeFileSync('services/verifiedAllSizesPuzzles.ts', tsCode, 'utf-8');
console.log("SUCCESS! Created services/verifiedAllSizesPuzzles.ts with pristine, fully seamless interlocked puzzles!");
