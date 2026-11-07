import { buildWordCatalog, extractSlotsFromMask, solveGridSlotsFast } from "../services/dynamicCrosswordSolver";
import { isMaskValidNoSingles } from "./solveAllSizesPerfect";

const catalog = buildWordCatalog();

// Let us construct a 20x20 mask with 4 blacks in rows 9 & 10, and 4 blacks in cols 9 & 10:
// Let us test:
const grid = Array(20).fill(null).map(() => Array(20).fill('0'));

// Place 4 black blocks in row 9 and row 10 at cols: 3, 7, 12, 16
[3, 7, 12, 16].forEach(c => {
    grid[9][c] = '#';
    grid[10][c] = '#';
    grid[c][9] = '#';
    grid[c][10] = '#';
});

// Also in quadrants, add blocks every 3-4 cells to keep words between 2 and 5 letters:
for (let r = 0; r < 20; r++) {
    for (let c = 0; c < 20; c++) {
        if ((r % 4 === 1 && c % 4 === 1) || (r % 4 === 3 && c % 4 === 3)) {
            grid[r][c] = '#';
        }
    }
}

const mask = grid.map(r => r.join(''));
const slots = extractSlotsFromMask(mask);
console.log("Total slots:", slots.length);
console.log("Max slot length:", Math.max(...slots.map(s => s.len)));
console.log("Min slot length:", Math.min(...slots.map(s => s.len)));

const t0 = performance.now();
const sol = solveGridSlotsFast(slots, 20, catalog, new Set(), 42);
const elapsed = performance.now() - t0;
console.log("Solved in", elapsed.toFixed(1), "ms. Solved:", sol !== null);
