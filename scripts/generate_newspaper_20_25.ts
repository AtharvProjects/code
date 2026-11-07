import { extractSlotsFromMask, buildWordCatalog, solveGridSlotsFast } from "../services/dynamicCrosswordSolver";
import { validateGridCompletely } from "./solveAllSizesPerfect";

const catalog = buildWordCatalog();

function makeProfessionalMask(N: number, targetCenterBlacks: number = 4): string[] | null {
    const mask = Array(N).fill(null).map(() => Array(N).fill('0'));

    // Base lattice: standard newspaper grid pattern
    // Every 4th cell or symmetrical intervals
    for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
            if ((r % 2 === 1 && c % 2 === 1)) {
                mask[r][c] = '#';
                mask[N - 1 - r][N - 1 - c] = '#';
            }
        }
    }

    // If N is 20, center rows are 9 and 10.
    // If N is 25, center row is 12.
    // Let us enforce the center row black count!
    if (N === 20) {
        // We want exactly 4 black blocks in row 9, row 10, col 9, col 10!
        // In row 9 and 10, reset to 0 and put 4 blacks
        const centerBlackCols = [3, 7, 12, 16];
        for (let c = 0; c < N; c++) {
            mask[9][c] = centerBlackCols.includes(c) ? '#' : '0';
            mask[10][c] = centerBlackCols.includes(c) ? '#' : '0';
            mask[c][9] = centerBlackCols.includes(c) ? '#' : '0';
            mask[c][10] = centerBlackCols.includes(c) ? '#' : '0';
        }
    } else if (N === 25) {
        // Center row is 12, center col is 12
        const centerBlackCols = [4, 9, 15, 20];
        for (let c = 0; c < N; c++) {
            mask[12][c] = centerBlackCols.includes(c) ? '#' : '0';
            mask[c][12] = centerBlackCols.includes(c) ? '#' : '0';
        }
    }

    // Break any slot with length > 5
    let changed = true;
    let iters = 0;
    while (changed && iters < 80) {
        changed = false;
        iters++;
        const strMask = mask.map(row => row.join(''));
        const slots = extractSlotsFromMask(strMask);
        for (const s of slots) {
            if (s.len > 5) {
                const midIdx = Math.floor(s.len / 2);
                const cell = s.cells[midIdx];
                // Do not add black in center rows/cols if it would change their count!
                if (N === 20 && (cell.r === 9 || cell.r === 10 || cell.c === 9 || cell.c === 10)) {
                    continue;
                }
                if (N === 25 && (cell.r === 12 || cell.c === 12)) {
                    continue;
                }
                if (mask[cell.r][cell.c] !== '#') {
                    mask[cell.r][cell.c] = '#';
                    mask[N - 1 - cell.r][N - 1 - cell.c] = '#';
                    changed = true;
                    break;
                }
            }
        }
    }

    // Remove any single letter (where both across and down have len < 2)
    const strMask = mask.map(row => row.join(''));
    const slots = extractSlotsFromMask(strMask);
    const cellCovered = new Set<string>();
    for (const s of slots) {
        for (const c of s.cells) {
            cellCovered.add(`${c.r},${c.c}`);
        }
    }

    for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
            if (mask[r][c] === '0' && !cellCovered.has(`${r},${c}`)) {
                mask[r][c] = '#';
                mask[N - 1 - r][N - 1 - c] = '#';
            }
        }
    }

    return mask.map(row => row.join(''));
}

console.log("Testing makeProfessionalMask...");
const m20 = makeProfessionalMask(20)!;
console.log("20x20 row 9 blacks:", (m20[9].match(/#/g) || []).length);
console.log("20x20 row 10 blacks:", (m20[10].match(/#/g) || []).length);
const slots20 = extractSlotsFromMask(m20);
console.log("20x20 slots:", slots20.length);
console.log("20x20 min len:", Math.min(...slots20.map(s => s.len)), "max len:", Math.max(...slots20.map(s => s.len)));

console.log("Solving 20x20 mask...");
const t0 = performance.now();
const sol20 = solveGridSlotsFast(slots20, 20, catalog, new Set(), 42);
const t1 = performance.now();
console.log("Solved in", (t1 - t0).toFixed(1), "ms? ", !!sol20);
if (sol20) {
    const val = validateGridCompletely(sol20.grid);
    console.log("20x20 validated completely?", val.valid, "total words:", val.clues?.length);
    sol20.grid.forEach(r => console.log("  " + r.join(" ")));
}

const m25 = makeProfessionalMask(25)!;
console.log("25x25 row 12 blacks:", (m25[12].match(/#/g) || []).length);
let col12B = 0;
for (let r = 0; r < 25; r++) if (m25[r][12] === '#') col12B++;
console.log("25x25 col 12 blacks:", col12B);
const slots25 = extractSlotsFromMask(m25);
console.log("25x25 slots:", slots25.length);
console.log("25x25 min len:", Math.min(...slots25.map(s => s.len)), "max len:", Math.max(...slots25.map(s => s.len)));
