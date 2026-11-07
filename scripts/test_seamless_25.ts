import { buildWordCatalog, extractSlotsFromMask, solveGridSlotsFast } from "./services/dynamicCrosswordSolver";
import { validateGridCompletely } from "./scripts/solveAllSizesPerfect";

const catalog = buildWordCatalog();

// Let us construct a 20x20 mask following the 15x15 newspaper pattern:
const m20: string[] = [
  "0000#0000#0000#0000#", // r0: even (4 blacks)
  "0#0#0#0#00#0#0#0#0#0", // r1: odd
  "0000#0000#0000#00000", // r2: even (3 blacks)
  "0#0#00#0#00#0#00#0#0", // r3: odd
  "#000#0#0#0#0#0#000#0", // r4: even
  "00#0#0#0#0#0#0#0#0#0", // r5: odd
  "000#0000#0000#0000#0", // r6: even
  "#0#0#0#0#0#0#0#0#0#0", // r7: odd
  "0#0000#0000#0000#000", // r8: even
  "0000#0000#0000#0000#", // r9: EXACTLY 4 BLACKS
  "#0000#0000#0000#0000", // r10: EXACTLY 4 BLACKS
  "0#0000#0000#0000#000", // r11: even
  "#0#0#0#0#0#0#0#0#0#0", // r12: odd
  "000#0000#0000#0000#0", // r13: even
  "00#0#0#0#0#0#0#0#0#0", // r14: odd
  "#000#0#0#0#0#0#000#0", // r15: even
  "0#0#00#0#00#0#00#0#0", // r16: odd
  "0000#0000#0000#00000", // r17: even
  "0#0#0#0#00#0#0#0#0#0", // r18: odd
  "#0000#0000#0000#0000"  // r19: even (4 blacks)
];

const slots = extractSlotsFromMask(m20);
console.log("Total slots:", slots.length);
const lens = slots.map(s => s.len);
console.log("Min len:", Math.min(...lens), "Max len:", Math.max(...lens));

// Check max slot length
const badSlots = slots.filter(s => s.len > 5 || s.len < 2);
console.log("Bad slots count:", badSlots.length);
if (badSlots.length > 0) {
  console.log("First 3 bad slots:", badSlots.slice(0, 3));
}
