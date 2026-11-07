import { buildWordCatalog, extractSlotsFromMask, solveGridSlotsFast } from "./services/dynamicCrosswordSolver";
import { checkMaskProperties } from "./scripts/test_solve_large";

const catalog = buildWordCatalog();

// We want to construct a 20x20 mask with 180-deg rotational symmetry
// Let's create a builder function:
export function build20x20MaskCandidate(seed: number): string[] | null {
  const N = 20;
  const grid = Array(N).fill(null).map(() => Array(N).fill("0"));

  // Rows 9 and 10 need exactly 4 blacks.
  // With 180-deg symmetry:
  // if (r, c) is '#', then (N-1-r, N-1-c) is '#'
  // Since N-1-9 = 10, the symmetry maps row 9 to row 10!
  // So if row 9 has 4 blacks at columns c1, c2, c3, c4,
  // then row 10 will automatically have 4 blacks at N-1-c1, N-1-c2, N-1-c3, N-1-c4!
  // And similarly for columns 9 and 10!
  // Let's pick 4 column positions for row 9:
  // e.g. [4, 8, 11, 15] or [3, 7, 12, 16] or [4, 9, 10, 15]...
  // Wait! If row 9 has '#' at col 9, then (9, 9) is '#'.
  // Its symmetric cell is (10, 10) which is '#'!
  // Then col 9 has '#' at row 9, and col 10 has '#' at row 10!
  
  // Let's test a structured layout for 20x20:
  // Let's define the 10 rows for the top half (rows 0..9):
  // and reflect for rows 10..19:
  return null;
}
