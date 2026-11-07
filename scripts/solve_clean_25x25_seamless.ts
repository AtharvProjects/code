import fs from 'fs';
import { ALL_USER_1000_WORDS } from '../services/userLexicon1000';
import { MARATHI_DICTIONARY, isAuthenticMarathiWord, sanitizeClue } from '../services/marathiDictionary';
import { buildWordCatalog, extractSlotsFromMask, solveGridSlotsFast } from '../services/dynamicCrosswordSolver';
import { getGraphemes, extractPlacedWordsFromGrid } from '../services/crosswordService';
import { MasterGridPuzzle, GridCell } from '../types';

const catalog = buildWordCatalog();
const validWordsSet = new Set([...ALL_USER_1000_WORDS, ...Object.keys(MARATHI_DICTIONARY)]);

function getWordClue(w: string): string {
    if (MARATHI_DICTIONARY[w]) return MARATHI_DICTIONARY[w];
    const item = catalog.find(x => x.word === w);
    return item ? item.clue : 'अस्सल मराठी शब्दार्थ';
}

export function checkGridStrict(grid: string[][]) {
    const size = grid.length;
    const initialGrid: GridCell[][] = [];
    for (let r = 0; r < size; r++) {
        const row: GridCell[] = [];
        for (let c = 0; c < size; c++) {
            const raw = grid[r][c];
            if (!raw || raw === '#' || raw.trim() === '') {
                row.push({ letter: null, isBlack: true, number: null });
            } else {
                row.push({ letter: raw.trim(), isBlack: false, number: null });
            }
        }
        initialGrid.push(row);
    }

    const placedWords = extractPlacedWordsFromGrid(initialGrid);
    const invalid: string[] = [];
    const over5: string[] = [];

    for (const p of placedWords) {
        if (!validWordsSet.has(p.word)) {
            invalid.push(`${p.word} (${p.direction} at ${p.row},${p.col})`);
        }
        const graph = getGraphemes(p.word);
        if (graph.length > 5) {
            over5.push(`${p.word} (${graph.length} at ${p.row},${p.col})`);
        }
    }

    const fullBlackRows: number[] = [];
    const fullBlackCols: number[] = [];
    let maxConsecutiveBlacks = 0;

    for (let r = 0; r < size; r++) {
        if (grid[r].every(c => c === '#')) fullBlackRows.push(r);
        let cCount = 0;
        for (let c = 0; c < size; c++) {
            if (grid[r][c] === '#') {
                cCount++;
                if (cCount > maxConsecutiveBlacks) maxConsecutiveBlacks = cCount;
            } else {
                cCount = 0;
            }
        }
    }
    for (let c = 0; c < size; c++) {
        if (grid.every(r => r[c] === '#')) fullBlackCols.push(c);
        let rCount = 0;
        for (let r = 0; r < size; r++) {
            if (grid[r][c] === '#') {
                rCount++;
                if (rCount > maxConsecutiveBlacks) maxConsecutiveBlacks = rCount;
            } else {
                rCount = 0;
            }
        }
    }

    return {
        valid: invalid.length === 0,
        invalidWords: invalid,
        over5Words: over5,
        wordsCount: placedWords.length,
        fullBlackRows,
        fullBlackCols,
        maxConsecutiveBlacks
    };
}

// Generate an authentic seamless 25x25 puzzle where 12x12 structures are fully mixed into adjacent structures
export function generateSeamless25(puzzleIndex: number): MasterGridPuzzle {
    // We tile 4 interlocking quadrants of 12x12 and 13x13 that touch without empty gap:
    // Q0: 12x12 (rows 0..11, cols 0..11)
    // Q1: 12x13 (rows 0..11, cols 12..24)
    // Q2: 13x12 (rows 12..24, cols 0..11)
    // Q3: 13x13 (rows 12..24, cols 12..24)
    //
    // Total size = 25x25!
    // No skipped rows, no skipped columns!
    //
    // Then we sanitize seams so that any word exceeding 5 graphemes or invalid word along the seam
    // is broken with isolated black blocks.

    const m13 = [
        "000#00#000#00",
        "0#000#000#000",
        "000#00#0#0#0#",
        "#00##00#000#0",
        "00##00#000#00",
        "0#000#000#000",
        "#00##0#0##00#",
        "000#000#000#0",
        "00#000#00##00",
        "0#000#00##00#",
        "#0#0#0#00#000",
        "000#000#000#0",
        "00#000#00#000"
    ];

    const m12 = [
        "0000#00000#0",
        "0#0#0#0#0#0#",
        "00000#000000",
        "#0#0#0#0#0#0",
        "00000#0000#0",
        "0#0#0#0#0#0#",
        "#0#0#0#0#0#0",
        "0#0000#00000",
        "0#0#0#0#0#0#",
        "000000#00000",
        "#0#0#0#0#0#0",
        "0#00000#000#"
    ];

    const m12x13 = m13.slice(0, 12);
    const m13x12 = m13.map(r => r.slice(0, 12));

    const used = new Set<string>();

    function solveSearch(mask: string[], gridSize: number, seedBase: number) {
        const slots = extractSlotsFromMask(mask);
        for (let s = seedBase; s < seedBase + 80; s++) {
            const res = solveGridSlotsFast(slots, gridSize, catalog, used, s);
            if (res) return res;
        }
        throw new Error(`Failed to solve for size ${gridSize}`);
    }

    const sol0 = solveSearch(m12, 12, puzzleIndex * 37 + 1);
    sol0.placedWords.forEach(p => used.add(p.entry.word));

    const sol1 = solveSearch(m12x13, 13, puzzleIndex * 37 + 7);
    sol1.placedWords.forEach(p => used.add(p.entry.word));

    const sol2 = solveSearch(m13x12, 13, puzzleIndex * 37 + 13);
    sol2.placedWords.forEach(p => used.add(p.entry.word));

    const sol3 = solveSearch(m13, 13, puzzleIndex * 37 + 19);
    sol3.placedWords.forEach(p => used.add(p.entry.word));

    // Combine into 25x25 grid
    const grid: string[][] = Array(25).fill(null).map(() => Array(25).fill("#"));

    for (let r = 0; r < 12; r++) {
        for (let c = 0; c < 12; c++) {
            grid[r][c] = sol0.grid[r][c];
        }
        for (let c = 0; c < 13; c++) {
            grid[r][c + 12] = sol1.grid[r][c];
        }
    }
    for (let r = 0; r < 13; r++) {
        for (let c = 0; c < 12; c++) {
            grid[r + 12][c] = sol2.grid[r][c];
        }
        for (let c = 0; c < 13; c++) {
            grid[r + 12][c + 12] = sol3.grid[r][c];
        }
    }

    // Now apply clean seam sanitization:
    // Only insert black square where two letters touch across the boundary (col 11-12 or row 11-12)
    // AND they would form an invalid word or a word > 5 graphemes.
    let changed = true;
    let iters = 0;
    while (changed && iters < 30) {
        changed = false;
        iters++;

        const initialGrid: GridCell[][] = grid.map(row =>
            row.map(cell => ({
                letter: cell === "#" ? null : cell,
                isBlack: cell === "#",
                number: null
            }))
        );

        const placedWords = extractPlacedWordsFromGrid(initialGrid);
        for (const pw of placedWords) {
            const graph = getGraphemes(pw.word);
            const isInvalid = !validWordsSet.has(pw.word);
            const isTooLong = graph.length > 5;

            if (isInvalid || isTooLong) {
                if (pw.direction === "across") {
                    // Check if it spans across the column 11-12 seam
                    if (pw.col <= 11 && pw.col + graph.length - 1 >= 12) {
                        grid[pw.row][12] = "#";
                        changed = true;
                        break;
                    } else {
                        // Midpoint break
                        const mid = pw.col + Math.floor(graph.length / 2);
                        grid[pw.row][mid] = "#";
                        changed = true;
                        break;
                    }
                } else {
                    // Check if it spans across the row 11-12 seam
                    if (pw.row <= 11 && pw.row + graph.length - 1 >= 12) {
                        grid[12][pw.col] = "#";
                        changed = true;
                        break;
                    } else {
                        const mid = pw.row + Math.floor(graph.length / 2);
                        grid[mid][pw.col] = "#";
                        changed = true;
                        break;
                    }
                }
            }
        }
    }

    // Clean isolated single letters
    for (let r = 0; r < 25; r++) {
        for (let c = 0; c < 25; c++) {
            if (grid[r][c] !== "#") {
                const hasHoriz = (c > 0 && grid[r][c - 1] !== "#") || (c < 24 && grid[r][c + 1] !== "#");
                const hasVert = (r > 0 && grid[r - 1][c] !== "#") || (r < 24 && grid[r + 1][c] !== "#");
                if (!hasHoriz && !hasVert) {
                    grid[r][c] = "#";
                }
            }
        }
    }

    // Extract clues and finalize
    const initialGrid: GridCell[][] = grid.map(row =>
        row.map(cell => ({
            letter: cell === "#" ? null : cell,
            isBlack: cell === "#",
            number: null
        }))
    );

    const placedWords = extractPlacedWordsFromGrid(initialGrid);
    const seen = new Set<string>();
    const clues: { word: string; clue: string }[] = [];

    for (const p of placedWords) {
        if (!seen.has(p.word)) {
            seen.add(p.word);
            clues.push({
                word: p.word,
                clue: sanitizeClue(p.word, getWordClue(p.word))
            });
        }
    }

    return {
        id: `p25_${puzzleIndex + 1}`,
        title: `महासम्राट शब्दवेध (२५x२५ - संच #${puzzleIndex + 1})`,
        theme: "अस्सल मराठी महासम्राट शब्दवेध",
        gridSize: 25,
        description: "२५x२५ आकाराचे भव्य, अखंड, महाआव्हानात्मक व समृद्ध वृत्तपत्रीय शब्दकोडे",
        grid,
        clues,
        totalWordCount: clues.length
    };
}
