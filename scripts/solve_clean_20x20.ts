import { buildWordCatalog, extractSlotsFromMask, solveGridSlotsFast } from "./services/dynamicCrosswordSolver";
import { checkAllWordsValid } from "./scripts/solve_large_guaranteed";

const catalog = buildWordCatalog();

// Let's create a symmetrical 20x20 mask where:
// Rows 9 and 10 have EXACTLY 4 blacks.
// Cols 9 and 10 have EXACTLY 4 blacks.
// All slot lengths are 2..5.
// Let's test a handcrafted mask that follows newspaper standards:

const m20 = [
  "0000#0000#0000#0000", // r0: 3 blacks (len 4, 4, 4, 4 -> wait: 4+1+4+1+4+1+4 = 19, need 20: 0000#0000#0000#0000#)
  "0#0#0#0#0#0#0#0#0#0",
  "0000#0000#0000#0000",
  "#0#0#0#0#0#0#0#0#0#",
  "0000#0000#0000#0000",
  "0#0#0#0#0#0#0#0#0#0",
  "0000#0000#0000#0000",
  "#0#0#0#0#0#0#0#0#0#",
  "0000#0000#0000#0000",
  "0000#000#00#000#0000", // r9: EXACTLY 4 blacks: 4, 8, 11, 15
  "0000#000#00#000#0000", // r10: EXACTLY 4 blacks: 4, 8, 11, 15
  "#0#0#0#0#0#0#0#0#0#",
  "0000#0000#0000#0000",
  "0#0#0#0#0#0#0#0#0#0",
  "0000#0000#0000#0000",
  "#0#0#0#0#0#0#0#0#0#",
  "0000#0000#0000#0000",
  "0#0#0#0#0#0#0#0#0#0",
  "0000#0000#0000#0000",
  "#0#0#0#0#0#0#0#0#0#"
];

console.log("Ready to test solve_clean_20x20");
