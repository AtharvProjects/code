import { extractSlotsFromMask, buildWordCatalog } from "../services/dynamicCrosswordSolver";
import { solveLargeGridFast } from "./fast_large_solver";
import { checkAllWordsValid } from "./solve_large_guaranteed";
import { MasterGridPuzzle } from "../types";

const catalog = buildWordCatalog();

console.log("Starting large puzzle builder...");

// Mask for 20x20 with exact 4 blacks in rows 9,10 and cols 9,10
export function createMask20(): string[] {
    const N = 20;
    const g = Array(N).fill(null).map(() => Array(N).fill('0'));

    // Set exactly 4 blacks in row 9, 10, col 9, 10 at 3, 7, 12, 16
    const mid = [3, 7, 12, 16];
    mid.forEach(c => {
        g[9][c] = '#';
        g[10][c] = '#';
        g[c][9] = '#';
        g[c][10] = '#';
    });

    // In rows 0, 2, 4, 6, 8, 11, 13, 15, 17, 19:
    // Place blacks at 4, 15 (symmetrical)
    [0, 2, 6, 8, 11, 13, 17, 19].forEach(r => {
        g[r][4] = '#';
        g[r][15] = '#';
    });

    [4, 15].forEach(r => {
        g[r][2] = '#';
        g[r][6] = '#';
        g[r][13] = '#';
        g[r][17] = '#';
    });

    // In odd rows, place alternating checking blocks:
    for (let r = 1; r < N; r += 2) {
        if (r === 9) continue;
        for (let c = 1; c < N; c += 2) {
            if (c === 9) continue;
            g[r][c] = '#';
            g[N - 1 - r][N - 1 - c] = '#';
        }
    }

    // Split any slots > 5 while protecting rows 9, 10 and cols 9, 10
    let changed = true;
    let iters = 0;
    while (changed && iters < 200) {
        changed = false;
        iters++;
        const strMask = g.map(row => row.join(''));
        const slots = extractSlotsFromMask(strMask);
        for (const s of slots) {
            if (s.len > 5) {
                const candidates = s.cells.filter(cell => cell.r !== 9 && cell.r !== 10 && cell.c !== 9 && cell.c !== 10);
                if (candidates.length > 0) {
                    let best = candidates[Math.floor(candidates.length / 2)];
                    for (const cand of candidates) {
                        const idx = s.cells.indexOf(cand);
                        if (idx >= 2 && s.len - 1 - idx >= 2) {
                            best = cand;
                            break;
                        }
                    }
                    g[best.r][best.c] = '#';
                    g[N - 1 - best.r][N - 1 - best.c] = '#';
                    changed = true;
                    break;
                }
            }
        }
    }

    // Remove any isolated cells (!h && !v)
    for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
            if (g[r][c] === '0' && r !== 9 && r !== 10 && c !== 9 && c !== 10) {
                const h = (c > 0 && g[r][c - 1] === '0') || (c < N - 1 && g[r][c + 1] === '0');
                const v = (r > 0 && g[r - 1][c] === '0') || (r < N - 1 && g[r + 1][c] === '0');
                if (!h && !v) {
                    g[r][c] = '#';
                    g[N - 1 - r][N - 1 - c] = '#';
                }
            }
        }
    }

    return g.map(row => row.join(''));
}

const m20 = createMask20();
console.log("=== 20x20 MASK CHECK ===");
console.log("Row 9 blacks:", m20[9].split('').filter(c => c === '#').length);
console.log("Row 10 blacks:", m20[10].split('').filter(c => c === '#').length);
console.log("Col 9 blacks:", m20.map(r => r[9]).filter(c => c === '#').length);
console.log("Col 10 blacks:", m20.map(r => r[10]).filter(c => c === '#').length);
const slots20 = extractSlotsFromMask(m20);
console.log("Total slots 20:", slots20.length);
console.log("Slot lens min/max:", Math.min(...slots20.map(s => s.len)), Math.max(...slots20.map(s => s.len)));
console.log("Full black rows:", m20.some(r => r.split('').every(c => c === '#')));
console.log("Full black cols:", Array(20).fill(0).some((_, c) => m20.every(r => r[c] === '#')));
