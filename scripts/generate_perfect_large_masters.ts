import { ALL_USER_1000_WORDS } from "../services/userLexicon1000";
import { MARATHI_DICTIONARY } from "../services/marathiDictionary";
import { MasterGridPuzzle } from "../types";
import { extractPlacedWordsFromGrid, getMarathiWordClue, sanitizeClue } from "../services/crosswordService";
import { buildWordCatalog } from "../services/dynamicCrosswordSolver";

const catalog = buildWordCatalog();
const validWordsSet = new Set([...ALL_USER_1000_WORDS, ...Object.keys(MARATHI_DICTIONARY)]);

console.log("Building verified large master puzzles...");
