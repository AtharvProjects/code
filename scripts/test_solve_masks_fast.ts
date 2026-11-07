import { buildWordCatalog, extractSlotsFromMask, solveGridSlotsFast } from "../services/dynamicCrosswordSolver";
import { ALL_USER_1000_WORDS } from "../services/userLexicon1000";
import { MARATHI_DICTIONARY } from "../services/marathiDictionary";
import { MasterGridPuzzle } from "../types";

const catalog = buildWordCatalog();

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

export function solveComponentMask(mask: string[], size: number, baseSeed: number = 1) {
    const slots = extractSlotsFromMask(mask);
    const comps = getConnectedComponents(slots);

    const fullMatrix: (string | null)[][] = Array(size).fill(null).map(() => Array(size).fill(null));
    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            if (mask[r][c] === '#') fullMatrix[r][c] = '#';
        }
    }

    const used = new Set<string>();
    const allPlaced: any[] = [];

    // Sort components: largest first to maximize chance
    const indexedComps = comps.map((comp, idx) => ({ comp, idx })).sort((a, b) => b.comp.length - a.comp.length);

    for (let i = 0; i < indexedComps.length; i++) {
        const { comp, idx } = indexedComps[i];
        let solved = null;
        for (let trial = 0; trial < 25; trial++) {
            const seed = baseSeed * 97 + idx * 31 + trial * 17 + 1;
            solved = solveGridSlotsFast(comp, size, catalog, used, seed);
            if (solved) break;
        }

        if (!solved) {
            console.log(`Failed on component of size ${comp.length}`);
            return null;
        }

        for (const p of solved.placedWords) {
            used.add(p.entry.word);
            allPlaced.push(p);
            for (let k = 0; k < p.slot.len; k++) {
                const cell = p.slot.cells[k];
                fullMatrix[cell.r][cell.c] = p.entry.graphemes[k];
            }
        }
    }

    const gridClean: string[][] = fullMatrix.map(row => row.map(cell => cell || '#'));
    return { grid: gridClean, placedWords: allPlaced };
}

// Test solving 20x20 and 25x25
import { buildMask20, buildMask25 } from "./design_perfect_masks_20_25";

console.log("Testing 20x20 solving...");
const t0 = performance.now();
const sol20 = solveComponentMask(buildMask20(), 20, 11);
console.log("20x20 solved in", (performance.now() - t0).toFixed(1), "ms. Solved:", sol20 !== null);

console.log("Testing 25x25 solving...");
const t1 = performance.now();
const sol25 = solveComponentMask(buildMask25(), 25, 17);
console.log("25x25 solved in", (performance.now() - t1).toFixed(1), "ms. Solved:", sol25 !== null);
