import { ALL_USER_1000_WORDS } from "./services/userLexicon1000";
import { MARATHI_DICTIONARY } from "./services/marathiDictionary";
import { checkAllWordsValid } from "./scripts/solve_large_guaranteed";
import { buildWordCatalog, extractSlotsFromMask, solveGridSlotsFast } from "./services/dynamicCrosswordSolver";

const catalog = buildWordCatalog();
const validWordsSet = new Set([...ALL_USER_1000_WORDS, ...Object.keys(MARATHI_DICTIONARY)]);

// Let us assemble a 20x20 grid using this lattice architecture:
console.log("Assembling 20x20 with exact 4-black requirement and 100% valid words...");
