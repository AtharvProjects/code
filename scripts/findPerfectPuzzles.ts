import fs from 'fs';
import { buildWordCatalog, extractSlotsFromMask, solveGridSlotsFast } from '../services/dynamicCrosswordSolver';
import { ALL_USER_1000_WORDS } from '../services/userLexicon1000';
import { MARATHI_DICTIONARY } from '../services/marathiDictionary';
import { MasterGridPuzzle } from '../types';

const catalog = buildWordCatalog();

function checkMaskValid(mask: string[]): boolean {
    const N = mask.length;
    for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
            if (mask[r][c] === '0') {
                const h = (c > 0 && mask[r][c - 1] === '0') || (c < N - 1 && mask[r][c + 1] === '0');
                const v = (r > 0 && mask[r - 1][c] === '0') || (r < N - 1 && mask[r + 1][c] === '0');
                if (!h || !v) return false;
            }
        }
    }
    return true;
}

export function searchAndSolveMasks(size: number, countNeeded: number = 2): MasterGridPuzzle[] {
    console.log(`Searching solved puzzles for size ${size}x${size}...`);
    const N = size;
    const pairs: [number, number][] = [];
    for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
            const oppR = N - 1 - r;
            const oppC = N - 1 - c;
            if (r < oppR || (r === oppR && c <= oppC)) {
                pairs.push([r, c]);
            }
        }
    }

    const results: MasterGridPuzzle[] = [];
    const minBlack = Math.floor(N * N * 0.15 / 2);
    const maxBlack = Math.ceil(N * N * 0.35 / 2);

    let seed = size * 997 + 13;
    const rnd = () => {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
    };

    for (let trial = 0; trial < 20000 && results.length < countNeeded; trial++) {
        const numPairs = minBlack + Math.floor(rnd() * (maxBlack - minBlack + 1));
        const shuffled = [...pairs].sort(() => rnd() - 0.5);
        const grid = Array(N).fill(null).map(() => Array(N).fill('0'));

        for (let i = 0; i < numPairs; i++) {
            const [r, c] = shuffled[i];
            grid[r][c] = '#';
            grid[N - 1 - r][N - 1 - c] = '#';
        }

        const mask = grid.map(row => row.join(''));
        if (!checkMaskValid(mask)) continue;

        const slots = extractSlotsFromMask(mask);
        const maxLen = Math.max(...slots.map(s => s.len));
        if (maxLen > 5) continue; // Keep slot lengths strictly 2..5

        // If slots are disconnected into too many tiny islands, skip
        if (slots.length < (size === 5 ? 8 : size === 6 ? 10 : size === 7 ? 12 : 14)) continue;

        const sol = solveGridSlotsFast(slots, N, catalog, new Set(), trial * 31 + size * 7);
        if (sol) {
            console.log(`Success for ${size}x${size} at trial ${trial}! Words placed: ${sol.placedWords.length}`);
            
            const clues = sol.placedWords.map(p => ({
                word: p.entry.word,
                clue: p.entry.clue
            }));

            // Deduplicate clues
            const seen = new Set<string>();
            const dedupClues: { word: string; clue: string }[] = [];
            for (const c of clues) {
                if (!seen.has(c.word)) {
                    seen.add(c.word);
                    dedupClues.push(c);
                }
            }

            const master: MasterGridPuzzle = {
                id: `verified_${size}x${size}_${results.length + 1}`,
                title: `शब्दवेध (${size}x${size} - संच #${results.length + 1})`,
                theme: size <= 6 ? "सुलभ मराठी शब्दवेध" : "अस्सल वृत्तपत्रीय शब्दवेध",
                gridSize: size,
                description: `${size}x${size} आकाराचे अस्सल मराठी शब्दकोडे (१,०००+ शब्दभांडार)`,
                grid: sol.grid,
                clues: dedupClues,
                totalWordCount: dedupClues.length
            };

            results.push(master);
        }
    }

    console.log(`Size ${size}x${size} finished: ${results.length} puzzles found.`);
    return results;
}
