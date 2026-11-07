import { buildWordCatalog, extractSlotsFromMask, solveGridSlotsFast } from "../services/dynamicCrosswordSolver";

const catalog = buildWordCatalog();

// Let us construct a 20x20 mask based on the newspaper style:
// Even rows: words of 3, 4, 5 separated by #
// Odd rows: alternating checking cells
// Row 9: EXACTLY 4 BLACKS
// Row 10: EXACTLY 4 BLACKS
// Col 9: EXACTLY 4 BLACKS
// Col 10: EXACTLY 4 BLACKS

// In row of 20 cells:
// 4 blacks at: 3, 7, 12, 16 -> slots: 3, 3, 4, 3, 3
// "000#000#0000#000#000"

const m20: string[] = [
  "0000#0000#0000#0000#", // r0: 4 blacks
  "0#0#0#0#0#0#0#0#0#0#", // r1: odd
  "0000#0000#0000#00000", // r2: 3 blacks
  "0#0#0#0#0#0#0#0#0#0#", // r3: odd
  "000#000#0000#000#000", // r4: 4 blacks
  "0#0#0#0#0#0#0#0#0#0#", // r5: odd
  "#0000#0000#0000#0000", // r6: 4 blacks
  "0#0#0#0#0#0#0#0#0#0#", // r7: odd
  "0000#0000#0000#0000#", // r8: 4 blacks
  "000#000#0000#000#000", // r9: EXACTLY 4 BLACKS
  "000#000#0000#000#000", // r10: EXACTLY 4 BLACKS
  "0000#0000#0000#0000#", // r11: 4 blacks
  "0#0#0#0#0#0#0#0#0#0#", // r12: odd
  "#0000#0000#0000#0000", // r13: 4 blacks
  "0#0#0#0#0#0#0#0#0#0#", // r14: odd
  "000#000#0000#000#000", // r15: 4 blacks
  "0#0#0#0#0#0#0#0#0#0#", // r16: odd
  "0000#0000#0000#00000", // r17: 3 blacks
  "0#0#0#0#0#0#0#0#0#0#", // r18: odd
  "0000#0000#0000#0000#"  // r19: 4 blacks
];

// Check dimensions
console.log("m20 rows:", m20.length, "cols:", m20.map(r => r.length));
const slots = extractSlotsFromMask(m20);
console.log("Total slots:", slots.length);
console.log("Slot lens min/max:", Math.min(...slots.map(s => s.len)), Math.max(...slots.map(s => s.len)));

// Check black counts
console.log("Row 9 blacks:", m20[9].split("").filter(c => c === "#").length);
console.log("Row 10 blacks:", m20[10].split("").filter(c => c === "#").length);
console.log("Col 9 blacks:", m20.map(r => r[9]).filter(c => c === "#").length);
console.log("Col 10 blacks:", m20.map(r => r[10]).filter(c => c === "#").length);
console.log("Any full black rows:", m20.some(r => r.split("").every(c => c === "#")));
console.log("Any full black cols:", Array(20).fill(0).some((_, c) => m20.every(r => r[c] === "#")));
