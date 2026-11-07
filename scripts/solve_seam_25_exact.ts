import { VERIFIED_PUZZLES_12X12 } from "../services/puzzleBank";
import data from "./generated_12x12.json";
import { ALL_USER_1000_WORDS } from "../services/userLexicon1000";
import { MARATHI_DICTIONARY } from "../services/marathiDictionary";
import { buildWordCatalog, WordEntry } from "../services/dynamicCrosswordSolver";
import { getGraphemes, extractPlacedWordsFromGrid } from "../services/crosswordService";
import { GridCell } from "../types";

const catalog = buildWordCatalog();
const validWordsSet = new Set([...ALL_USER_1000_WORDS, ...Object.keys(MARATHI_DICTIONARY)]);

// Let us inspect the 4 quadrants we want to combine:
// We can use 4 verified 12x12 grids from generated_12x12.json:
const q0 = data[0].grid;
const q1 = data[1].grid;
const q2 = data[2].grid;
const q3 = data[3].grid;

console.log("Analyzing seam boundary letters...");
// Col 11 of Q0 (left-top) and Col 0 of Q1 (right-top):
for (let r = 0; r < 12; r++) {
  console.log(`Top row ${r}: Q0[${r}][11]=${q0[r][11]} | Q1[${r}][0]=${q1[r][0]}`);
}
for (let r = 0; r < 12; r++) {
  console.log(`Bottom row ${r}: Q2[${r}][11]=${q2[r][11]} | Q3[${r}][0]=${q3[r][0]}`);
}
