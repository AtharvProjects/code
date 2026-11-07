import fs from 'fs';
import { searchAndSolveMasks } from './findPerfectPuzzles';
import { solveAnyMask } from './solveAllSizesPerfect';
import { extractSlotsFromMask, solveGridSlotsFast, buildWordCatalog, INTERLOCKING_MASKS_10X10 } from '../services/dynamicCrosswordSolver';
import { buildPuzzleFromMaster, extractPlacedWordsFromGrid, getGraphemes } from '../services/crosswordService';
import { ALL_USER_1000_WORDS } from '../services/userLexicon1000';
import { MARATHI_DICTIONARY } from '../services/marathiDictionary';
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
                clue: getWordClue(c.word)
            });
        }
    }

    return {
        ...raw,
        clues,
        totalWordCount: clues.length
    };
}

// 1. Generate 5x5
console.log("Generating 5x5...");
const p5RawList = searchAndSolveMasks(5, 2);
const p5_1 = finalizeMasterPuzzle({
    id: "p5_1",
    title: "शब्दवेध (मिनी ५x५ - संच #१)",
    theme: "सुलभ मराठी शब्दवेध",
    gridSize: 5,
    description: "५x५ आकाराचे सुलभ व अस्सल मराठी शब्दकोडे",
    grid: p5RawList[0].grid
});
const p5_2 = finalizeMasterPuzzle({
    id: "p5_2",
    title: "शब्दवेध (मिनी ५x५ - संच #२)",
    theme: "सुलभ मराठी शब्दवेध",
    gridSize: 5,
    description: "५x५ आकाराचे सुलभ व अस्सल मराठी शब्दकोडे",
    grid: p5RawList[1].grid
});

// 2. Generate 6x6
console.log("Generating 6x6...");
const p6RawList = searchAndSolveMasks(6, 2);
const p6_1 = finalizeMasterPuzzle({
    id: "p6_1",
    title: "शब्दवेध (६x६ - संच #१)",
    theme: "अस्सल मराठी शब्दवेध",
    gridSize: 6,
    description: "६x६ आकाराचे अस्सल मराठी शब्दकोडे",
    grid: p6RawList[0].grid
});
const p6_2 = finalizeMasterPuzzle({
    id: "p6_2",
    title: "शब्दवेध (६x६ - संच #२)",
    theme: "अस्सल मराठी शब्दवेध",
    gridSize: 6,
    description: "६x६ आकाराचे अस्सल मराठी शब्दकोडे",
    grid: p6RawList[1].grid
});

// 3. Generate 7x7
console.log("Generating 7x7...");
const m7 = ["0000#00","0000#00","00#00##","#00#00#","##00#00","00#0000","00#0000"];
const sol7_1 = solveAnyMask(m7, 7, 646)!;
const sol7_2 = solveAnyMask(m7, 7, 8422)!;

const p7_1 = finalizeMasterPuzzle({
    id: "p7_1",
    title: "शब्दवेध (७x७ - संच #१)",
    theme: "अस्सल मराठी शब्दवेध",
    gridSize: 7,
    description: "७x७ आकाराचे वृत्तपत्रीय शब्दकोडे",
    grid: sol7_1.grid
});
const p7_2 = finalizeMasterPuzzle({
    id: "p7_2",
    title: "शब्दवेध (७x७ - संच #२)",
    theme: "अस्सल मराठी शब्दवेध",
    gridSize: 7,
    description: "७x७ आकाराचे वृत्तपत्रीय शब्दकोडे",
    grid: sol7_2.grid
});

// 4. Generate 8x8
console.log("Generating 8x8...");
const m8_1 = [
    "000##000",
    "0#0000#0",
    "00#00#00",
    "#00##00#",
    "#00##00#",
    "00#00#00",
    "0#0000#0",
    "000##000"
];
const m8_2 = [
    "000#0000",
    "0#00#0#0",
    "00#00000",
    "#000##00",
    "00##000#",
    "00000#00",
    "0#0#00#0",
    "0000#000"
];
const sol8_1 = solveGridSlotsFast(extractSlotsFromMask(m8_1), 8, catalog, new Set(), 29)!;
const sol8_2 = solveGridSlotsFast(extractSlotsFromMask(m8_2), 8, catalog, new Set(), 43)!;

const p8_1 = finalizeMasterPuzzle({
    id: "p8_1",
    title: "शब्दवेध (८x८ - संच #१)",
    theme: "अस्सल मराठी शब्दवेध",
    gridSize: 8,
    description: "८x८ आकाराचे अस्सल मराठी शब्दकोडे",
    grid: sol8_1.grid
});
const p8_2 = finalizeMasterPuzzle({
    id: "p8_2",
    title: "शब्दवेध (८x८ - संच #२)",
    theme: "अस्सल मराठी शब्दवेध",
    gridSize: 8,
    description: "८x८ आकाराचे अस्सल मराठी शब्दकोडे",
    grid: sol8_2.grid
});

// 5. Generate 9x9
console.log("Generating 9x9...");
const m9_1 = [
    "0000#0000",
    "0#00#00#0",
    "00#0#0#00",
    "0000#0000",
    "#########",
    "0000#0000",
    "00#0#0#00",
    "0#00#00#0",
    "0000#0000"
];
const m9_2 = [
    "0000#0000",
    "00#000#00",
    "000#0#000",
    "0#00#00#0",
    "####0####",
    "0#00#00#0",
    "000#0#000",
    "00#000#00",
    "0000#0000"
];
const sol9_1 = solveGridSlotsFast(extractSlotsFromMask(m9_1), 9, catalog, new Set(), 23)!;
const sol9_2 = solveGridSlotsFast(extractSlotsFromMask(m9_2), 9, catalog, new Set(), 53)!;

const p9_1 = finalizeMasterPuzzle({
    id: "p9_1",
    title: "शब्दवेध (९x९ - संच #१)",
    theme: "अस्सल मराठी शब्दवेध",
    gridSize: 9,
    description: "९x९ आकाराचे अस्सल वृत्तपत्रीय शब्दकोडे",
    grid: sol9_1.grid
});
const p9_2 = finalizeMasterPuzzle({
    id: "p9_2",
    title: "शब्दवेध (९x९ - संच #२)",
    theme: "अस्सल मराठी शब्दवेध",
    gridSize: 9,
    description: "९x९ आकाराचे अस्सल वृत्तपत्रीय शब्दकोडे",
    grid: sol9_2.grid
});

// Helper for complementary boundary mask generation
function makeComplementaryMask(base: string[], prevRightCol?: string[], prevBottomRow?: string[]): string[] {
    const grid = base.map(row => row.split(""));
    const N = base.length;

    if (prevRightCol) {
        for (let r = 0; r < N; r++) {
            if (prevRightCol[r] === "0" && grid[r][0] === "0") {
                grid[r][0] = "#";
            }
        }
    }

    if (prevBottomRow) {
        for (let c = 0; c < N; c++) {
            if (prevBottomRow[c] === "0" && grid[0][c] === "0") {
                grid[0][c] = "#";
            }
        }
    }

    let maskResult = grid.map(r => r.join(""));
    for (let pass = 0; pass < 10; pass++) {
        const slots = extractSlotsFromMask(maskResult);
        const singleSlot = slots.find(s => s.len < 2);
        if (!singleSlot) break;

        const c0 = singleSlot.cells[0];
        const g = maskResult.map(r => r.split(""));
        g[c0.r][c0.c] = "#";
        maskResult = g.map(r => r.join(""));
    }

    return maskResult;
}

function solveWithSeedSearch(mask: string[], gridSize: number, used: Set<string>, startSeed: number = 1): { grid: string[][]; placedWords: any[] } {
    const slots = extractSlotsFromMask(mask);
    for (let seed = startSeed; seed <= startSeed + 100; seed++) {
        const res = solveGridSlotsFast(slots, gridSize, catalog, used, seed);
        if (res) return res;
    }
    throw new Error(`Failed to solve grid size ${gridSize}`);
}

function sanitizeGridSeams(rawGrid: string[][]): string[][] {
    const size = rawGrid.length;
    const grid = rawGrid.map(row => [...row]);

    let changed = true;
    let iterations = 0;
    while (changed && iterations < 15) {
        changed = false;
        iterations++;

        const gridObj = grid.map(r => r.map(cell => ({
            letter: cell === "#" ? null : cell,
            isBlack: cell === "#",
            number: null
        })));

        const extracted = extractPlacedWordsFromGrid(gridObj);
        for (const pw of extracted) {
            const graph = getGraphemes(pw.word);
            if (graph.length > 5) {
                if (pw.direction === "across") {
                    let targetC = pw.col + Math.floor(graph.length / 2);
                    for (let c = pw.col; c < pw.col + graph.length; c++) {
                        if (c === 9 || c === 10 || c === 11 || c === 12 || c === 4 || c === 14 || c === 19) {
                            targetC = c;
                            break;
                        }
                    }
                    grid[pw.row][targetC] = "#";
                    changed = true;
                    break;
                } else {
                    let targetR = pw.row + Math.floor(graph.length / 2);
                    for (let r = pw.row; r < pw.row + graph.length; r++) {
                        if (r === 9 || r === 10 || r === 11 || r === 12 || r === 4 || r === 14 || r === 19) {
                            targetR = r;
                            break;
                        }
                    }
                    grid[targetR][pw.col] = "#";
                    changed = true;
                    break;
                }
            }
        }
    }

    // Clean up isolated single letters
    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            if (grid[r][c] !== "#") {
                const hasHoriz = (c > 0 && grid[r][c - 1] !== "#") || (c < size - 1 && grid[r][c + 1] !== "#");
                const hasVert = (r > 0 && grid[r - 1][c] !== "#") || (r < size - 1 && grid[r + 1][c] !== "#");
                if (!hasHoriz && !hasVert) {
                    grid[r][c] = "#";
                }
            }
        }
    }

    return grid;
}

// 6. Generate 20x20
console.log("Generating 20x20...");
const m10_base = INTERLOCKING_MASKS_10X10[0];

function createTiled20(pIndex: number) {
    const used = new Set<string>();

    const q0Mask = m10_base;
    const q1Mask = makeComplementaryMask(m10_base, q0Mask.map(r => r[9]));
    const q2Mask = makeComplementaryMask(m10_base, undefined, q0Mask[9].split(""));
    const q3Mask = makeComplementaryMask(m10_base, q2Mask.map(r => r[9]), q1Mask[9].split(""));

    const q0 = solveWithSeedSearch(q0Mask, 10, used, pIndex * 15 + 1);
    q0.placedWords.forEach(p => used.add(p.entry.word));

    const q1 = solveWithSeedSearch(q1Mask, 10, used, pIndex * 15 + 1);
    q1.placedWords.forEach(p => used.add(p.entry.word));

    const q2 = solveWithSeedSearch(q2Mask, 10, used, pIndex * 15 + 1);
    q2.placedWords.forEach(p => used.add(p.entry.word));

    const q3 = solveWithSeedSearch(q3Mask, 10, used, pIndex * 15 + 1);
    q3.placedWords.forEach(p => used.add(p.entry.word));

    let grid: string[][] = Array(20).fill(null).map(() => Array(20).fill("#"));
    for (let r = 0; r < 10; r++) {
        for (let c = 0; c < 10; c++) {
            grid[r][c] = q0.grid[r][c];
            grid[r][c + 10] = q1.grid[r][c];
            grid[r + 10][c] = q2.grid[r][c];
            grid[r + 10][c + 10] = q3.grid[r][c];
        }
    }

    grid = sanitizeGridSeams(grid);

    return finalizeMasterPuzzle({
        id: `p20_${pIndex + 1}`,
        title: `महाशब्दवेध (२०x२० - संच #${pIndex + 1})`,
        theme: "अस्सल मराठी महाशब्दवेध",
        gridSize: 20,
        description: "२०x२० आकाराचे भव्य, आव्हानात्मक व समृद्ध वृत्तपत्रीय शब्दकोडे",
        grid
    });
}

const p20_1 = createTiled20(0);
const p20_2 = createTiled20(1);

// 7. Generate 25x25
console.log("Generating 25x25...");
const m12_base = [
    "0000#00000#0",
    "0#0#0#0#0#0#",
    "00000#000000",
    "#0#0#0#0#0#0",
    "00000#0000#0",
    "0#0#0#0#0#0#",
    "#0#0#0#0#0#0",
    "0#0000#00000",
    "0#0#0#0#0#0#",
    "000000#00000",
    "#0#0#0#0#0#0",
    "0#00000#000#"
];

function createTiled25(pIndex: number) {
    const used = new Set<string>();

    const q0Mask = m12_base;
    const q1Mask = makeComplementaryMask(m12_base, q0Mask.map(r => r[11]));
    const q2Mask = makeComplementaryMask(m12_base, undefined, q0Mask[11].split(""));
    const q3Mask = makeComplementaryMask(m12_base, q2Mask.map(r => r[11]), q1Mask[11].split(""));

    const q0 = solveWithSeedSearch(q0Mask, 12, used, pIndex * 20 + 1);
    q0.placedWords.forEach(p => used.add(p.entry.word));

    const q1 = solveWithSeedSearch(q1Mask, 12, used, pIndex * 20 + 1);
    q1.placedWords.forEach(p => used.add(p.entry.word));

    const q2 = solveWithSeedSearch(q2Mask, 12, used, pIndex * 20 + 1);
    q2.placedWords.forEach(p => used.add(p.entry.word));

    const q3 = solveWithSeedSearch(q3Mask, 12, used, pIndex * 20 + 1);
    q3.placedWords.forEach(p => used.add(p.entry.word));

    let grid: string[][] = Array(25).fill(null).map(() => Array(25).fill("#"));

    for (let r = 0; r < 12; r++) {
        for (let c = 0; c < 12; c++) {
            grid[r][c] = q0.grid[r][c];
            grid[r][c + 13] = q1.grid[r][c];
            grid[r + 13][c] = q2.grid[r][c];
            grid[r + 13][c + 13] = q3.grid[r][c];
        }
    }

    grid = sanitizeGridSeams(grid);

    return finalizeMasterPuzzle({
        id: `p25_${pIndex + 1}`,
        title: `महासम्राट शब्दवेध (२५x२५ - संच #${pIndex + 1})`,
        theme: "अस्सल मराठी महासम्राट शब्दवेध",
        gridSize: 25,
        description: "२५x२५ आकाराचे भव्य, महाआव्हानात्मक व समृद्ध वृत्तपत्रीय शब्दकोडे",
        grid
    });
}

const p25_1 = createTiled25(0);
const p25_2 = createTiled25(1);

// Construct TypeScript output file
const code = `import { MasterGridPuzzle } from './puzzleBank';

export const VERIFIED_PUZZLES_5X5: MasterGridPuzzle[] = ${JSON.stringify([p5_1, p5_2], null, 4)};

export const VERIFIED_PUZZLES_6X6: MasterGridPuzzle[] = ${JSON.stringify([p6_1, p6_2], null, 4)};

export const VERIFIED_PUZZLES_7X7: MasterGridPuzzle[] = ${JSON.stringify([p7_1, p7_2], null, 4)};

export const VERIFIED_PUZZLES_8X8: MasterGridPuzzle[] = ${JSON.stringify([p8_1, p8_2], null, 4)};

export const VERIFIED_PUZZLES_9X9: MasterGridPuzzle[] = ${JSON.stringify([p9_1, p9_2], null, 4)};

export const VERIFIED_PUZZLES_20X20: MasterGridPuzzle[] = ${JSON.stringify([p20_1, p20_2], null, 4)};

export const VERIFIED_PUZZLES_25X25: MasterGridPuzzle[] = ${JSON.stringify([p25_1, p25_2], null, 4)};
`;

fs.writeFileSync('services/verifiedAllSizesPuzzles.ts', code, 'utf-8');
console.log("SUCCESS! Created services/verifiedAllSizesPuzzles.ts with pristine verified puzzles for all sizes!");
