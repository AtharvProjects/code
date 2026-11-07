import { VERIFIED_PUZZLES } from "../services/puzzleBank";
import { checkAllWordsValid } from ".//solve_large_guaranteed";

const p0 = VERIFIED_PUZZLES[0];
const p1 = VERIFIED_PUZZLES[1];
const p2 = VERIFIED_PUZZLES[2];
const p3 = VERIFIED_PUZZLES[3];

const g20 = Array(20).fill(null).map(() => Array(20).fill("#"));
for (let r = 0; r < 10; r++) {
  for (let c = 0; c < 10; c++) {
    g20[r][c] = p0.grid[r][c];
    g20[r][c + 10] = p1.grid[r][c];
    g20[r + 10][c] = p2.grid[r][c];
    g20[r + 10][c + 10] = p3.grid[r][c];
  }
}

const check = checkAllWordsValid(g20);
console.log("Total invalid words:", check.invalidWords.length);
check.invalidWords.forEach(w => console.log("  ", w));
