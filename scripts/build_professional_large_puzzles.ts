import { buildWordCatalog, extractSlotsFromMask, solveGridSlotsFast } from "./services/dynamicCrosswordSolver";
import { ALL_USER_1000_WORDS } from "./services/userLexicon1000";
import { MARATHI_DICTIONARY } from "./services/marathiDictionary";
import { MasterGridPuzzle } from "./types";
import { getGraphemes } from "./services/crosswordService";

const catalog = buildWordCatalog();
const validWordsSet = new Set([...ALL_USER_1000_WORDS, ...Object.keys(MARATHI_DICTIONARY)]);

console.log("Professional large puzzles generator loaded.");
