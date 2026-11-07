import { VERIFIED_PUZZLES_12X12 } from "../services/puzzleBank";
import { ALL_USER_1000_WORDS } from "../services/userLexicon1000";
import { MARATHI_DICTIONARY } from "../services/marathiDictionary";
import { buildWordCatalog } from "../services/dynamicCrosswordSolver";
import { checkAllWordsValid } from "./solve_large_guaranteed";

const catalog = buildWordCatalog();
const validWordsSet = new Set([...ALL_USER_1000_WORDS, ...Object.keys(MARATHI_DICTIONARY)]);

console.log("Testing 25x25 search...");
