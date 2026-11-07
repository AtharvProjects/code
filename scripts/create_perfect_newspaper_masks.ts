import { extractSlotsFromMask, buildWordCatalog, solveGridSlotsFast } from "../services/dynamicCrosswordSolver";
import { ALL_USER_1000_WORDS } from "../services/userLexicon1000";
import { MARATHI_DICTIONARY } from "../services/marathiDictionary";

const catalog = buildWordCatalog();

// Let us construct a 20x20 mask:
export function getNewspaperMask20(): string[] {
    const N = 20;
    // We want 180-degree rotational symmetry: cell (r, c) == cell (N - 1 - r, N - 1 - c)
    // Row 9 has exactly 4 blacks at 3, 7, 12, 16
    // Since row 10 is N - 1 - 9 = 19 - 9 = 10:
    // By 180-deg symmetry: cell (10, c) == cell (9, N - 1 - c)
    // N - 1 - [3, 7, 12, 16] = [16, 12, 7, 3] = [3, 7, 12, 16]!
    // So row 10 AUTOMATICALLY has exactly 4 blacks at 3, 7, 12, 16!
    // And if we also make it 4-fold symmetric or transpose symmetric,
    // Col 9 and Col 10 will ALSO have exactly 4 blacks at 3, 7, 12, 16!

    const g: string[][] = Array(N).fill(null).map(() => Array(N).fill('0'));

    // Even rows: runs of 3..5 separated by #
    // Odd rows: alternating 0 and #
    const evenTemplate = [
        "0000#0000#0000#0000#", // 4 blacks: 4, 9, 14, 19
        "0000#0000#0000#0000#",
        "#000#0000#0000#00000", // 3 blacks: 0, 4, 9
        "000#000#0000#000#000", // 4 blacks: 3, 7, 12, 16 (Row 9 template!)
    ];

    // Let us construct a clean symmetrical grid:
    // Row 9:
    const r9 = "000#000#0000#000#000";
    for (let c = 0; c < N; c++) {
        g[9][c] = r9[c];
        g[10][N - 1 - c] = r9[c];
        g[c][9] = r9[c];
        g[N - 1 - c][10] = r9[c];
    }

    // Now for rows 0..8, cols 0..8:
    // Odd rows (1, 3, 5, 7): alternating checking cells
    // Even rows (0, 2, 4, 6, 8): across words
    // Let us define rows 0..8:
    const half = [
        "0000#0000", // 0
        "0#0#0#0#0", // 1
        "0000#0000", // 2
        "0#0#0#0#0", // 3
        "#000#0000", // 4
        "0#0#0#0#0", // 5
        "000#0000#", // 6
        "0#0#0#0#0", // 7
        "0000#0000"  // 8
    ];

    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            const ch = half[r][c];
            g[r][c] = ch;
            // Reflect into other 3 quadrants
            g[r][N - 1 - c] = half[r][8 - c];
            g[N - 1 - r][c] = half[8 - r][c];
            g[N - 1 - r][N - 1 - c] = half[8 - r][8 - c];
        }
    }

    // Now, split any slot > 5 symmetrically without touching rows 9, 10 or cols 9, 10
    let changed = true;
    let iters = 0;
    while (changed && iters < 200) {
        changed = false;
        iters++;
        const strMask = g.map(row => row.join(''));
        const curSlots = extractSlotsFromMask(strMask);
        for (const s of curSlots) {
            if (s.len > 5) {
                // Find candidates strictly inside quadrants (r not 9,10 and c not 9,10)
                const candidates = s.cells.filter(cell => cell.r !== 9 && cell.r !== 10 && cell.c !== 9 && cell.c !== 10);
                if (candidates.length > 0) {
                    // Pick a candidate that keeps both halves >= 2
                    let bestCand = candidates[Math.floor(candidates.length / 2)];
                    for (const cand of candidates) {
                        const idx = s.cells.indexOf(cand);
                        if (idx >= 2 && s.len - 1 - idx >= 2) {
                            bestCand = cand;
                            break;
                        }
                    }
                    g[bestCand.r][bestCand.c] = '#';
                    g[N - 1 - bestCand.r][N - 1 - bestCand.c] = '#';
                    changed = true;
                    break;
                }
            }
        }
    }

    // Remove any isolated single cell (!h && !v)
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

const m20 = getNewspaperMask20();
console.log("=== 20x20 Mask Details ===");
console.log("Row 9:", m20[9]);
console.log("Row 10:", m20[10]);
console.log("Row 9 blacks:", m20[9].split('').filter(c => c === '#').length);
console.log("Row 10 blacks:", m20[10].split('').filter(c => c === '#').length);
console.log("Col 9 blacks:", m20.map(r => r[9]).filter(c => c === '#').length);
console.log("Col 10 blacks:", m20.map(r => r[10]).filter(c => c === '#').length);

const slots = extractSlotsFromMask(m20);
console.log("Total slots:", slots.length);
console.log("Slot lengths min/max:", Math.min(...slots.map(s => s.len)), Math.max(...slots.map(s => s.len)));

// Print any slot > 5
const bad = slots.filter(s => s.len > 5 || s.len < 2);
console.log("Bad slots count:", bad.length);
if (bad.length > 0) {
    console.log(bad.map(b => `${b.id} len=${b.len}`));
}
