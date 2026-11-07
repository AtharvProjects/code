import { buildWordCatalog, extractSlotsFromMask, solveGridSlotsFast } from "../services/dynamicCrosswordSolver";

const catalog = buildWordCatalog();

// Let's create a 10x10 mask for Q0:
// Row 9: 0000#000#0 (cols 0..3 len 4, col 4 #, cols 5..7 len 3, col 8 #, col 9 letter)
// Col 9: 0000#000#0 (rows 0..3 len 4, row 4 #, rows 5..7 len 3, row 8 #, row 9 letter)
// Let's design rows 0..8 of Q0:
const q0_mask = [
  "0000#000#0", // r0 (col 9 has letter of down word)
  "0#0#0#0#00", // r1
  "0000#00000", // r2
  "#0#00#0#00", // r3
  "0#0#0#000#", // r4 (col 9 has #!)
  "0000#0#0#0", // r5
  "#0#0#00#00", // r6
  "00000#0000", // r7
  "0#0#00#0##", // r8 (col 9 has #!)
  "0000#000#0"  // r9
];

console.log("Testing Q0 mask slots:");
const slots = extractSlotsFromMask(q0_mask);
console.log("Q0 slots count:", slots.length);
const lens = slots.map(s => s.len);
console.log("Min len:", Math.min(...lens), "Max len:", Math.max(...lens));

console.time("solve_q0");
const sol = solveGridSlotsFast(slots, 10, catalog, new Set(), 101);
console.timeEnd("solve_q0");
console.log("Q0 solved:", !!sol);
if (sol) {
  sol.grid.forEach(r => console.log(r.join(" ")));
}
