import { buildWordCatalog, extractSlotsFromMask, solveGridSlotsFast } from "./services/dynamicCrosswordSolver";
import { isMaskValidNoSingles, validateGridCompletely } from "./solveAllSizesPerfect";

const catalog = buildWordCatalog();

// Let's create a 20x20 mask where:
// Row 9 has exactly 4 '#'
// Row 10 has exactly 4 '#'
// Col 9 has exactly 4 '#'
// Col 10 has exactly 4 '#'
// All slot lengths are 2..5
// No singles!
// Let's test a structured mask.

console.log("Ready to test solving.");
