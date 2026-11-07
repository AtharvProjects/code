import { ALL_USER_1000_WORDS } from "../services/userLexicon1000";
import { MARATHI_DICTIONARY } from "../services/marathiDictionary";
import { checkAllWordsValid } from "./solve_large_guaranteed";
import { getGraphemes, extractPlacedWordsFromGrid } from "../services/crosswordService";
import { generate9x9, generate5x5 } from "./build_full_large_suite";
import { VERIFIED_PUZZLES_12X12 } from "../services/puzzleBank";

const validWordsSet = new Set([...ALL_USER_1000_WORDS, ...Object.keys(MARATHI_DICTIONARY)]);

console.log("Testing 20x20 and 25x25 clean assembly...");

// 1. Let us test 20x20 assembly:
// Four 9x9 clean grids from generate9x9:
const p9_a = generate9x9(11);
const p9_b = generate9x9(27);
const p9_c = generate9x9(43);
const p9_d = generate9x9(59);

// Check if any 9x9 has full black lines
console.log("p9_a full black lines?", p9_a.grid.some(r => r.every(c => c === "#")));

// Assemble 20x20:
const g20 = Array(20).fill(null).map(() => Array(20).fill("#"));
for (let r = 0; r < 9; r++) {
  for (let c = 0; c < 9; c++) {
    g20[r][c] = p9_a.grid[r][c];
    g20[r][c + 11] = p9_b.grid[r][c];
    g20[r + 11][c] = p9_c.grid[r][c];
    g20[r + 11][c + 11] = p9_d.grid[r][c];
  }
}

// In rows 9 & 10 and cols 9 & 10, put words such that:
// Row 9 has EXACTLY 4 blacks!
// Row 10 has EXACTLY 4 blacks!
// Col 9 has EXACTLY 4 blacks!
// Col 10 has EXACTLY 4 blacks!

console.log("Checking row 9 & 10 empty state...");
let r9B = 0, r10B = 0;
for (let c = 0; c < 20; c++) {
  if (g20[9][c] === "#") r9B++;
  if (g20[10][c] === "#") r10B++;
}
console.log("Empty r9 blacks:", r9B, "r10 blacks:", r10B);
