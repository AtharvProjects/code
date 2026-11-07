import { buildWordCatalog, extractSlotsFromMask, solveGridSlotsFast } from "../services/dynamicCrosswordSolver";
import { isMaskValidNoSingles, validateGridCompletely } from ".//solveAllSizesPerfect";

const catalog = buildWordCatalog();

// Let's create a 20x20 mask following the 15x15 newspaper pattern:
// Length: 20
// Even rows: words of len 3, 4, 5 with 3-4 blacks
// Odd rows: checkerboard / bridge cells with 4-5 blacks
// Middle rows (9 and 10): EXACTLY 4 blacks!
// Middle cols (9 and 10): EXACTLY 4 blacks!
// NO singles! All slot lengths strictly between 2 and 5!

const mask20_candidate: string[] = [
  "0000#0000#0000#0000#", // r0: 4 blacks
  "0#0#00#0#00#0#00#0#", // r1: 6 blacks
  "0000#0000#0000#00000", // r2: 3 blacks
  "#0#00#0#00#0#00#0#0", // r3: 6 blacks
  "000#000#000#000#0000", // r4: 4 blacks
  "0#00#0#00#00#0#00#0#", // r5: 6 blacks
  "0000#0000#0000#0000#", // r6: 4 blacks
  "0#0#00#0#00#0#00#0#", // r7: 6 blacks
  "0000#0000#0000#00000", // r8: 3 blacks
  "0000#0000#0000#0000#", // r9: 4 blacks (EXACTLY 4)
  "#0000#0000#0000#0000", // r10: 4 blacks (EXACTLY 4)
  "00000#0000#0000#0000", // r11: 3 blacks
  "#0#00#0#00#0#00#0#0", // r12: 6 blacks
  "#0000#0000#0000#0000", // r13: 4 blacks
  "#0#00#0#00#0#00#0#0", // r14: 6 blacks
  "0000#000#000#000#000", // r15: 4 blacks
  "0#0#00#0#00#0#00#0#", // r16: 6 blacks
  "00000#0000#0000#0000", // r17: 3 blacks
  "#0#00#0#00#0#00#0#0", // r18: 6 blacks
  "#0000#0000#0000#0000"  // r19: 4 blacks
];

console.log("Checking mask20_candidate...");
const valid = isMaskValidNoSingles(mask20_candidate, 5);
console.log("isMaskValidNoSingles:", valid);

const slots = extractSlotsFromMask(mask20_candidate);
console.log("Total slots:", slots.length);
const lens = slots.map(s => s.len);
console.log("Min len:", Math.min(...lens), "Max len:", Math.max(...lens));

// Check black count of row 9 and 10
console.log("Row 9 blacks:", (mask20_candidate[9].match(/#/g) || []).length);
console.log("Row 10 blacks:", (mask20_candidate[10].match(/#/g) || []).length);

// Check black count of col 9 and 10
let col9B = 0, col10B = 0;
for (let r = 0; r < 20; r++) {
  if (mask20_candidate[r][9] === "#") col9B++;
  if (mask20_candidate[r][10] === "#") col10B++;
}
console.log("Col 9 blacks:", col9B, "Col 10 blacks:", col10B);

if (valid) {
  console.time("solve20");
  const sol = solveGridSlotsFast(slots, 20, catalog, new Set(), 42);
  console.timeEnd("solve20");
  console.log("Solved:", !!sol);
  if (sol) {
    const val = validateGridCompletely(sol.grid);
    console.log("Validated completely:", val.valid, "Words:", val.clues?.length);
  }
}
