import { buildWordCatalog, extractSlotsFromMask, solveGridSlotsFast } from "./services/dynamicCrosswordSolver";
import { INTERLOCKING_MASKS_15X15 } from "./services/dynamicCrosswordSolver";

const catalog = buildWordCatalog();

// In 15x15: mask has 64 slots, solved in 247ms.
// Let us test 15x15 with seed 1, 2, 3:
for (const seed of [1, 42, 101, 777]) {
  const slots = extractSlotsFromMask(INTERLOCKING_MASKS_15X15[0]);
  console.time(`solve_15_seed_${seed}`);
  const sol = solveGridSlotsFast(slots, 15, catalog, new Set(), seed);
  console.timeEnd(`solve_15_seed_${seed}`);
  console.log(`Seed ${seed} solved:`, !!sol);
}
