import { buildWordCatalog, extractSlotsFromMask, solveGridSlotsFast } from "../services/dynamicCrosswordSolver";
import { isMaskValidNoSingles, validateGridCompletely, solveAnyMask } from "./solveAllSizesPerfect";

const catalog = buildWordCatalog();

console.log("Ready to test solveAnyMask on candidate masks.");
