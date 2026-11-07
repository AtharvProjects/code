import { buildWordCatalog, extractSlotsFromMask, solveGridSlotsFast } from "../services/dynamicCrosswordSolver";
import { MasterGridPuzzle } from "../types";
import { ALL_USER_1000_WORDS } from "../services/userLexicon1000";
import { MARATHI_DICTIONARY, sanitizeClue } from "../services/marathiDictionary";
import { extractPlacedWordsFromGrid, getMarathiWordClue } from "../services/crosswordService";

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

// 5x5 masks with NO full black rows
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

console.log("5x5 p5_1 full black rows:", p5_1.grid.filter(r => r.every(c => c === "#")).length);
console.log("5x5 p5_2 full black rows:", p5_2.grid.filter(r => r.every(c => c === "#")).length);

// 9x9 mask with NO full black rows
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

console.log("9x9 p9_1 full black rows:", p9_1.grid.filter(r => r.every(c => c === "#")).length);
console.log("9x9 p9_2 full black rows:", p9_2.grid.filter(r => r.every(c => c === "#")).length);

