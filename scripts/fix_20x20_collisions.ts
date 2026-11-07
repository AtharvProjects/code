import { VERIFIED_PUZZLES } from "../services/puzzleBank";
import { checkAllWordsValid } from ".//solve_large_guaranteed";
import { ALL_USER_1000_WORDS } from "../services/userLexicon1000";
import { MARATHI_DICTIONARY } from "../services/marathiDictionary";

const validWordsSet = new Set([...ALL_USER_1000_WORDS, ...Object.keys(MARATHI_DICTIONARY)]);

// Let's test different combinations of 10x10 verified puzzles from the 24 available puzzles!
// There are 24 verified 10x10 puzzles: VERIFIED_PUZZLES[0..23]!
// What if we test different combinations of 4 puzzles: (p_a, p_b, p_c, p_d)
// to see which combination has the fewest boundary collisions?
// Let's test!
console.log("Searching best 10x10 combinations with minimum boundary collisions...");

let minCollisions = Infinity;
let bestComb: number[] = [];

for (let a = 0; a < 24; a++) {
  for (let b = 0; b < 24; b++) {
    if (b === a) continue;
    // Check horizontal seam between a and b at cols 9, 10:
    let hCollisions = 0;
    for (let r = 0; r < 10; r++) {
      const wA = VERIFIED_PUZZLES[a].grid[r][9];
      const wB = VERIFIED_PUZZLES[b].grid[r][0];
      if (wA !== "#" && wB !== "#") {
        // They touch!
        hCollisions++;
      }
    }
    if (hCollisions < minCollisions) {
      minCollisions = hCollisions;
      bestComb = [a, b];
    }
  }
}

console.log("Minimum horizontal collisions between two 10x10s:", minCollisions, "pair:", bestComb);
