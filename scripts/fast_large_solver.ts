import { buildWordCatalog, extractSlotsFromMask, WordEntry, GridSlot } from "../services/dynamicCrosswordSolver";
import { validateGridCompletely } from "./solveAllSizesPerfect";

const catalog = buildWordCatalog();

// Forward-checking fast crossword solver for large grids (20x20, 25x25)
export function solveLargeGridFast(
    slots: GridSlot[],
    gridSize: number,
    baseCatalog: WordEntry[] = catalog,
    maxSteps: number = 250000,
    seed: number = 42
): { grid: string[][]; words: { word: string; clue: string }[] } | null {
    let rndSeed = seed;
    const rnd = () => {
        rndSeed = (rndSeed * 9301 + 49297) % 233280;
        return rndSeed / 233280;
    };

    // Build letter-position index: Map<`${len}:${pos}:${char}`, WordEntry[]>
    const index = new Map<string, WordEntry[]>();
    const byLen = new Map<number, WordEntry[]>();

    for (const item of baseCatalog) {
        const len = item.length;
        if (!byLen.has(len)) byLen.set(len, []);
        byLen.get(len)!.push(item);

        for (let i = 0; i < len; i++) {
            const key = `${len}:${i}:${item.graphemes[i]}`;
            if (!index.has(key)) index.set(key, []);
            index.get(key)!.push(item);
        }
    }

    // Precalculate slot intersections
    // For each slot, find which other slots intersect it, and at which cell
    const cellToSlots = new Map<string, { slotIdx: number; pos: number }[]>();
    slots.forEach((s, sIdx) => {
        s.cells.forEach((c, pos) => {
            const key = `${c.r},${c.c}`;
            if (!cellToSlots.has(key)) cellToSlots.set(key, []);
            cellToSlots.get(key)!.push({ slotIdx: sIdx, pos });
        });
    });

    const intersections: { slotIdx: number; myPos: number; otherPos: number }[][] = slots.map(() => []);
    for (const list of cellToSlots.values()) {
        if (list.length === 2) {
            const [a, b] = list;
            intersections[a.slotIdx].push({ slotIdx: b.slotIdx, myPos: a.pos, otherPos: b.pos });
            intersections[b.slotIdx].push({ slotIdx: a.slotIdx, myPos: b.pos, otherPos: a.pos });
        }
    }

    const matrix: (string | null)[][] = Array(gridSize).fill(null).map(() => Array(gridSize).fill(null));
    const assignedWords = new Set<string>();
    const assignedSlotEntry: (WordEntry | null)[] = Array(slots.length).fill(null);

    function getCandidates(sIdx: number): WordEntry[] {
        const slot = slots[sIdx];
        const constrained: { pos: number; char: string }[] = [];
        for (let i = 0; i < slot.len; i++) {
            const cell = slot.cells[i];
            const ch = matrix[cell.r][cell.c];
            if (ch !== null) constrained.push({ pos: i, char: ch });
        }

        if (constrained.length === 0) {
            return byLen.get(slot.len) || [];
        }

        let smallestList: WordEntry[] | null = null;
        for (const con of constrained) {
            const key = `${slot.len}:${con.pos}:${con.char}`;
            const list = index.get(key) || [];
            if (!smallestList || list.length < smallestList.length) smallestList = list;
        }

        if (!smallestList || smallestList.length === 0) return [];
        return smallestList.filter(item => {
            for (const con of constrained) {
                if (item.graphemes[con.pos] !== con.char) return false;
            }
            return true;
        });
    }

    let steps = 0;

    function backtrack(): boolean {
        steps++;
        if (steps > maxSteps) return false;

        // MRV: select unassigned slot with minimum remaining candidates
        let bestSlotIdx = -1;
        let bestCandidates: WordEntry[] | null = null;
        let minCand = Infinity;

        for (let i = 0; i < slots.length; i++) {
            if (assignedSlotEntry[i] !== null) continue;
            const cands = getCandidates(i).filter(w => !assignedWords.has(w.word));
            if (cands.length === 0) return false; // Forward check failure

            if (cands.length < minCand) {
                minCand = cands.length;
                bestSlotIdx = i;
                bestCandidates = cands;
                if (minCand === 1) break; // Most constrained immediate pick
            }
        }

        if (bestSlotIdx === -1 || !bestCandidates) return true; // All slots assigned!

        // Seeded shuffle of candidates for diversity
        bestCandidates.sort(() => rnd() - 0.5);

        const slot = slots[bestSlotIdx];

        for (const wordEntry of bestCandidates) {
            // Check if placing this word would cause any intersecting unassigned slot to have 0 candidates
            let forwardCheckOk = true;
            const savedCells: { r: number; c: number; prev: string | null }[] = [];

            for (let i = 0; i < slot.len; i++) {
                const cell = slot.cells[i];
                savedCells.push({ r: cell.r, c: cell.c, prev: matrix[cell.r][cell.c] });
                matrix[cell.r][cell.c] = wordEntry.graphemes[i];
            }

            assignedWords.add(wordEntry.word);
            assignedSlotEntry[bestSlotIdx] = wordEntry;

            // Check intersecting unassigned slots
            for (const inter of intersections[bestSlotIdx]) {
                if (assignedSlotEntry[inter.slotIdx] === null) {
                    const remaining = getCandidates(inter.slotIdx).filter(w => !assignedWords.has(w.word));
                    if (remaining.length === 0) {
                        forwardCheckOk = false;
                        break;
                    }
                }
            }

            if (forwardCheckOk) {
                if (backtrack()) return true;
            }

            // Undo
            assignedWords.delete(wordEntry.word);
            assignedSlotEntry[bestSlotIdx] = null;
            for (const sc of savedCells) {
                matrix[sc.r][sc.c] = sc.prev;
            }
        }

        return false;
    }

    const success = backtrack();
    if (!success) return null;

    const finalGrid: string[][] = Array(gridSize).fill(null).map((_, r) =>
        Array(gridSize).fill(null).map((_, c) => matrix[r][c] || '#')
    );

    const words: { word: string; clue: string }[] = [];
    const seen = new Set<string>();
    for (const se of assignedSlotEntry) {
        if (se && !seen.has(se.word)) {
            seen.add(se.word);
            words.push({ word: se.word, clue: se.clue });
        }
    }

    return { grid: finalGrid, words };
}

console.log("solveLargeGridFast loaded with full Forward Checking & MRV.");
