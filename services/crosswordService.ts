import { WordClue, PlacedWord, GridCell, PuzzleData, Clues, Clue } from '../types';
import { getVerifiedPuzzle, VERIFIED_PUZZLES, MasterGridPuzzle } from './puzzleBank';
import { getMarathiWordClue, isAuthenticMarathiWord, sanitizeClue, isGenericClue, MARATHI_DICTIONARY } from './marathiDictionary';

// Custom grapheme segmenter to correctly handle complex Marathi characters
export function getGraphemes(word: string): string[] {
    // Fallback for environments where Intl.Segmenter might not be available
    if (typeof (Intl as any)?.Segmenter !== 'function') {
        return [...word];
    }
    try {
        const segmenter = new (Intl as any).Segmenter('mr', { granularity: 'grapheme' });
        return Array.from(segmenter.segment(word)).map((s: any) => s.segment);
    } catch (e) {
        // Fallback in case of error with segmenter
        return [...word];
    }
}

/**
 * Ensures that a cell strictly contains at most ONE Marathi akshara (grapheme cluster).
 * If multiple characters/graphemes are passed (e.g. 'तूप' or 'गूळ'), strictly keeps only the first akshara.
 * Returns null for black squares, empty strings or whitespace.
 */
export function sanitizeSingleAkshara(cellValue: string | null | undefined): string | null {
    if (!cellValue || cellValue === '#' || cellValue.trim() === '' || cellValue.toLowerCase() === 'black') {
        return null;
    }
    const clean = cellValue.trim();
    const graphemes = getGraphemes(clean);
    return graphemes.length > 0 ? graphemes[0] : null;
}

function createEmptyGrid(size: number): GridCell[][] {
    return Array(size).fill(null).map(() =>
        Array(size).fill(null).map(() => ({
            letter: null,
            isBlack: false,
            number: null,
        }))
    );
}

function placeWordOnGrid(grid: GridCell[][], wordGraphemes: string[], row: number, col: number, direction: 'across' | 'down') {
    for (let i = 0; i < wordGraphemes.length; i++) {
        const letter = wordGraphemes[i];
        if (direction === 'across') {
            if (grid[row]?.[col + i]) grid[row][col + i].letter = letter;
        } else {
            if (grid[row + i]?.[col]) grid[row + i][col].letter = letter;
        }
    }
}

export function generateClues(placedWords: PlacedWord[]): Clues {
    const clues: Clues = { across: [], down: [] };
    placedWords.forEach(word => {
        if (word.number > 0) {
            const clue: Clue = { number: word.number, clue: word.clue, word: word.word };
            if (word.direction === 'across') {
                clues.across.push(clue);
            } else {
                clues.down.push(clue);
            }
        }
    });

    clues.across.sort((a, b) => a.number - b.number);
    clues.down.sort((a, b) => a.number - b.number);
    return clues;
}

function countIntersections(grid: GridCell[][], wordGraphemes: string[], row: number, col: number, direction: 'across' | 'down'): number {
    let intersections = 0;
    for (let i = 0; i < wordGraphemes.length; i++) {
        const r = direction === 'down' ? row + i : row;
        const c = direction === 'across' ? col + i : col;
        if (grid[r]?.[c]?.letter === wordGraphemes[i]) {
            intersections++;
        }
    }
    return intersections;
}

interface PlacementOption {
    word: any; // Using `any` to match structure of preparedWords
    row: number;
    col: number;
    direction: 'across' | 'down';
    score: number;
}

interface BestPlacementResult {
    placement: PlacementOption;
    wordIndex: number;
}


function findBestPlacement(
    wordsToPlace: any[],
    placedWords: PlacedWord[],
    grid: GridCell[][],
    gridSize: number
): BestPlacementResult | null {
    let bestPlacement: PlacementOption | null = null;
    let bestWordIndex = -1;

    for (let i = 0; i < wordsToPlace.length; i++) {
        const wordClue = wordsToPlace[i];
        const wordGraphemes = wordClue.graphemes;

        for (let r = 0; r < gridSize; r++) {
            for (let c = 0; c < gridSize; c++) {
                // Try placing across
                if (canPlaceWord(grid, wordGraphemes, r, c, 'across', gridSize)) {
                    const intersections = countIntersections(grid, wordGraphemes, r, c, 'across');
                    // Score: intersections are king, then word length as a tie-breaker.
                    const score = (intersections * 100) + wordGraphemes.length;
                    
                    if (!bestPlacement || score > bestPlacement.score) {
                        bestPlacement = { word: wordClue, row: r, col: c, direction: 'across', score };
                        bestWordIndex = i;
                    }
                }
                // Try placing down
                if (canPlaceWord(grid, wordGraphemes, r, c, 'down', gridSize)) {
                    const intersections = countIntersections(grid, wordGraphemes, r, c, 'down');
                    const score = (intersections * 100) + wordGraphemes.length;
                    
                    if (!bestPlacement || score > bestPlacement.score) {
                        bestPlacement = { word: wordClue, row: r, col: c, direction: 'down', score };
                        bestWordIndex = i;
                    }
                }
            }
        }
    }

    // After the first word, every subsequent word MUST connect to the main cluster.
    // A score < 100 means there were no intersections.
    if (placedWords.length > 1 && bestPlacement && bestPlacement.score < 100) {
        return null;
    }

    if (bestPlacement) {
        return { placement: bestPlacement, wordIndex: bestWordIndex };
    }
    return null;
}


export function generateCrosswordData(wordClues: WordClue[], gridSize: number): PuzzleData {
    const preparedWords = wordClues
      .map(wc => ({ 
          ...wc, 
          word: wc.word.replace(/[^\u0900-\u097F\u200D\u200C]/g, '').trim() 
      }))
      .filter(wc => wc.word.length > 1)
      .map(wc => ({ ...wc, graphemes: getGraphemes(wc.word) }))
      .filter(wc => wc.graphemes.length > 1)
      .sort((a, b) => b.graphemes.length - a.graphemes.length);
      
    let wordsToPlace = [...preparedWords];
    let grid = createEmptyGrid(gridSize);
    const placedWords: PlacedWord[] = [];

    // Place the first word in the middle to anchor the puzzle
    if (wordsToPlace.length > 0) {
        const firstWord = wordsToPlace.shift()!;
        const startCol = Math.floor((gridSize - firstWord.graphemes.length) / 2);
        const startRow = Math.floor(gridSize / 2);
        
        placeWordOnGrid(grid, firstWord.graphemes, startRow, startCol, 'across');
        placedWords.push({ 
            word: firstWord.word, 
            clue: firstWord.clue, 
            row: startRow, 
            col: startCol, 
            direction: 'across', 
            number: 0 
        });
    }
    
    // PHASE 1: Intersection-based placement
    let placedAWord: boolean;
    do {
        placedAWord = false;
        const bestPlacementResult = findBestPlacement(wordsToPlace, placedWords, grid, gridSize);
        
        if (bestPlacementResult) {
            const { placement, wordIndex } = bestPlacementResult;
            const wordToPlace = wordsToPlace.splice(wordIndex, 1)[0];
            placeWordOnGrid(grid, getGraphemes(wordToPlace.word), placement.row, placement.col, placement.direction);
            placedWords.push({ 
                word: wordToPlace.word, 
                clue: wordToPlace.clue, 
                row: placement.row, 
                col: placement.col, 
                direction: placement.direction, 
                number: 0 
            });
            placedAWord = true;
        }
    } while (placedAWord && wordsToPlace.length > 0);

    // PHASE 2: Gap Filling
    // Attempt to place the remaining words into empty areas of the grid to increase density.
    const stillUnplaced: any[] = [];
    for (const wordToPlace of wordsToPlace) {
        let wasPlaced = false;
        for (let r = 0; r < gridSize; r++) {
            for (let c = 0; c < gridSize; c++) {
                if (canPlaceWordInEmptySpace(grid, wordToPlace.graphemes, r, c, 'across', gridSize)) {
                    placeWordOnGrid(grid, wordToPlace.graphemes, r, c, 'across');
                    placedWords.push({ ...wordToPlace, row: r, col: c, direction: 'across', number: 0 });
                    wasPlaced = true;
                    break;
                }
                if (canPlaceWordInEmptySpace(grid, wordToPlace.graphemes, r, c, 'down', gridSize)) {
                    placeWordOnGrid(grid, wordToPlace.graphemes, r, c, 'down');
                    placedWords.push({ ...wordToPlace, row: r, col: c, direction: 'down', number: 0 });
                    wasPlaced = true;
                    break;
                }
            }
            if (wasPlaced) break;
        }

        if (!wasPlaced) {
            stillUnplaced.push(wordToPlace);
        }
    }
    wordsToPlace = stillUnplaced;

    const finalGrid = finalizeGrid(grid, placedWords, gridSize);
    const clues = generateClues(placedWords);

    return { grid: finalGrid, clues, unplacedWords: wordsToPlace };
}


function canPlaceWord(grid: GridCell[][], wordGraphemes: string[], row: number, col: number, direction: 'across' | 'down', gridSize: number): boolean {
    if (row < 0 || col < 0) return false;
    let intersections = 0;

    if (direction === 'across') {
        if (col + wordGraphemes.length > gridSize) return false;
        for (let i = 0; i < wordGraphemes.length; i++) {
            const r = row;
            const c = col + i;
            const existingLetter = grid[r]?.[c]?.letter;
            if (existingLetter && existingLetter !== wordGraphemes[i]) return false;
            if (existingLetter && existingLetter === wordGraphemes[i]) {
                intersections++;
            } else {
                if (grid[r - 1]?.[c]?.letter || grid[r + 1]?.[c]?.letter) return false;
            }
        }
        if (grid[row]?.[col - 1]?.letter || grid[row]?.[col + wordGraphemes.length]?.letter) return false;
    } else { // 'down'
        if (row + wordGraphemes.length > gridSize) return false;
        for (let i = 0; i < wordGraphemes.length; i++) {
            const r = row + i;
            const c = col;
            const existingLetter = grid[r]?.[c]?.letter;
            if (existingLetter && existingLetter !== wordGraphemes[i]) return false;
            if (existingLetter && existingLetter === wordGraphemes[i]) {
                intersections++;
            } else {
                if (grid[r]?.[c - 1]?.letter || grid[r]?.[c + 1]?.letter) return false;
            }
        }
        if (grid[row - 1]?.[col]?.letter || grid[row + wordGraphemes.length]?.[col]?.letter) return false;
    }
    return intersections > 0;
}


function canPlaceWordInEmptySpace(grid: GridCell[][], wordGraphemes: string[], row: number, col: number, direction: 'across' | 'down', gridSize: number): boolean {
    if (row < 0 || col < 0) return false;

    if (direction === 'across') {
        if (col + wordGraphemes.length > gridSize) return false;
        for (let i = 0; i < wordGraphemes.length; i++) {
            const r = row;
            const c = col + i;
            if (grid[r]?.[c]?.letter) return false; // Cell must be empty
            if (grid[r - 1]?.[c]?.letter || grid[r + 1]?.[c]?.letter) return false;
        }
        if (grid[row]?.[col - 1]?.letter || grid[row]?.[col + wordGraphemes.length]?.letter) return false;
    } else { // 'down'
        if (row + wordGraphemes.length > gridSize) return false;
        for (let i = 0; i < wordGraphemes.length; i++) {
            const r = row + i;
            const c = col;
            if (grid[r]?.[c]?.letter) return false; // Cell must be empty
            if (grid[r]?.[c - 1]?.letter || grid[r]?.[c + 1]?.letter) return false;
        }
        if (grid[row - 1]?.[col]?.letter || grid[row + wordGraphemes.length]?.[col]?.letter) return false;
    }
    return true;
}


export function finalizeGrid(grid: GridCell[][], placedWords: PlacedWord[], gridSize: number): GridCell[][] {
    const finalGrid = grid.map(row => row.map(cell => {
        const cleanLetter = sanitizeSingleAkshara(cell.letter);
        return {
            ...cell,
            letter: cleanLetter,
            isBlack: !cleanLetter,
            number: null
        };
    }));

    if (placedWords.length === 0 && grid.every(r => r.every(c => c.isBlack || !c.letter))) {
        // If grid is effectively empty, don't number it.
        return finalGrid.map(row => row.map(cell => ({ ...cell, isBlack: true, letter: null, number: null })));
    }


    let clueNumber = 1;
    const numberMap = new Map<string, number>();

    for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
            if (finalGrid[r][c].isBlack) continue;

            const isAcrossStart = (c === 0 || finalGrid[r][c - 1]?.isBlack) && (c + 1 < gridSize && !finalGrid[r][c + 1]?.isBlack);
            const isDownStart = (r === 0 || finalGrid[r - 1]?.[c]?.isBlack) && (r + 1 < gridSize && !finalGrid[r + 1]?.[c]?.isBlack);

            if (isAcrossStart || isDownStart) {
                const key = `${r},${c}`;
                if (!numberMap.has(key)) {
                    finalGrid[r][c].number = clueNumber;
                    numberMap.set(key, clueNumber);
                    clueNumber++;
                }
            }
        }
    }
    
    placedWords.forEach(word => {
        const key = `${word.row},${word.col}`;
        word.number = numberMap.get(key) || 0;
    });
    
    return finalGrid;
}

export function extractPlacedWordsFromGrid(grid: GridCell[][]): Omit<PlacedWord, 'clue' | 'number'>[] {
    const words: Omit<PlacedWord, 'clue' | 'number'>[] = [];
    const size = grid.length;

    // Horizontal words
    for (let r = 0; r < size; r++) {
        let currentWord = '';
        let startCol = -1;
        for (let c = 0; c < size; c++) {
            const cell = grid[r][c];
            if (!cell.isBlack && cell.letter) {
                if (startCol === -1) startCol = c;
                currentWord += cell.letter;
            } else {
                if (getGraphemes(currentWord).length > 1) {
                    words.push({ word: currentWord, row: r, col: startCol, direction: 'across' });
                }
                currentWord = '';
                startCol = -1;
            }
        }
        if (getGraphemes(currentWord).length > 1) {
            words.push({ word: currentWord, row: r, col: startCol, direction: 'across' });
        }
    }

    // Vertical words
    for (let c = 0; c < size; c++) {
        let currentWord = '';
        let startRow = -1;
        for (let r = 0; r < size; r++) {
            const cell = grid[r][c];
            if (!cell.isBlack && cell.letter) {
                if (startRow === -1) startRow = r;
                currentWord += cell.letter;
            } else {
                if (getGraphemes(currentWord).length > 1) {
                    words.push({ word: currentWord, row: startRow, col: c, direction: 'down' });
                }
                currentWord = '';
                startRow = -1;
            }
        }
        if (getGraphemes(currentWord).length > 1) {
            words.push({ word: currentWord, row: startRow, col: c, direction: 'down' });
        }
    }
    return words;
}

export function extractUniqueWordsFromGrid(grid: GridCell[][]): string[] {
    const placedWords = extractPlacedWordsFromGrid(grid);
    return Array.from(new Set(placedWords.map(p => p.word)));
}

export function createPuzzleDataFromGrid(grid: GridCell[][], wordClues: WordClue[]): PuzzleData {
    const clueMap = new Map(wordClues.map(wc => [wc.word, wc.clue]));
    const placedWordsRaw = extractPlacedWordsFromGrid(grid);

    const placedWords: PlacedWord[] = placedWordsRaw.map(pwr => ({
        ...pwr,
        clue: clueMap.get(pwr.word) || '...',
        number: 0,
    }));

    const finalGrid = finalizeGrid(grid, placedWords, grid.length);
    const clues = generateClues(placedWords);

    const placedWordsSet = new Set(placedWords.map(p => p.word));
    const unplacedWords = wordClues.filter(wc => !placedWordsSet.has(wc.word));

    return { grid: finalGrid, clues, unplacedWords };
}

export async function buildPuzzleFromAIGrid(
    rawGrid: string[][],
    rawClues: { word: string; clue: string }[],
    gridSize: number
): Promise<PuzzleData> {
    const size = Math.max(gridSize, rawGrid.length);
    const initialGrid: GridCell[][] = [];

    for (let r = 0; r < size; r++) {
        const row: GridCell[] = [];
        for (let c = 0; c < size; c++) {
            const rawCell = rawGrid[r]?.[c];
            if (!rawCell || rawCell === '#' || rawCell.toLowerCase() === 'black' || rawCell.trim() === '') {
                row.push({ letter: null, isBlack: true, number: null });
            } else {
                const akshara = sanitizeSingleAkshara(rawCell);
                row.push({ letter: akshara, isBlack: !akshara, number: null });
            }
        }
        initialGrid.push(row);
    }

    // Clean up isolated single cells that don't belong to any sequence of length >= 2
    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            if (!initialGrid[r][c].isBlack) {
                const hasHoriz = (c > 0 && !initialGrid[r][c - 1].isBlack) || (c < size - 1 && !initialGrid[r][c + 1].isBlack);
                const hasVert = (r > 0 && !initialGrid[r - 1][c].isBlack) || (r < size - 1 && !initialGrid[r + 1][c].isBlack);
                if (!hasHoriz && !hasVert) {
                    initialGrid[r][c].isBlack = true;
                    initialGrid[r][c].letter = null;
                }
            }
        }
    }

    const clueMap = new Map<string, string>();
    rawClues.forEach(c => {
        if (c.word && c.clue) {
            clueMap.set(c.word.trim(), c.clue.trim());
        }
    });

    const placedWordsRaw = extractPlacedWordsFromGrid(initialGrid);

    // Identify words that are missing clues
    const missingWords: string[] = [];
    placedWordsRaw.forEach(p => {
        if (!clueMap.has(p.word)) {
            missingWords.push(p.word);
        }
    });

    // If there are words without clues, fetch clues dynamically
    if (missingWords.length > 0) {
        try {
            const { getCluesForWords } = await import('./geminiService');
            const fetched = await getCluesForWords(missingWords);
            fetched.forEach(f => {
                if (f.word && f.clue) {
                    clueMap.set(f.word.trim(), sanitizeClue(f.word.trim(), f.clue.trim()));
                }
            });
        } catch (_e) {
            // Fallback to local dictionary
        }
    }

    const placedWords: PlacedWord[] = placedWordsRaw.map(pwr => {
        let rawClue = clueMap.get(pwr.word);
        if (!rawClue || isGenericClue(rawClue)) {
            rawClue = getMarathiWordClue(pwr.word) || MARATHI_DICTIONARY[pwr.word] || '';
        }
        return {
            ...pwr,
            clue: sanitizeClue(pwr.word, rawClue),
            number: 0,
        };
    });

    const finalGrid = finalizeGrid(initialGrid, placedWords, size);
    const clues = generateClues(placedWords);

    return { grid: finalGrid, clues, unplacedWords: [] };
}

export function buildPuzzleFromMaster(master: MasterGridPuzzle): PuzzleData {
    const size = master.gridSize;
    const initialGrid: GridCell[][] = [];

    for (let r = 0; r < size; r++) {
        const row: GridCell[] = [];
        for (let c = 0; c < size; c++) {
            const raw = master.grid[r]?.[c];
            if (!raw || raw === '#' || raw.trim() === '') {
                row.push({ letter: null, isBlack: true, number: null });
            } else {
                const akshara = sanitizeSingleAkshara(raw);
                row.push({ letter: akshara, isBlack: !akshara, number: null });
            }
        }
        initialGrid.push(row);
    }

    const clueMap = new Map<string, string>();
    for (const c of master.clues) {
        if (c.word && c.clue) {
            clueMap.set(c.word.trim(), sanitizeClue(c.word.trim(), c.clue.trim()));
        }
    }

    const placedWordsRaw = extractPlacedWordsFromGrid(initialGrid);
    const placedWords: PlacedWord[] = placedWordsRaw.map(p => {
        let rawClue = clueMap.get(p.word);
        if (!rawClue || isGenericClue(rawClue)) {
            rawClue = getMarathiWordClue(p.word) || MARATHI_DICTIONARY[p.word] || '';
        }
        return {
            ...p,
            clue: sanitizeClue(p.word, rawClue),
            number: 0
        };
    });

    const finalGrid = finalizeGrid(initialGrid, placedWords, size);
    const clues = generateClues(placedWords);

    return { grid: finalGrid, clues, unplacedWords: [] };
}

export function getOfficialShabdavedhSamplePuzzle(): PuzzleData {
    return buildPuzzleFromMaster(VERIFIED_PUZZLES[0]);
}

export function getDefaultShabdavedhPuzzle(): PuzzleData {
    return buildPuzzleFromMaster(VERIFIED_PUZZLES[0]);
}

export function getPuzzleFromBank(gridSize: number, themeIndex: number = 0): PuzzleData {
    const master = getVerifiedPuzzle(gridSize, themeIndex);
    return buildPuzzleFromMaster(master);
}

export interface BlackBlockViolation {
    direction: 'आडवे' | 'उभे';
    index: number; // 1-based row or column index
    count: number;
    start: number; // 1-based start coordinate
}

export interface BlackBlockValidationResult {
    isValid: boolean;
    maxHorizontal: number;
    maxVertical: number;
    violations: BlackBlockViolation[];
    errorMessage?: string;
    violatingCellKeys: Set<string>; // 'r,c' 0-indexed keys
}

/**
 * Validates the strict structural rule:
 * "एक सलग तीनपेक्षा जास्त काळे ब्लॉक नको. (उभे / आडवे ) हा नियम सक्तीने पाळा"
 * Ensures that no contiguous sequence of black blocks in any row or column exceeds 3.
 */
export function validateConsecutiveBlackBlocks(
    grid: (GridCell | { letter?: string | null; isBlack?: boolean } | string | null)[][]
): BlackBlockValidationResult {
    const size = grid.length;
    if (size === 0) {
        return {
            isValid: true,
            maxHorizontal: 0,
            maxVertical: 0,
            violations: [],
            violatingCellKeys: new Set<string>()
        };
    }
    const cols = grid[0].length;

    const isCellBlack = (r: number, c: number): boolean => {
        const cell = grid[r]?.[c];
        if (cell === null || cell === undefined) return true;
        if (typeof cell === 'string') {
            return cell === '#' || cell.trim() === '' || cell.toLowerCase() === 'black';
        }
        if (typeof cell === 'object') {
            if ('isBlack' in cell && cell.isBlack) return true;
            if ('letter' in cell && (!cell.letter || cell.letter.trim() === '')) return true;
        }
        return false;
    };

    let maxH = 0;
    let maxV = 0;
    const violations: BlackBlockViolation[] = [];
    const violatingCellKeys = new Set<string>();

    // 1. Check Horizontal (Row by Row)
    for (let r = 0; r < size; r++) {
        let count = 0;
        let startCol = 0;
        for (let c = 0; c < cols; c++) {
            if (isCellBlack(r, c)) {
                if (count === 0) startCol = c;
                count++;
                if (count > maxH) maxH = count;
            } else {
                if (count > 3) {
                    violations.push({ direction: 'आडवे', index: r + 1, count, start: startCol + 1 });
                    for (let cc = startCol; cc < startCol + count; cc++) {
                        violatingCellKeys.add(`${r},${cc}`);
                    }
                }
                count = 0;
            }
        }
        if (count > 3) {
            violations.push({ direction: 'आडवे', index: r + 1, count, start: startCol + 1 });
            for (let cc = startCol; cc < startCol + count; cc++) {
                violatingCellKeys.add(`${r},${cc}`);
            }
        }
    }

    // 2. Check Vertical (Column by Column)
    for (let c = 0; c < cols; c++) {
        let count = 0;
        let startRow = 0;
        for (let r = 0; r < size; r++) {
            if (isCellBlack(r, c)) {
                if (count === 0) startRow = r;
                count++;
                if (count > maxV) maxV = count;
            } else {
                if (count > 3) {
                    violations.push({ direction: 'उभे', index: c + 1, count, start: startRow + 1 });
                    for (let rr = startRow; rr < startRow + count; rr++) {
                        violatingCellKeys.add(`${rr},${c}`);
                    }
                }
                count = 0;
            }
        }
        if (count > 3) {
            violations.push({ direction: 'उभे', index: c + 1, count, start: startRow + 1 });
            for (let rr = startRow; rr < startRow + count; rr++) {
                violatingCellKeys.add(`${rr},${c}`);
            }
        }
    }

    const isValid = violations.length === 0;
    let errorMessage: string | undefined;
    if (!isValid) {
        const details = violations.slice(0, 3).map(v =>
            `${v.direction} ${v.index} व्या रांगेत सलग ${v.count} काळे चौकोन`
        ).join(', ');
        errorMessage = `सक्तीचा नियम: एका सलग तीनपेक्षा जास्त काळे ब्लॉक चालणार नाहीत (उभे / आडवे). आढळले: ${details}${violations.length > 3 ? '...' : ''}.`;
    }

    return {
        isValid,
        maxHorizontal: maxH,
        maxVertical: maxV,
        violations,
        errorMessage,
        violatingCellKeys
    };
}
