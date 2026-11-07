import { extractSlotsFromMask, buildWordCatalog, solveGridSlotsFast } from "../services/dynamicCrosswordSolver";
import { MasterGridPuzzle } from "../types";

const catalog = buildWordCatalog();

// Let us test:
// In 20x20:
// Even rows have words of len 3..5 separated by #
// Odd rows have checking cells
// Let us test if solveGridSlotsFast solves 20x20!
console.log("Ready.");
