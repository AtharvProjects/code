import { ALL_USER_1000_WORDS } from "../services/userLexicon1000";
import { MARATHI_DICTIONARY, sanitizeClue } from "../services/marathiDictionary";
import { MasterGridPuzzle, GridCell } from "../types";
import { extractPlacedWordsFromGrid, getMarathiWordClue } from "../services/crosswordService";
import { buildWordCatalog, extractSlotsFromMask, solveGridSlotsFast } from "../services/dynamicCrosswordSolver";
import { VERIFIED_PUZZLES_12X12 } from "../services/puzzleBank";

const catalog = buildWordCatalog();
const validWordsSet = new Set([...ALL_USER_1000_WORDS, ...Object.keys(MARATHI_DICTIONARY)]);

function getWordClue(w: string): string {
    if (MARATHI_DICTIONARY[w]) return MARATHI_DICTIONARY[w];
    const item = catalog.find(x => x.word === w);
    return item ? item.clue : 'अस्सल मराठी शब्दार्थ';
}

function finalizePuzzle(grid: string[][], id: string, title: string, theme: string, size: number, desc: string): MasterGridPuzzle {
    const cellGrid = grid.map(row => row.map(c => ({ letter: c === "#" ? null : c, isBlack: c === "#", number: null })));
    const words = extractPlacedWordsFromGrid(cellGrid as any);
    const seen = new Set<string>();
    const clues: { word: string; clue: string }[] = [];

    for (const w of words) {
        if (!seen.has(w.word)) {
            seen.add(w.word);
            clues.push({
                word: w.word,
                clue: sanitizeClue(w.word, getWordClue(w.word))
            });
        }
    }

    return {
        id,
        title,
        theme,
        gridSize: size,
        description: desc,
        grid,
        clues,
        totalWordCount: clues.length
    };
}

// 1. Generate 5x5
const m5_1 = [
    "000#0",
    "0#0#0",
    "00000",
    "0#0#0",
    "0#000"
];
const m5_2 = [
    "00000",
    "0#0#0",
    "00#00",
    "0#0#0",
    "00000"
];

const sol5_1 = solveGridSlotsFast(extractSlotsFromMask(m5_1), 5, catalog, new Set(), 1)!;
const sol5_2 = solveGridSlotsFast(extractSlotsFromMask(m5_2), 5, catalog, new Set(), 1)!;

export const p5_1 = finalizePuzzle(sol5_1.grid, "p5_1", "शब्दवेध (मिनी ५x५ - संच #१)", "सुलभ मराठी शब्दवेध", 5, "५x५ आकाराचे सुलभ व अस्सल मराठी शब्दकोडे");
export const p5_2 = finalizePuzzle(sol5_2.grid, "p5_2", "शब्दवेध (मिनी ५x५ - संच #२)", "सुलभ मराठी शब्दवेध", 5, "५x५ आकाराचे सुलभ व अस्सल मराठी शब्दकोडे");

// 2. Generate 9x9
const m9_1 = [
    "0000#0000",
    "0#0#0#0#0",
    "0000#0000",
    "0#0#00#0#",
    "#000#000#",
    "#0#00#0#0",
    "0000#0000",
    "0#0#0#0#0",
    "0000#0000"
];

const sol9_1 = solveGridSlotsFast(extractSlotsFromMask(m9_1), 9, catalog, new Set(), 1)!;
const sol9_2 = solveGridSlotsFast(extractSlotsFromMask(m9_1), 9, catalog, new Set(), 100)!;

export const p9_1 = finalizePuzzle(sol9_1.grid, "p9_1", "शब्दवेध (९x९ - संच #१)", "अस्सल मराठी शब्दवेध", 9, "९x९ आकाराचे अस्सल वृत्तपत्रीय शब्दकोडे");
export const p9_2 = finalizePuzzle(sol9_2.grid, "p9_2", "शब्दवेध (९x९ - संच #२)", "अस्सल मराठी शब्दवेध", 9, "९x९ आकाराचे अस्सल वृत्तपत्रीय शब्दकोडे");

// 3. Generate 20x20
const g20_1 = Array(20).fill(null).map(() => Array(20).fill("#"));
for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
        g20_1[r][c] = p9_1.grid[r][c];
        g20_1[r][c + 11] = p9_2.grid[r][c];
        g20_1[r + 11][c] = p9_2.grid[r][c];
        g20_1[r + 11][c + 11] = p9_1.grid[r][c];
    }
}
for (let r = 0; r < 9; r++) { if (r % 2 === 0) g20_1[r][9] = "#"; else g20_1[r][10] = "#"; }
for (let r = 11; r < 20; r++) { if (r % 2 === 0) g20_1[r][9] = "#"; else g20_1[r][10] = "#"; }
for (let c = 0; c < 9; c++) { if (c % 2 === 0) g20_1[9][c] = "#"; else g20_1[10][c] = "#"; }
for (let c = 11; c < 20; c++) { if (c % 2 === 0) g20_1[9][c] = "#"; else g20_1[10][c] = "#"; }

export const p20_1 = finalizePuzzle(g20_1, "p20_1", "महाशब्दवेध (२०x२० - संच #१)", "अस्सल मराठी महाशब्दवेध", 20, "२०x२० आकाराचे भव्य, आव्हानात्मक व समृद्ध वृत्तपत्रीय शब्दकोडे");

const g20_2 = Array(20).fill(null).map(() => Array(20).fill("#"));
for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
        g20_2[r][c] = p9_2.grid[r][c];
        g20_2[r][c + 11] = p9_1.grid[r][c];
        g20_2[r + 11][c] = p9_1.grid[r][c];
        g20_2[r + 11][c + 11] = p9_2.grid[r][c];
    }
}
for (let r = 0; r < 9; r++) { if (r % 2 === 1) g20_2[r][9] = "#"; else g20_2[r][10] = "#"; }
for (let r = 11; r < 20; r++) { if (r % 2 === 1) g20_2[r][9] = "#"; else g20_2[r][10] = "#"; }
for (let c = 0; c < 9; c++) { if (c % 2 === 1) g20_2[9][c] = "#"; else g20_2[10][c] = "#"; }
for (let c = 11; c < 20; c++) { if (c % 2 === 1) g20_2[9][c] = "#"; else g20_2[10][c] = "#"; }

export const p20_2 = finalizePuzzle(g20_2, "p20_2", "महाशब्दवेध (२०x२० - संच #२)", "अस्सल मराठी महाशब्दवेध", 20, "२०x२० आकाराचे भव्य, आव्हानात्मक व समृद्ध वृत्तपत्रीय शब्दकोडे");

// 4. Generate 25x25
const p12_0 = VERIFIED_PUZZLES_12X12[0];
const p12_1 = VERIFIED_PUZZLES_12X12[1];

const g25_1 = Array(25).fill(null).map(() => Array(25).fill("#"));
for (let r = 0; r < 12; r++) {
    for (let c = 0; c < 12; c++) {
        g25_1[r][c] = p12_0.grid[r][c];
        g25_1[r][c + 13] = p12_1.grid[r][c];
        g25_1[r + 13][c] = p12_1.grid[r][c];
        g25_1[r + 13][c + 13] = p12_0.grid[r][c];
    }
}
for (let c = 0; c < 25; c++) { if (c % 2 === 0) g25_1[12][c] = "#"; }
for (let r = 0; r < 25; r++) { if (r % 2 === 0) g25_1[r][12] = "#"; }

export const p25_1 = finalizePuzzle(g25_1, "p25_1", "महाज्ञानकोश (२५x२५ - संच #१)", "मराठी महाज्ञानकोश शब्दवेध", 25, "२५x२५ आकाराचे महाभव्य, अत्यंत आव्हानात्मक वृत्तपत्रीय शब्दकोडे");

const g25_2 = Array(25).fill(null).map(() => Array(25).fill("#"));
for (let r = 0; r < 12; r++) {
    for (let c = 0; c < 12; c++) {
        g25_2[r][c] = p12_1.grid[r][c];
        g25_2[r][c + 13] = p12_0.grid[r][c];
        g25_2[r + 13][c] = p12_0.grid[r][c];
        g25_2[r + 13][c + 13] = p12_1.grid[r][c];
    }
}
for (let c = 0; c < 25; c++) { if (c % 2 === 1) g25_2[12][c] = "#"; }
for (let r = 0; r < 25; r++) { if (r % 2 === 1) g25_2[r][12] = "#"; }

export const p25_2 = finalizePuzzle(g25_2, "p25_2", "महाज्ञानकोश (२५x२५ - संच #२)", "मराठी महाज्ञानकोश शब्दवेध", 25, "२५x२५ आकाराचे महाभव्य, अत्यंत आव्हानात्मक वृत्तपत्रीय शब्दकोडे");

console.log("Validation Results:");
[
    { name: "5x5 #1", p: p5_1 },
    { name: "5x5 #2", p: p5_2 },
    { name: "9x9 #1", p: p9_1 },
    { name: "9x9 #2", p: p9_2 },
    { name: "20x20 #1", p: p20_1 },
    { name: "20x20 #2", p: p20_2 },
    { name: "25x25 #1", p: p25_1 },
    { name: "25x25 #2", p: p25_2 }
].forEach(({ name, p }) => {
    const fullRow = p.grid.some(r => r.every(c => c === "#"));
    const fullCol = Array(p.gridSize).fill(0).some((_, c) => p.grid.every(r => r[c] === "#"));
    const words = extractPlacedWordsFromGrid(p.grid.map(row => row.map(c => ({ letter: c === "#" ? null : c, isBlack: c === "#", number: null }))) as any);
    const invalid = words.filter(w => !validWordsSet.has(w.word));
    console.log(`${name}: fullRow=${fullRow}, fullCol=${fullCol}, words=${words.length}, invalid=${invalid.length}`);
});
