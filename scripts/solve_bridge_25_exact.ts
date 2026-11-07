import { VERIFIED_PUZZLES_12X12 } from "../services/puzzleBank";
import { ALL_USER_1000_WORDS } from "../services/userLexicon1000";
import { MARATHI_DICTIONARY } from "../services/marathiDictionary";
import { buildWordCatalog } from "../services/dynamicCrosswordSolver";
import { extractPlacedWordsFromGrid, getGraphemes } from "../services/crosswordService";

const catalog = buildWordCatalog();
const validWordsSet = new Set([...ALL_USER_1000_WORDS, ...Object.keys(MARATHI_DICTIONARY)]);

console.log("Searching valid seam words for 25x25...");
