import { buildWordCatalog, extractSlotsFromMask, solveGridSlotsFast } from "../services/dynamicCrosswordSolver";
import { checkAllWordsValid } from "./solve_large_guaranteed";

const catalog = buildWordCatalog();

console.log("Designing 20x20 mask with all slot lengths strictly between 2 and 5...");

// Let us write a helper that constructs a 20x20 mask:
// Rotational symmetry 180 degrees.
// Rows 9 and 10: exactly 4 blacks at 4, 8, 11, 15
// Cols 9 and 10: exactly 4 blacks at 4, 8, 11, 15
// And all slot lengths <= 5 and >= 2!

function create20Mask(): string[] {
  const grid = Array(20).fill(null).map(() => Array(20).fill("0"));

  // Set the 4 blacks in rows 9 & 10 and cols 9 & 10:
  const crossIndices = [4, 8, 11, 15];
  crossIndices.forEach(c => {
    grid[9][c] = "#";
    grid[10][c] = "#";
  });
  crossIndices.forEach(r => {
    grid[r][9] = "#";
    grid[r][10] = "#";
  });

  // Now, in rows 0..8 and 11..19, place # so that every slot length is <= 5 and >= 2:
  // Let us break any across slot > 5:
  let changed = true;
  while (changed) {
    changed = false;
    const m = grid.map(r => r.join(""));
    const slots = extractSlotsFromMask(m);
    for (const s of slots) {
      if (s.len > 5) {
        const mid = Math.floor(s.len / 2);
        const cell = s.cells[mid];
        // do not touch rows 9, 10 or cols 9, 10
        if (cell.r === 9 || cell.r === 10 || cell.c === 9 || cell.c === 10) {
          const alt = s.cells.find(c => c.r !== 9 && c.r !== 10 && c.c !== 9 && c.c !== 10);
          if (alt) {
            grid[alt.r][alt.c] = "#";
            grid[19 - alt.r][19 - alt.c] = "#";
            changed = true;
            break;
          }
        } else {
          grid[cell.r][cell.c] = "#";
          grid[19 - cell.r][19 - cell.c] = "#";
          changed = true;
          break;
        }
      }
    }
  }

  // Remove any single-letter slots by making the adjacent cell # or white
  return grid.map(r => r.join(""));
}

const m20 = create20Mask();
const slots20 = extractSlotsFromMask(m20);
console.log("Total slots in m20:", slots20.length);
const lens20 = slots20.map(s => s.len);
console.log("Min len:", Math.min(...lens20), "Max len:", Math.max(...lens20));
console.log("Row 9 blacks:", (m20[9].match(/#/g) || []).length);
console.log("Row 10 blacks:", (m20[10].match(/#/g) || []).length);

let c9 = 0, c10 = 0;
for (let r = 0; r < 20; r++) {
  if (m20[r][9] === "#") c9++;
  if (m20[r][10] === "#") c10++;
}
console.log("Col 9 blacks:", c9, "Col 10 blacks:", c10);
