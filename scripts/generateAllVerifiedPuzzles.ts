import fs from 'fs';
import { 
    buildWordCatalog, 
    solveGridSlotsFast, 
    extractSlotsFromMask, 
    INTERLOCKING_MASKS_10X10,
    INTERLOCKING_MASKS_12X12 
} from '../services/dynamicCrosswordSolver';
import { MARATHI_DICTIONARY } from '../services/marathiDictionary';
import { ALL_USER_1000_WORDS } from '../services/userLexicon1000';
import { MasterGridPuzzle } from '../types';

const catalog = buildWordCatalog();
const userWordsSet = new Set(ALL_USER_1000_WORDS);
const dictWordsSet = new Set(Object.keys(MARATHI_DICTIONARY));

function isValidWord(w: string): boolean {
    return userWordsSet.has(w) || dictWordsSet.has(w);
}

function getWordClue(w: string): string {
    if (MARATHI_DICTIONARY[w]) return MARATHI_DICTIONARY[w];
    const item = catalog.find(x => x.word === w);
    return item ? item.clue : 'अस्सल मराठी शब्द';
}

function validateAndExtractClues(grid: string[][]): { valid: boolean; reason?: string; clues?: { word: string; clue: string }[] } {
    const N = grid.length;
    const acrossWords: { word: string; r: number; c: number }[] = [];
    const downWords: { word: string; r: number; c: number }[] = [];

    // Across
    for (let r = 0; r < N; r++) {
        let cur = '';
        let startC = 0;
        for (let c = 0; c < N; c++) {
            const cell = grid[r][c];
            if (cell !== '#') {
                if (!cur) startC = c;
                cur += cell;
            } else {
                if (cur.length > 1) acrossWords.push({ word: cur, r, c: startC });
                else if (cur.length === 1) return { valid: false, reason: `Single across letter at (${r},${startC}): "${cur}"` };
                cur = '';
            }
        }
        if (cur.length > 1) acrossWords.push({ word: cur, r, c: startC });
        else if (cur.length === 1) return { valid: false, reason: `Single across letter at (${r},${startC}): "${cur}"` };
    }

    // Down
    for (let c = 0; c < N; c++) {
        let cur = '';
        let startR = 0;
        for (let r = 0; r < N; r++) {
            const cell = grid[r][c];
            if (cell !== '#') {
                if (!cur) startR = r;
                cur += cell;
            } else {
                if (cur.length > 1) downWords.push({ word: cur, r: startR, c });
                else if (cur.length === 1) return { valid: false, reason: `Single down letter at (${startR},${c}): "${cur}"` };
                cur = '';
            }
        }
        if (cur.length > 1) downWords.push({ word: cur, r: startR, c });
        else if (cur.length === 1) return { valid: false, reason: `Single down letter at (${startR},${c}): "${cur}"` };
    }

    const allWords = [...acrossWords, ...downWords];
    for (const w of allWords) {
        if (!isValidWord(w.word)) {
            return { valid: false, reason: `Unknown Marathi word: "${w.word}"` };
        }
    }

    const seen = new Set<string>();
    const clues: { word: string; clue: string }[] = [];
    for (const item of allWords) {
        if (!seen.has(item.word)) {
            seen.add(item.word);
            clues.push({ word: item.word, clue: getWordClue(item.word) });
        }
    }

    return { valid: true, clues };
}

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

export function solveMaskWithComponents(
    mask: string[],
    gridSize: number,
    baseSeed: number = 1
): { grid: string[][]; clues: { word: string; clue: string }[] } | null {
    const slots = extractSlotsFromMask(mask);
    const comps = getConnectedComponents(slots);

    const fullMatrix: (string | null)[][] = Array(gridSize).fill(null).map(() => Array(gridSize).fill(null));
    for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
            if (mask[r][c] === '#') fullMatrix[r][c] = '#';
        }
    }

    const used = new Set<string>();

    for (let cIdx = 0; cIdx < comps.length; cIdx++) {
        const comp = comps[cIdx];
        let solvedComp = null;

        for (let tryIdx = 0; tryIdx < 12; tryIdx++) {
            const seed = baseSeed * 37 + cIdx * 19 + tryIdx * 11;
            solvedComp = solveGridSlotsFast(comp, gridSize, catalog, used, seed);
            if (solvedComp) break;
        }

        if (!solvedComp) {
            return null;
        }

        // Apply letters from solvedComp into fullMatrix
        for (const p of solvedComp.placedWords) {
            used.add(p.entry.word);
            for (let i = 0; i < p.slot.len; i++) {
                const cell = p.slot.cells[i];
                fullMatrix[cell.r][cell.c] = p.entry.graphemes[i];
            }
        }
    }

    const gridClean: string[][] = fullMatrix.map(row => row.map(cell => cell || '#'));
    const val = validateAndExtractClues(gridClean);
    if (!val.valid || !val.clues) {
        return null;
    }

    return { grid: gridClean, clues: val.clues };
}

// Generate Large Grids: 20x20 and 25x25
export function generateVerified20x20(variant: number): MasterGridPuzzle | null {
    const m10 = INTERLOCKING_MASKS_10X10[variant % INTERLOCKING_MASKS_10X10.length];
    const g20: string[][] = Array(20).fill(null).map(() => Array(20).fill('0'));

    for (let r = 0; r < 10; r++) {
        for (let c = 0; c < 10; c++) {
            g20[r][c] = m10[r][c];
            g20[r][c + 10] = m10[r][9 - c];
            g20[r + 10][c] = m10[9 - r][c];
            g20[r + 10][c + 10] = m10[9 - r][9 - c];
        }
    }

    // Break any slot > 5 symmetrically
    let changed = true;
    while (changed) {
        changed = false;
        const strM = g20.map(r => r.join(''));
        const slots = extractSlotsFromMask(strM);
        for (const s of slots) {
            if (s.len > 5) {
                const mid = Math.floor(s.len / 2);
                const cell = s.cells[mid];
                g20[cell.r][cell.c] = '#';
                g20[19 - cell.r][19 - cell.c] = '#';
                changed = true;
                break;
            }
        }
    }

    const mask = g20.map(r => r.join(''));
    const res = solveMaskWithComponents(mask, 20, variant * 23 + 5);
    if (!res) return null;

    return {
        id: `p20_verified_${variant}`,
        title: `महाशब्दवेध २०x२० (संच #${variant + 1})`,
        theme: "अस्सल मराठी महाशब्दवेध",
        gridSize: 20,
        description: "२०x२० आकाराचे भव्य मराठी वृत्तपत्रीय शब्दकोडे",
        grid: res.grid,
        clues: res.clues,
        totalWordCount: res.clues.length
    };
}

export function generateVerified25x25(variant: number): MasterGridPuzzle | null {
    const m12 = INTERLOCKING_MASKS_12X12[variant % INTERLOCKING_MASKS_12X12.length];
    const g25: string[][] = Array(25).fill(null).map(() => Array(25).fill('0'));

    for (let r = 0; r < 12; r++) {
        for (let c = 0; c < 12; c++) {
            g25[r][c] = m12[r][c];
            g25[r][24 - c] = m12[r][c];
            g25[24 - r][c] = m12[r][c];
            g25[24 - r][24 - c] = m12[r][c];
        }
    }

    // Central cross dividers
    for (let i = 0; i < 25; i++) {
        if (i % 2 === 0) {
            g25[12][i] = '#';
            g25[i][12] = '#';
        }
    }

    let changed = true;
    while (changed) {
        changed = false;
        const strM = g25.map(r => r.join(''));
        const slots = extractSlotsFromMask(strM);
        for (const s of slots) {
            if (s.len > 5) {
                const mid = Math.floor(s.len / 2);
                const cell = s.cells[mid];
                g25[cell.r][cell.c] = '#';
                g25[24 - cell.r][24 - cell.c] = '#';
                changed = true;
                break;
            }
        }
    }

    const mask = g25.map(r => r.join(''));
    const res = solveMaskWithComponents(mask, 25, variant * 31 + 7);
    if (!res) return null;

    return {
        id: `p25_verified_${variant}`,
        title: `महासम्राट शब्दवेध २५x२५ (संच #${variant + 1})`,
        theme: "अस्सल मराठी महासम्राट शब्दवेध",
        gridSize: 25,
        description: "२५x२५ आकाराचे भव्य व आव्हानात्मक मराठी वृत्तपत्रीय शब्दकोडे",
        grid: res.grid,
        clues: res.clues,
        totalWordCount: res.clues.length
    };
}

async function main() {
    console.log("Generating 20x20 and 25x25 verified puzzles...");
    const p20_0 = generateVerified20x20(0);
    console.log("20x20 #0:", p20_0 ? `Success with ${p20_0.totalWordCount} words` : "Failed");
    const p20_1 = generateVerified20x20(1);
    console.log("20x20 #1:", p20_1 ? `Success with ${p20_1.totalWordCount} words` : "Failed");

    const p25_0 = generateVerified25x25(0);
    console.log("25x25 #0:", p25_0 ? `Success with ${p25_0.totalWordCount} words` : "Failed");
    const p25_1 = generateVerified25x25(1);
    console.log("25x25 #1:", p25_1 ? `Success with ${p25_1.totalWordCount} words` : "Failed");

    const verifiedLarge = {
        p20: [p20_0, p20_1].filter(Boolean),
        p25: [p25_0, p25_1].filter(Boolean)
    };

    fs.writeFileSync('verified_large_puzzles.json', JSON.stringify(verifiedLarge, null, 2));
    console.log("Saved verified_large_puzzles.json!");
}

main().catch(console.error);
