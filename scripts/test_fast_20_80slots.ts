import { buildWordCatalog, extractSlotsFromMask } from "../services/dynamicCrosswordSolver";
import { solveLargeGridFast } from "./fast_large_solver";

const catalog = buildWordCatalog();

// Let us construct a 20x20 mask with ~80 slots (words mostly length 4..5)
// and exact 4 blacks in rows 9, 10, cols 9, 10:

function makeMask20_80(): string[] {
    const N = 20;
    const g = Array(N).fill(null).map(() => Array(N).fill('0'));

    // Exact 4 blacks in rows 9, 10, cols 9, 10:
    const mid = [3, 7, 12, 16];
    mid.forEach(c => {
        g[9][c] = '#';
        g[10][c] = '#';
        g[c][9] = '#';
        g[c][10] = '#';
    });

    // In other rows, add 3-4 blacks symmetrically
    const pattern = [
        [4, 15],
        [1, 5, 14, 18],
        [4, 15],
        [2, 6, 13, 17],
        [4, 15],
        [1, 5, 14, 18],
        [4, 15],
        [2, 6, 13, 17],
        [4, 15]
    ];

    for (let r = 0; r < 9; r++) {
        pattern[r].forEach(c => {
            g[r][c] = '#';
            g[N - 1 - r][N - 1 - c] = '#';
        });
    }

    return g.map(row => row.join(''));
}

const m = makeMask20_80();
const slots = extractSlotsFromMask(m);
console.log("Slots count:", slots.length);
console.log("Min len:", Math.min(...slots.map(s => s.len)), "Max len:", Math.max(...slots.map(s => s.len)));

// Check black counts
console.log("Row 9 blacks:", m[9].split('').filter(c => c === '#').length);
console.log("Row 10 blacks:", m[10].split('').filter(c => c === '#').length);
console.log("Col 9 blacks:", m.map(r => r[9]).filter(c => c === '#').length);
console.log("Col 10 blacks:", m.map(r => r[10]).filter(c => c === '#').length);

const bad = slots.filter(s => s.len > 5 || s.len < 2);
console.log("Bad slots (>5 or <2):", bad.length);
if (bad.length > 0) {
    console.log(bad);
}
