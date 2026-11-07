import { buildWordCatalog, extractSlotsFromMask, solveGridSlotsFast } from "../services/dynamicCrosswordSolver";
import { validateGridCompletely } from "./solveAllSizesPerfect";

const catalog = buildWordCatalog();

// Let us build a 20x20 mask modeled directly on the 15x15 mask:
// 20 columns: 4-letter word, #, 4-letter word, #, 4-letter word, #, 4-letter word
// 4 + 1 + 4 + 1 + 4 + 1 + 4 = 19? Wait: 4 + 1 + 4 + 1 + 4 + 1 + 4 + 1 = 20 (ends with #)
// Or: 4, #, 5, #, 4, #, 4 = 20!

const m20: string[] = [
  "0000#00000#0000#0000", // r0
  "0#0#0#0#0#0#0#0#0#0#", // r1
  "0000#0000#0000#00000", // r2
  "0#0#00#0#00#0#00#0#0", // r3
  "#000#0#0#0#0#0#000#0", // r4
  "00#0#0#0#0#0#0#0#0#0", // r5
  "000#0#0#0000#0#000#0", // r6 (breaks col 5 and col 7)
  "#0#0#0#0####0#0#0#0#", // r7
  "0#0000#0000#0000#000", // r8
  "0000#0000####0000#00", // r9
  "00#0000####000#00000", // r10 (breaks col 14)
  "000#0000#0000#0000#0", // r11
  "#0#0#0#0####0#0#0#0#", // r12 (breaks col 16)
  "000#0000#0000#0000#0", // r13
  "0#0#0#0#0#0#0#0#0#00", // r14
  "#000#0#0#0#0#0#000#0", // r15
  "0#0#00#0#00#0#00#0#0", // r16 (breaks col 19)
  "00000#0000#0000#0000", // r17
  "#0#0#0#0#0#0#0#0#0#0", // r18
  "0000#0000#00000#0000"  // r19
];

const slots = extractSlotsFromMask(m20);
console.log("Total slots in 20x20:", slots.length);
const badSlots = slots.filter(s => s.len > 5 || s.len < 2);
console.log("Bad slots count:", badSlots.length);
if (badSlots.length > 0) {
  console.log("Bad slots:", badSlots.map(s => `${s.id} ${s.dir} len=${s.len}`));
}

if (badSlots.length === 0) {
  console.log("Solving 20x20 mask...");
  const t0 = performance.now();
  const sol = solveGridSlotsFast(slots, 20, catalog, new Set(), 42);
  const t1 = performance.now();
  console.log("Solved in", (t1 - t0).toFixed(1), "ms? ", !!sol);
}
