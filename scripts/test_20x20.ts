import { buildWordCatalog, extractSlotsFromMask, solveGridSlotsFast } from "./services/dynamicCrosswordSolver";

const catalog = buildWordCatalog();

// Let's create a symmetric 20x20 mask
// Every row has 4 black blocks (or 3-5).
// 20 columns: e.g. 4 letters, #, 4 letters, #, 4 letters, #, 4 letters, #
// Let's test a structured 20x20 mask:
const rowPatternA = "0000#0000#0000#0000#"; // 4 blacks
const rowPatternB = "#0000#0000#0000#0000"; // 4 blacks
const rowPatternC = "00#0000#0000#0000#00"; // 4 blacks
const rowPatternD = "000#0000#0000#0000#0"; // 4 blacks

console.log("Testing pattern lengths:");
console.log(rowPatternA.length, rowPatternB.length, rowPatternC.length, rowPatternD.length);
