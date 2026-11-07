import { buildWordCatalog } from "./services/dynamicCrosswordSolver";
import { ALL_USER_1000_WORDS } from "./services/userLexicon1000";
import { MARATHI_DICTIONARY } from "./services/marathiDictionary";
import { checkAllWordsValid } from "./scripts/solve_large_guaranteed";
import { VERIFIED_PUZZLES_12X12 } from "./services/puzzleBank";
import { getGraphemes } from "./services/crosswordService";

const catalog = buildWordCatalog();
const validWordsSet = new Set([...ALL_USER_1000_WORDS, ...Object.keys(MARATHI_DICTIONARY)]);

console.log("Testing 25x25 bridge search...");
