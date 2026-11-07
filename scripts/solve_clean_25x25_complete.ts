import { VERIFIED_PUZZLES_12X12 } from "../services/puzzleBank";
import { ALL_USER_1000_WORDS } from "../services/userLexicon1000";
import { MARATHI_DICTIONARY } from "../services/marathiDictionary";
import { checkAllWordsValid } from "./solve_large_guaranteed";
import { getGraphemes } from "../services/crosswordService";

const validWordsSet = new Set([...ALL_USER_1000_WORDS, ...Object.keys(MARATHI_DICTIONARY)]);

console.log("Ready to search clean 25x25.");
