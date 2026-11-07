import { buildWordCatalog, extractSlotsFromMask, solveGridSlotsFast } from "../services/dynamicCrosswordSolver";
import { isMaskValidNoSingles, validateGridCompletely } from "./solveAllSizesPerfect";
import { checkAllWordsValid } from "./solve_large_guaranteed";

const catalog = buildWordCatalog();

console.log("Starting large puzzle search...");
