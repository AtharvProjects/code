import { p9_1, p9_2 } from "./solve_clean_5_and_9";
import { buildWordCatalog } from "../services/dynamicCrosswordSolver";
import { checkAllWordsValid } from "./solve_large_guaranteed";

const catalog = buildWordCatalog();

// Let us test placing central cross words in 20x20:
const g = Array(20).fill(null).map(() => Array(20).fill("#"));

for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
        g[r][c] = p9_1.grid[r][c];
        g[r][c + 11] = p9_2.grid[r][c];
        g[r + 11][c] = p9_2.grid[r][c];
        g[r + 11][c + 11] = p9_1.grid[r][c];
    }
}

// Check row 8 of p9_1 (bottom) and col 8 of p9_1 (right):
console.log("p9_1 row 8:", p9_1.grid[8].join(" "));
console.log("p9_1 col 8:", p9_1.grid.map(r => r[8]).join(" "));
console.log("p9_2 row 0:", p9_2.grid[0].join(" "));
console.log("p9_2 col 0:", p9_2.grid.map(r => r[0]).join(" "));
