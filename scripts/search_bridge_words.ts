import { buildWordCatalog } from "../services/dynamicCrosswordSolver";
import { ALL_USER_1000_WORDS } from "../services/userLexicon1000";
import { MARATHI_DICTIONARY } from "../services/marathiDictionary";
import { VERIFIED_PUZZLES_12X12 } from "../services/puzzleBank";
import { getGraphemes } from "../services/crosswordService";

const catalog = buildWordCatalog();
const validWordsSet = new Set([...ALL_USER_1000_WORDS, ...Object.keys(MARATHI_DICTIONARY)]);

const p0 = VERIFIED_PUZZLES_12X12[0];
const p1 = VERIFIED_PUZZLES_12X12[1];

// Columns 0..3:
// Col 0: top = "झ", bot = "अ"
// Col 1: top = "क", bot = "#"
// Col 2: top = "प", bot = "उ"
// Col 3: top = "क", bot = "ष्ण"

// If Slot 1 in row 12 has 4 letters: L0, L1, L2, L3
// Then in col 1: top is "क", bot is "#", so vertical word is "क" + L1!
// In our valid words: is "क" + L1 a valid 2-letter word?
// e.g. if L1 = "र", "कर" is valid! If L1 = "ळ", "कळ" is valid! If L1 = "प", "कप" is valid!
// And what about col 0: "झ" + L0 + "अ"? Wait! If "झ" + L0 was a 2-letter word ending at row 11...
// Wait: what is the vertical word in col 0 of p0?
// Let us check the vertical word in col 0 of p0!

console.log("Col 0 of p0:", p0.grid.map(r => r[0]).join(""));
console.log("Col 1 of p0:", p0.grid.map(r => r[1]).join(""));
console.log("Col 2 of p0:", p0.grid.map(r => r[2]).join(""));
console.log("Col 3 of p0:", p0.grid.map(r => r[3]).join(""));
