import { buildWordCatalog, extractSlotsFromMask, solveGridSlotsFast } from "../services/dynamicCrosswordSolver";
import { extractPlacedWordsFromGrid } from "../services/crosswordService";
import { ALL_USER_1000_WORDS } from "../services/userLexicon1000";
import { MARATHI_DICTIONARY } from "../services/marathiDictionary";

const catalog = buildWordCatalog();
const validWordsSet = new Set([...ALL_USER_1000_WORDS, ...Object.keys(MARATHI_DICTIONARY)]);

// 8x8 mask
const m8 = [
    "0000#000",
    "0#0#00#0",
    "0000#000",
    "#0#00#0#",
    "000#0000",
    "0#00#0#0",
    "0000#000",
    "0#0#00#0"
];

const sol1 = solveGridSlotsFast(extractSlotsFromMask(m8), 8, catalog, new Set(), 1);
const sol2 = solveGridSlotsFast(extractSlotsFromMask(m8), 8, catalog, new Set(), 100);

const g20 = Array(20).fill(null).map(() => Array(20).fill("#"));

// Fill 4 8x8 quadrants:
for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
        g20[r][c] = sol1.grid[r][c];
        g20[r][c + 12] = sol2.grid[r][c];
        g20[r + 12][c] = sol2.grid[r][c];
        g20[r + 12][c + 12] = sol1.grid[r][c];
    }
}

// Border padding for rows 8, 11 and cols 8, 11 to keep quadrants 100% valid:
for (let c = 0; c < 20; c++) {
    if (c === 8 || c === 9 || c === 10 || c === 11) continue;
    g20[8][c] = "#";
    g20[11][c] = "#";
}

for (let r = 0; r < 20; r++) {
    if (r === 8 || r === 9 || r === 10 || r === 11) continue;
    g20[r][8] = "#";
    g20[r][11] = "#";
}

// In row 9 & 10, fill pairs where (R9[i] + R10[i]) is a valid 2-letter word:
// Pairs of 3-letter words:
// Pair 0: ("अटक", "मकर") -> down: "अम", "टक", "कर"
// Pair 1: ("अटक", "लपण") -> down: "अल", "टप", "कण"
// Pair 2 (4-letter): ("अननस", "तलवार") -> down: "अत", "नल", "नवा", "सर"
// Pair 3: ("कडक", "मगर") -> down: "कम", "डग", "कर"
// Pair 4: ("कपाळ", "बळकट")? ("कडक", "सडक") -> down: "कस", "डड", "कक" -> no, ("गवत", "बदाम")?

const pair0_r9 = ["अ", "ट", "क"];
const pair0_r10 = ["म", "क", "र"];

const pair1_r9 = ["अ", "ट", "क"];
const pair1_r10 = ["ल", "प", "ण"];

const pair2_r9 = ["अ", "न", "न", "स"];
const pair2_r10 = ["त", "ल", "वा", "र"];

const pair3_r9 = ["क", "ड", "क"];
const pair3_r10 = ["म", "ग", "र"];

const pair4_r9 = ["अ", "ट", "क"];
const pair4_r10 = ["म", "ग", "र"];

// Row 9:
for (let i = 0; i < 3; i++) g20[9][0 + i] = pair0_r9[i]; g20[9][3] = "#";
for (let i = 0; i < 3; i++) g20[9][4 + i] = pair1_r9[i]; g20[9][7] = "#";
for (let i = 0; i < 4; i++) g20[9][8 + i] = pair2_r9[i]; g20[9][12] = "#";
for (let i = 0; i < 3; i++) g20[9][13 + i] = pair3_r9[i]; g20[9][16] = "#";
for (let i = 0; i < 3; i++) g20[9][17 + i] = pair4_r9[i];

// Row 10:
for (let i = 0; i < 3; i++) g20[10][0 + i] = pair0_r10[i]; g20[10][3] = "#";
for (let i = 0; i < 3; i++) g20[10][4 + i] = pair1_r10[i]; g20[10][7] = "#";
for (let i = 0; i < 4; i++) g20[10][8 + i] = pair2_r10[i]; g20[10][12] = "#";
for (let i = 0; i < 3; i++) g20[10][13 + i] = pair3_r10[i]; g20[10][16] = "#";
for (let i = 0; i < 3; i++) g20[10][17 + i] = pair4_r10[i];

// Col 9:
for (let i = 0; i < 3; i++) g20[0 + i][9] = pair0_r9[i]; g20[3][9] = "#";
for (let i = 0; i < 3; i++) g20[4 + i][9] = pair1_r9[i]; g20[7][9] = "#";
for (let i = 0; i < 4; i++) g20[8 + i][9] = pair2_r9[i]; g20[12][9] = "#";
for (let i = 0; i < 3; i++) g20[13 + i][9] = pair3_r9[i]; g20[16][9] = "#";
for (let i = 0; i < 3; i++) g20[17 + i][9] = pair4_r9[i];

// Col 10:
for (let i = 0; i < 3; i++) g20[0 + i][10] = pair0_r10[i]; g20[3][10] = "#";
for (let i = 0; i < 3; i++) g20[4 + i][10] = pair1_r10[i]; g20[7][10] = "#";
for (let i = 0; i < 4; i++) g20[8 + i][10] = pair2_r10[i]; g20[12][10] = "#";
for (let i = 0; i < 3; i++) g20[13 + i][10] = pair3_r10[i]; g20[16][10] = "#";
for (let i = 0; i < 3; i++) g20[17 + i][10] = pair4_r10[i];

const cellGrid = g20.map(row => row.map(c => ({ letter: c === "#" ? null : c, isBlack: c === "#", number: null })));
const words = extractPlacedWordsFromGrid(cellGrid as any);
const invalid = words.filter(w => !validWordsSet.has(w.word));

console.log("20x20 full black rows:", g20.filter(r => r.every(c => c === "#")).length);
console.log("20x20 full black cols:", Array(20).fill(0).filter((_, c) => g20.every(r => r[c] === "#")).length);
console.log("Row 9 black count:", g20[9].filter(c => c === "#").length);
console.log("Row 10 black count:", g20[10].filter(c => c === "#").length);
console.log("Col 9 black count:", g20.map(r => r[9]).filter(c => c === "#").length);
console.log("Col 10 black count:", g20.map(r => r[10]).filter(c => c === "#").length);
console.log("Total words in 20x20:", words.length);
console.log("Invalid words count:", invalid.length);
if (invalid.length > 0) console.log("Invalid words:", invalid);
