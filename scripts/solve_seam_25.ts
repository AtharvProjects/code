import { VERIFIED_PUZZLES_12X12 } from "../services/puzzleBank";
import { ALL_USER_1000_WORDS } from "../services/userLexicon1000";
import { MARATHI_DICTIONARY } from "../services/marathiDictionary";
import { buildWordCatalog } from "../services/dynamicCrosswordSolver";
import { checkAllWordsValid } from "./solve_large_guaranteed";

const catalog = buildWordCatalog();
const validWordsSet = new Set([...ALL_USER_1000_WORDS, ...Object.keys(MARATHI_DICTIONARY)]);

const p0 = VERIFIED_PUZZLES_12X12[0];
const p1 = VERIFIED_PUZZLES_12X12[1];

// Let us test:
// In 25x25:
// g25 is initialized with p0, p1, p1, p0 in the 4 quadrants.
// Row 12 has 4 blacks at 4, 9, 15, 20.
// Col 12 has 4 blacks at 4, 9, 15, 20.
// Let us test:
console.log("Checking words for row 12 and col 12 in 25x25...");

const words4 = catalog.filter(w => w.length === 4);
const words5 = catalog.filter(w => w.length === 5);

console.log("Candidate 4-letter words:", words4.length, "5-letter words:", words5.length);
