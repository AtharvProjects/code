import fs from 'fs';
import { 
    extractSlotsFromMask, 
    solveGridSlotsFast, 
    buildWordCatalog, 
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

function checkAndExtract(grid: string[][]): { valid: boolean; clues: { word: string; clue: string }[] } {
    const N = grid.length;
    const acrossWords: string[] = [];
    const downWords: string[] = [];

    for (let r = 0; r < N; r++) {
        let cur = '';
        for (let c = 0; c < N; c++) {
            if (grid[r][c] !== '#') {
                cur += grid[r][c];
            } else {
                if (cur.length >= 2) acrossWords.push(cur);
                else if (cur.length === 1) return { valid: false, clues: [] };
                cur = '';
            }
        }
        if (cur.length >= 2) acrossWords.push(cur);
        else if (cur.length === 1) return { valid: false, clues: [] };
    }

    for (let c = 0; c < N; c++) {
        let cur = '';
        for (let r = 0; r < N; r++) {
            if (grid[r][c] !== '#') {
                cur += grid[r][c];
            } else {
                if (cur.length >= 2) downWords.push(cur);
                else if (cur.length === 1) return { valid: false, clues: [] };
                cur = '';
            }
        }
        if (cur.length >= 2) downWords.push(cur);
        else if (cur.length === 1) return { valid: false, clues: [] };
    }

    const all = [...acrossWords, ...downWords];
    for (const w of all) {
        if (!isValidWord(w)) return { valid: false, clues: [] };
    }

    const seen = new Set<string>();
    const clues: { word: string; clue: string }[] = [];
    for (const w of all) {
        if (!seen.has(w)) {
            seen.add(w);
            clues.push({ word: w, clue: getWordClue(w) });
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

function solveMaskByComponents(
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

        for (let tryIdx = 0; tryIdx < 15; tryIdx++) {
            const seed = baseSeed * 37 + cIdx * 19 + tryIdx * 11 + 3;
            solvedComp = solveGridSlotsFast(comp, gridSize, catalog, used, seed);
            if (solvedComp) break;
        }

        if (!solvedComp) return null;

        for (const p of solvedComp.placedWords) {
            used.add(p.entry.word);
            for (let i = 0; i < p.slot.len; i++) {
                const cell = p.slot.cells[i];
                fullMatrix[cell.r][cell.c] = p.entry.graphemes[i];
            }
        }
    }

    const gridClean: string[][] = fullMatrix.map(row => row.map(cell => cell || '#'));
    const val = checkAndExtract(gridClean);
    if (!val.valid) return null;

    return { grid: gridClean, clues: val.clues };
}

// 5x5 Masks
const MASKS_5X5 = [
    [
        "##00#",
        "#0000",
        "00#00",
        "0000#",
        "#00##"
    ],
    [
        "#00##",
        "#0000",
        "00#00",
        "0000#",
        "##00#"
    ],
    [
        "##000",
        "##000",
        "00#00",
        "000##",
        "000##"
    ]
];

// 6x6 Masks
const MASKS_6X6 = [
    [
        "000#00",
        "000#00",
        "##0000",
        "0000##",
        "00#000",
        "00#000"
    ],
    [
        "00#000",
        "00#000",
        "0000##",
        "##0000",
        "000#00",
        "000#00"
    ],
    [
        "000##0",
        "000000",
        "00#000",
        "000#00",
        "000000",
        "0##000"
    ]
];

// 7x7 Masks
const MASKS_7X7 = [
    [
        "000#000",
        "000#000",
        "00#00#0",
        "###0###",
        "0#00#00",
        "000#000",
        "000#000"
    ],
    [
        "0000#00",
        "0000#00",
        "00#0000",
        "#00000#",
        "0000#00",
        "00#0000",
        "00#0000"
    ]
];

// 8x8 Masks
const MASKS_8X8 = [
    [
        "000#0000",
        "000#0000",
        "0000##00",
        "##000000",
        "000000##",
        "00##0000",
        "0000#000",
        "0000#000"
    ],
    [
        "0000#000",
        "0000#000",
        "00##0000",
        "000000##",
        "##000000",
        "0000##00",
        "000#0000",
        "000#0000"
    ]
];

// 9x9 Masks
const MASKS_9X9 = [
    [
        "0000#0000",
        "0000#0000",
        "000##0000",
        "000000##0",
        "##00#00##",
        "0##000000",
        "0000##000",
        "0000#0000",
        "0000#0000"
    ],
    [
        "000#000#0",
        "000#000#0",
        "00##000#0",
        "000000##0",
        "##00000##",
        "0##000000",
        "0#000##00",
        "0#000#000",
        "0#000#000"
    ]
];

function solvePuzzleForMask(mask: string[], size: number, title: string, theme: string, id: string): MasterGridPuzzle | null {
    for (let seed = 1; seed <= 30; seed++) {
        const res = solveMaskByComponents(mask, size, seed);
        if (res) {
            return {
                id,
                title,
                theme,
                gridSize: size,
                description: `${size}x${size} आकाराचे अस्सल मराठी वृत्तपत्रीय शब्दकोडे`,
                grid: res.grid,
                clues: res.clues,
                totalWordCount: res.clues.length
            };
        }
    }
    return null;
}

// 20x20 Generator with guaranteed valid words
function generate20x20Puzzle(variant: number): MasterGridPuzzle | null {
    // 20x20: use 4 quadrants of 9x9 with row 9/10 and col 9/10 as black separator borders
    const g: string[][] = Array(20).fill(null).map(() => Array(20).fill('#'));
    // We can use 4 9x9 blocks:
    // Block 1: 0..8, 0..8
    // Block 2: 0..8, 11..19
    // Block 3: 11..19, 0..8
    // Block 4: 11..19, 11..19
    // And middle row 9, 10, col 9, 10 are '#'
    // Inside each 9x9 block, use MASKS_9X9[0] or MASKS_9X9[1]
    const m9 = MASKS_9X9[variant % MASKS_9X9.length];
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            g[r][c] = m9[r][c];
            g[r][c + 11] = m9[r][c];
            g[r + 11][c] = m9[r][c];
            g[r + 11][c + 11] = m9[r][c];
        }
    }

    const mask = g.map(row => row.join(''));
    const res = solveMaskByComponents(mask, 20, variant * 29 + 1);
    if (!res) return null;

    return {
        id: `p20_verified_${variant + 1}`,
        title: `महाशब्दवेध २०x२० (संच #${variant + 1})`,
        theme: "अस्सल मराठी महाशब्दवेध",
        gridSize: 20,
        description: "२०x२० आकाराचे भव्य व समृद्ध मराठी वृत्तपत्रीय शब्दकोडे",
        grid: res.grid,
        clues: res.clues,
        totalWordCount: res.clues.length
    };
}

// 25x25 Generator with guaranteed valid words
function generate25x25Puzzle(variant: number): MasterGridPuzzle | null {
    // 25x25: 4 12x12 quadrants with row 12 and col 12 as black separator line
    const g: string[][] = Array(25).fill(null).map(() => Array(25).fill('#'));
    const m12 = INTERLOCKING_MASKS_12X12[variant % INTERLOCKING_MASKS_12X12.length];
    for (let r = 0; r < 12; r++) {
        for (let c = 0; c < 12; c++) {
            g[r][c] = m12[r][c];
            g[r][c + 13] = m12[r][c];
            g[r + 13][c] = m12[r][c];
            g[r + 13][c + 13] = m12[r][c];
        }
    }

    const mask = g.map(row => row.join(''));
    const res = solveMaskByComponents(mask, 25, variant * 37 + 1);
    if (!res) return null;

    return {
        id: `p25_verified_${variant + 1}`,
        title: `महासम्राट शब्दवेध २५x२५ (संच #${variant + 1})`,
        theme: "अस्सल मराठी महासम्राट शब्दवेध",
        gridSize: 25,
        description: "२५x२५ आकाराचे भव्य, आव्हानात्मक व समृद्ध वृत्तपत्रीय शब्दकोडे",
        grid: res.grid,
        clues: res.clues,
        totalWordCount: res.clues.length
    };
}

async function main() {
    console.log("=== BUILDING VERIFIED PUZZLES ===");
    const results: Record<string, MasterGridPuzzle[]> = {
        "5": [],
        "6": [],
        "7": [],
        "8": [],
        "9": [],
        "20": [],
        "25": []
    };

    // 5x5
    for (let i = 0; i < MASKS_5X5.length; i++) {
        const p = solvePuzzleForMask(MASKS_5X5[i], 5, `शब्दवेध ५x५ (संच #${i + 1})`, "मराठी भाषा व ज्ञान", `p5_${i + 1}`);
        if (p) {
            console.log(`5x5 #${i + 1} solved with ${p.totalWordCount} words`);
            results["5"].push(p);
        } else {
            console.log(`5x5 #${i + 1} failed`);
        }
    }

    // 6x6
    for (let i = 0; i < MASKS_6X6.length; i++) {
        const p = solvePuzzleForMask(MASKS_6X6[i], 6, `शब्दवेध ६x६ (संच #${i + 1})`, "मराठी संस्कृती", `p6_${i + 1}`);
        if (p) {
            console.log(`6x6 #${i + 1} solved with ${p.totalWordCount} words`);
            results["6"].push(p);
        } else {
            console.log(`6x6 #${i + 1} failed`);
        }
    }

    // 7x7
    for (let i = 0; i < MASKS_7X7.length; i++) {
        const p = solvePuzzleForMask(MASKS_7X7[i], 7, `शब्दवेध ७x७ (संच #${i + 1})`, "महाराष्ट्र व इतिहास", `p7_${i + 1}`);
        if (p) {
            console.log(`7x7 #${i + 1} solved with ${p.totalWordCount} words`);
            results["7"].push(p);
        } else {
            console.log(`7x7 #${i + 1} failed`);
        }
    }

    // 8x8
    for (let i = 0; i < MASKS_8X8.length; i++) {
        const p = solvePuzzleForMask(MASKS_8X8[i], 8, `शब्दवेध ८x८ (संच #${i + 1})`, "साहित्य व संस्कृती", `p8_${i + 1}`);
        if (p) {
            console.log(`8x8 #${i + 1} solved with ${p.totalWordCount} words`);
            results["8"].push(p);
        } else {
            console.log(`8x8 #${i + 1} failed`);
        }
    }

    // 9x9
    for (let i = 0; i < MASKS_9X9.length; i++) {
        const p = solvePuzzleForMask(MASKS_9X9[i], 9, `शब्दवेध ९x९ (संच #${i + 1})`, "ज्ञान व विज्ञान", `p9_${i + 1}`);
        if (p) {
            console.log(`9x9 #${i + 1} solved with ${p.totalWordCount} words`);
            results["9"].push(p);
        } else {
            console.log(`9x9 #${i + 1} failed`);
        }
    }

    // 20x20
    for (let i = 0; i < 2; i++) {
        const p = generate20x20Puzzle(i);
        if (p) {
            console.log(`20x20 #${i + 1} solved with ${p.totalWordCount} words`);
            results["20"].push(p);
        } else {
            console.log(`20x20 #${i + 1} failed`);
        }
    }

    // 25x25
    for (let i = 0; i < 2; i++) {
        const p = generate25x25Puzzle(i);
        if (p) {
            console.log(`25x25 #${i + 1} solved with ${p.totalWordCount} words`);
            results["25"].push(p);
        } else {
            console.log(`25x25 #${i + 1} failed`);
        }
    }

    fs.writeFileSync('verified_puzzles_complete.json', JSON.stringify(results, null, 2));
    console.log("SUCCESS! Saved verified_puzzles_complete.json");
}

main().catch(console.error);
