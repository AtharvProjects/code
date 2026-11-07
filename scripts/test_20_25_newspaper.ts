import { buildWordCatalog, extractSlotsFromMask, solveGridSlotsFast } from "./services/dynamicCrosswordSolver";
import { validateGridCompletely, isMaskValidNoSingles } from "./scripts/solveAllSizesPerfect";

const catalog = buildWordCatalog();

console.log("Testing 20x20 and 25x25 newspaper masks...");

// Let us test: Can we construct a 20x20 mask where:
// - Every slot length is between 2 and 5
// - Every cell has h && v (no singles)
// - Row 9 has exactly 4 blacks
// - Row 10 has exactly 4 blacks
// - Col 9 has exactly 4 blacks
// - Col 10 has exactly 4 blacks
// - No row or col is all black (every row and col has >= 2 and <= 8 blacks)
