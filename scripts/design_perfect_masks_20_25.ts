import { extractSlotsFromMask, buildWordCatalog } from "../services/dynamicCrosswordSolver";
import { isMaskValidNoSingles } from "./solveAllSizesPerfect";

// Build a 20x20 mask
// Symmetrical (180 degree rotation)
// Row 9 has exactly 4 blacks
// Row 10 has exactly 4 blacks
// Col 9 has exactly 4 blacks
// Col 10 has exactly 4 blacks
// All slot lengths between 2 and 5

export function buildMask20(): string[] {
    const N = 20;
    const g = Array(N).fill(null).map(() => Array(N).fill('0'));

    // Set exactly 4 blacks in row 9, 10, col 9, 10
    const midBlacks = [3, 7, 12, 16];
    midBlacks.forEach(c => {
        g[9][c] = '#';
        g[10][c] = '#';
        g[c][9] = '#';
        g[c][10] = '#';
    });

    // In quadrants, add initial blacks
    for (let r = 0; r < 9; r += 2) {
        for (let c = 0; c < 9; c += 2) {
            if ((r + c) % 4 === 2) {
                g[r][c] = '#';
                g[N - 1 - r][N - 1 - c] = '#';
                g[r][N - 1 - c] = '#';
                g[N - 1 - r][c] = '#';
            }
        }
    }

    // Split any slot > 5 while keeping rows 9, 10 and cols 9, 10 untouched
    let changed = true;
    let iters = 0;
    while (changed && iters < 100) {
        changed = false;
        iters++;
        const strMask = g.map(row => row.join(''));
        const slots = extractSlotsFromMask(strMask);
        for (const s of slots) {
            if (s.len > 5) {
                // Find a cell in s that is NOT in rows 9, 10 or cols 9, 10
                const candidates = s.cells.filter(c => c.r !== 9 && c.r !== 10 && c.c !== 9 && c.c !== 10);
                if (candidates.length > 0) {
                    const mid = candidates[Math.floor(candidates.length / 2)];
                    g[mid.r][mid.c] = '#';
                    g[N - 1 - mid.r][N - 1 - mid.c] = '#';
                    changed = true;
                    break;
                }
            }
        }
    }

    return g.map(row => row.join(''));
}

const m20 = buildMask20();
const slots20 = extractSlotsFromMask(m20);
console.log("20x20 slots count:", slots20.length);
console.log("20x20 slot lengths min/max:", Math.min(...slots20.map(s => s.len)), Math.max(...slots20.map(s => s.len)));
console.log("20x20 row 9 blacks:", m20[9].split('').filter(c => c === '#').length);
console.log("20x20 row 10 blacks:", m20[10].split('').filter(c => c === '#').length);
console.log("20x20 col 9 blacks:", m20.map(r => r[9]).filter(c => c === '#').length);
console.log("20x20 col 10 blacks:", m20.map(r => r[10]).filter(c => c === '#').length);
export function buildMask25(): string[] {
    const N = 25;
    const g = Array(N).fill(null).map(() => Array(N).fill('0'));

    // Set exactly 4 blacks in row 12 and col 12
    const midBlacks = [4, 9, 15, 20];
    midBlacks.forEach(c => {
        g[12][c] = '#';
        g[c][12] = '#';
    });

    // In quadrants, add initial blacks
    for (let r = 0; r < 12; r += 2) {
        for (let c = 0; c < 12; c += 2) {
            if ((r + c) % 4 === 2) {
                g[r][c] = '#';
                g[N - 1 - r][N - 1 - c] = '#';
                g[r][N - 1 - c] = '#';
                g[N - 1 - r][c] = '#';
            }
        }
    }

    // Split any slot > 5 while keeping row 12 and col 12 untouched
    let changed = true;
    let iters = 0;
    while (changed && iters < 100) {
        changed = false;
        iters++;
        const strMask = g.map(row => row.join(''));
        const slots = extractSlotsFromMask(strMask);
        for (const s of slots) {
            if (s.len > 5) {
                const candidates = s.cells.filter(c => c.r !== 12 && c.c !== 12);
                if (candidates.length > 0) {
                    const mid = candidates[Math.floor(candidates.length / 2)];
                    g[mid.r][mid.c] = '#';
                    g[N - 1 - mid.r][N - 1 - mid.c] = '#';
                    changed = true;
                    break;
                }
            }
        }
    }

    return g.map(row => row.join(''));
}

const m25 = buildMask25();
const slots25 = extractSlotsFromMask(m25);
console.log("=== 25x25 ===");
console.log("25x25 slots count:", slots25.length);
console.log("25x25 slot lengths min/max:", Math.min(...slots25.map(s => s.len)), Math.max(...slots25.map(s => s.len)));
function getConnectedComponents(slots: any[]) {
    const cellToSlots = new Map<string, number[]>();
    slots.forEach((s, sIdx) => {
        s.cells.forEach((c: any) => {
            const key = `${c.r},${c.c}`;
            if (!cellToSlots.has(key)) cellToSlots.set(key, []);
            cellToSlots.get(key)!.push(sIdx);
        });
    });

    const adj = Array(slots.length).fill(null).map(() => [] as number[]);
    for (const list of cellToSlots.values()) {
        for (let i = 0; i < list.length; i++) {
            for (let j = i + 1; j < list.length; j++) {
                adj[list[i]].push(list[j]);
                adj[list[j]].push(list[i]);
            }
        }
    }

    const visited = new Set<number>();
    const components: any[][] = [];
    for (let i = 0; i < slots.length; i++) {
        if (visited.has(i)) continue;
        const comp: any[] = [];
        const queue = [i];
        visited.add(i);
        while (queue.length > 0) {
            const curr = queue.shift()!;
            comp.push(slots[curr]);
            for (const neighbor of adj[curr]) {
                if (!visited.has(neighbor)) {
                    visited.add(neighbor);
                    queue.push(neighbor);
                }
            }
        }
        components.push(comp);
    }
    return components;
}

const comps20 = getConnectedComponents(slots20);
console.log("20x20 components count:", comps20.length);
console.log("20x20 component sizes:", comps20.map(c => c.length));

const comps25 = getConnectedComponents(slots25);
console.log("25x25 components count:", comps25.length);
console.log("25x25 component sizes:", comps25.map(c => c.length));



