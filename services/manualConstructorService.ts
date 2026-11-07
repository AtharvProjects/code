import { GridCell, Clues, PlacedWord, WordClue } from '../types';
import { getGraphemes, extractPlacedWordsFromGrid, finalizeGrid } from './crosswordService';
import { MARATHI_DICTIONARY, SMART_WORD_CLUES, getMarathiWordClue, sanitizeClue, isAuthenticMarathiWord, isGenericClue, generateSmartMarathiClue } from './marathiDictionary';
import { ALL_USER_1000_WORDS, USER_WORDS_SET } from './userLexicon1000';
import { getSavedCustomWordBank } from './customLexiconService';
import { GoogleGenAI, Type } from '@google/genai';

export interface ManualSlot {
    row: number;
    col: number;
    direction: 'across' | 'down';
    length: number;
    pattern: (string | null)[];
    filledWord: string;
    isComplete: boolean;
    isValidWord: boolean;
    number: number;
    clue?: string;
}

export interface WordSuggestion {
    word: string;
    clue: string;
    source: '1000_lexicon' | 'dictionary' | 'custom' | 'ai';
    sourceLabel: string;
    letterCount: number;
}

/**
 * Creates a clean, empty white grid of given size.
 */
export function createBlankManualGrid(size: number): GridCell[][] {
    return Array(size).fill(null).map(() =>
        Array(size).fill(null).map(() => ({
            letter: null,
            isBlack: false,
            number: null,
        }))
    );
}

/**
 * Creates a grid with classic newspaper symmetric black square patterns.
 */
export function createTemplateManualGrid(size: number, templateIndex: number = 0): GridCell[][] {
    const grid = createBlankManualGrid(size);

    // Symmetric mask patterns for different sizes
    const masks: Record<number, string[][]> = {
        5: [
            ['00000', '0#0#0', '00000', '0#0#0', '00000'],
            ['000#0', '0#000', '00000', '000#0', '0#000']
        ],
        6: [
            ['000000', '0#00#0', '000000', '000000', '0#00#0', '000000'],
            ['000#00', '0#00#0', '000000', '000000', '0#00#0', '00#000']
        ],
        7: [
            ['0000000', '0#0#0#0', '0000000', '0#000#0', '0000000', '0#0#0#0', '0000000'],
            ['000#000', '0#000#0', '00#0#00', '0000000', '00#0#00', '0#000#0', '000#000']
        ],
        8: [
            ['00000000', '0#00#0#0', '00000000', '0#0000#0', '0#0000#0', '00000000', '0#0#00#0', '00000000'],
            ['000#0000', '0#0000#0', '000#0000', '0000#000', '000#0000', '0000#000', '0#0000#0', '0000#000']
        ],
        9: [
            ['0000#0000', '0#0#0#0#0', '000000000', '0#0#0#0#0', '#0000000#', '0#0#0#0#0', '000000000', '0#0#0#0#0', '0000#0000']
        ],
        10: [
            ['0000#00000', '0#0#00#0#0', '00000#0000', '0#0#0#0#0#', '#000000#00', '00#000000#', '#0#0#0#0#0', '0000#00000', '0#0#00#0#0', '00000#0000'],
            ['00000#0000', '0#0#0#00#0', '0000#00000', '00#0#0#0#0', '#0000000#0', '0#0000000#', '0#0#0#0#00', '00000#0000', '0#00#0#0#0', '0000#00000']
        ],
        12: [
            ['0000#0000#00', '0#0#0#0#0#0#', '000000#00000', '0#0#0#0#0#0#', '00#00000#000', '#0#0#0#0#0#0', '0#0#0#0#0#0#', '000#00000#00', '#0#0#0#0#0#0', '00000#000000', '#0#0#0#0#0#0', '00#0000#0000']
        ],
        15: [
            ['00000#0000#0000', '0#0#0#0#0#0#0#0', '0000#000000#000', '0#0#0#0#0#0#0#0#', '000000#00000#00', '#0#0#0#0#0#0#0#0', '00#0000#0000#00', '0#0#0#0#0#0#0#0#', '00#0000#0000#00', '#0#0#0#0#0#0#0#0', '00#00000#000000', '#0#0#0#0#0#0#0#0', '000#000000#0000', '0#0#0#0#0#0#0#0', '0000#0000#00000']
        ],
        20: [
            [
                '0000#000000000#00000',
                '0#0#00#0#00#0#00#0#0',
                '00000#000000000#0000',
                '0#0#0#0#0#0#0#0#0#0#',
                '#00000#00##00#00000#',
                '00#000000##000000#00',
                '#0#0#0#0#0#0#0#0#0#0',
                '0000#000000000#00000',
                '0#0#00#0#00#0#00#0#0',
                '00000#000000000#0000',
                '0000#000000000#00000',
                '0#0#00#0#00#0#00#0#0',
                '00000#000000000#0000',
                '0#0#0#0#0#0#0#0#0#0#',
                '#00000#00##00#00000#',
                '00#000000##000000#00',
                '#0#0#0#0#0#0#0#0#0#0',
                '0000#000000000#00000',
                '0#0#00#0#00#0#00#0#0',
                '00000#000000000#0000'
            ]
        ],
        25: [
            [
                '0000#00000#0#0000#00000#0',
                '0#0#0#0#0#0#0#0#0#0#0#0#0',
                '00000#000000#00000#000000',
                '#0#0#0#0#0#0#0#0#0#0#0#0#',
                '00000#0000#0#00000#0000#0',
                '0#0#0#0#0#0#0#0#0#0#0#0#0',
                '#0#0#0#0#0#0#0#0#0#0#0#0#',
                '0#0000#00000#0#0000#00000',
                '0#0#0#0#0#0#0#0#0#0#0#0#0',
                '000000#00000#000000#00000',
                '#0#0#0#0#0#0#0#0#0#0#0#0#',
                '0#00000#000##0#00000#000#',
                '#0#0#0#0#0#0#0#0#0#0#0#0#',
                '0#00000#000##0#00000#000#',
                '#0#0#0#0#0#0#0#0#0#0#0#0#',
                '000000#00000#000000#00000',
                '0#0#0#0#0#0#0#0#0#0#0#0#0',
                '0#0000#00000#0#0000#00000',
                '#0#0#0#0#0#0#0#0#0#0#0#0#',
                '0#0#0#0#0#0#0#0#0#0#0#0#0',
                '00000#0000#0#00000#0000#0',
                '#0#0#0#0#0#0#0#0#0#0#0#0#',
                '00000#000000#00000#000000',
                '0#0#0#0#0#0#0#0#0#0#0#0#0',
                '0000#00000#0#0000#00000#0'
            ]
        ]
    };

    const sizeMasks = masks[size] || masks[10];
    const mask = sizeMasks[templateIndex % sizeMasks.length] || sizeMasks[0];

    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            const char = mask[r]?.[c];
            if (char === '#') {
                grid[r][c].isBlack = true;
                grid[r][c].letter = null;
            } else {
                grid[r][c].isBlack = false;
            }
        }
    }

    return grid;
}

/**
 * Toggles a cell between black and white.
 * If isSymmetrical is true, mirrors the change at (N-1-r, N-1-c).
 */
export function toggleManualBlackCell(
    grid: GridCell[][],
    row: number,
    col: number,
    isSymmetrical: boolean = true
): GridCell[][] {
    const size = grid.length;
    const newGrid: GridCell[][] = grid.map(r => r.map(c => ({ ...c })));
    const targetState = !newGrid[row][col].isBlack;

    newGrid[row][col].isBlack = targetState;
    if (targetState) {
        newGrid[row][col].letter = null;
    }

    if (isSymmetrical) {
        const mirrorRow = size - 1 - row;
        const mirrorCol = size - 1 - col;
        newGrid[mirrorRow][mirrorCol].isBlack = targetState;
        if (targetState) {
            newGrid[mirrorRow][mirrorCol].letter = null;
        }
    }

    return newGrid;
}

/**
 * Identifies the active word slot on the grid for the selected cell and direction.
 */
export function getActiveSlot(
    grid: GridCell[][],
    row: number,
    col: number,
    direction: 'across' | 'down'
): ManualSlot | null {
    const size = grid.length;
    if (row < 0 || row >= size || col < 0 || col >= size) return null;
    if (grid[row][col].isBlack) return null;

    if (direction === 'across') {
        let startCol = col;
        while (startCol > 0 && !grid[row][startCol - 1].isBlack) {
            startCol--;
        }
        let endCol = col;
        while (endCol < size - 1 && !grid[row][endCol + 1].isBlack) {
            endCol++;
        }
        const length = endCol - startCol + 1;
        if (length < 2) return null; // Single letters don't form words

        const pattern: (string | null)[] = [];
        let filledWord = '';
        let isComplete = true;

        for (let c = startCol; c <= endCol; c++) {
            const letter = grid[row][c].letter;
            pattern.push(letter || null);
            if (letter) {
                filledWord += letter;
            } else {
                isComplete = false;
            }
        }

        const isValid = isComplete && isAuthenticMarathiWord(filledWord);
        const clue = isComplete ? (getMarathiWordClue(filledWord) || '') : '';

        return {
            row,
            col: startCol,
            direction: 'across',
            length,
            pattern,
            filledWord,
            isComplete,
            isValidWord: isValid,
            number: 0,
            clue
        };
    } else {
        let startRow = row;
        while (startRow > 0 && !grid[startRow - 1][col].isBlack) {
            startRow--;
        }
        let endRow = row;
        while (endRow < size - 1 && !grid[endRow + 1][col].isBlack) {
            endRow++;
        }
        const length = endRow - startRow + 1;
        if (length < 2) return null;

        const pattern: (string | null)[] = [];
        let filledWord = '';
        let isComplete = true;

        for (let r = startRow; r <= endRow; r++) {
            const letter = grid[r][col].letter;
            pattern.push(letter || null);
            if (letter) {
                filledWord += letter;
            } else {
                isComplete = false;
            }
        }

        const isValid = isComplete && isAuthenticMarathiWord(filledWord);
        const clue = isComplete ? (getMarathiWordClue(filledWord) || '') : '';

        return {
            row: startRow,
            col,
            direction: 'down',
            length,
            pattern,
            filledWord,
            isComplete,
            isValidWord: isValid,
            number: 0,
            clue
        };
    }
}

/**
 * Searches our rich 1000+ Marathi word repository & authentic dictionary for matching words.
 */
export function findWordSuggestions(
    grid: GridCell[][],
    row: number,
    col: number,
    direction: 'across' | 'down',
    maxResults: number = 25
): WordSuggestion[] {
    const slot = getActiveSlot(grid, row, col, direction);
    if (!slot) return [];

    const { length, pattern } = slot;
    const suggestions: WordSuggestion[] = [];
    const seenWords = new Set<string>();

    const matchesPattern = (word: string, graphemes: string[]): boolean => {
        if (graphemes.length !== length) return false;
        for (let i = 0; i < length; i++) {
            const expected = pattern[i];
            if (expected && expected !== graphemes[i]) {
                return false;
            }
        }
        return true;
    };

    // 1. Check Custom Word Bank first
    const customBank = getSavedCustomWordBank();
    for (const item of customBank) {
        const graphemes = getGraphemes(item.word);
        if (matchesPattern(item.word, graphemes) && !seenWords.has(item.word)) {
            seenWords.add(item.word);
            suggestions.push({
                word: item.word,
                clue: item.clue || getMarathiWordClue(item.word) || 'वापरकर्त्याचा सानुकूल शब्द',
                source: 'custom',
                sourceLabel: '⭐ तुमचा शब्द',
                letterCount: length,
            });
        }
    }

    // 2. Check 1000+ Certified User Lexicon
    for (const word of ALL_USER_1000_WORDS) {
        if (seenWords.has(word)) continue;
        const graphemes = getGraphemes(word);
        if (matchesPattern(word, graphemes)) {
            seenWords.add(word);
            suggestions.push({
                word,
                clue: getMarathiWordClue(word) || 'अस्सल मराठी शब्द',
                source: '1000_lexicon',
                sourceLabel: '🌟 १००० निवडक भांडार',
                letterCount: length,
            });
            if (suggestions.length >= maxResults) break;
        }
    }

    // 3. Check Certified Marathi Dictionary
    if (suggestions.length < maxResults) {
        for (const [word, clue] of Object.entries(MARATHI_DICTIONARY)) {
            if (seenWords.has(word)) continue;
            const graphemes = getGraphemes(word);
            if (matchesPattern(word, graphemes)) {
                seenWords.add(word);
                suggestions.push({
                    word,
                    clue: sanitizeClue(word, clue),
                    source: 'dictionary',
                    sourceLabel: '📖 अस्सल शब्दकोश',
                    letterCount: length,
                });
                if (suggestions.length >= maxResults) break;
            }
        }
    }

    return suggestions;
}

/**
 * Real-time Gemini AI word completion suggestion for difficult/creative crossword patterns.
 */
export async function fetchAiWordSuggestions(
    pattern: (string | null)[],
    length: number,
    existingLetters: string = ''
): Promise<WordSuggestion[]> {
    try {
        const key = (typeof process !== 'undefined' && process?.env)
            ? (process.env.GEMINI_API_KEY || process.env.API_KEY)
            : undefined;
        if (!key || key === 'PLACEHOLDER_API_KEY') {
            return [];
        }

        const ai = new GoogleGenAI({ apiKey: key });
        const patternStr = pattern.map((p, idx) => p ? `${idx + 1}ले '${p}'` : `${idx + 1}ले रिकामे`).join(', ');

        const prompt = `तुम्ही एक उच्च दर्जाचे मराठी शब्दकोडे तज्ज्ञ आहात.
मला खालील निकषांनुसार अचूक, अर्थपूर्ण, वृत्तपत्र दर्जाचे अस्सल मराठी शब्द आणि त्यांचे अर्थपूर्ण क्लूज (कोड्याच्या सूचना) हवे आहेत:
- शब्दाची अक्षर संख्या: बरोबर ${length} अक्षरे.
- अक्षरांचा पॅटर्न: [${patternStr}]
- नियम: जोडाक्षरे शक्यतो नसलेले किंवा अत्यंत नगण्य, सरळसोट देवनागरी शब्द. क्लूमध्ये उत्तराचा शब्द कधीही उघड करू नका.

कृपया ५ ते १० मराठी शब्द JSON ॲरे स्वरूपात द्या.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            word: { type: Type.STRING, description: 'मराठी शब्द' },
                            clue: { type: Type.STRING, description: 'अचूक मराठी क्लू' }
                        },
                        required: ['word', 'clue']
                    }
                }
            }
        });

        const text = response.text?.trim() || '[]';
        const parsed = JSON.parse(text);
        const result: WordSuggestion[] = [];

        if (Array.isArray(parsed)) {
            for (const item of parsed) {
                if (item.word && typeof item.word === 'string') {
                    const cleanWord = item.word.trim();
                    const graphemes = getGraphemes(cleanWord);
                    if (graphemes.length === length) {
                        result.push({
                            word: cleanWord,
                            clue: sanitizeClue(cleanWord, item.clue || 'एआय सुचवलेला अर्थ'),
                            source: 'ai',
                            sourceLabel: '🤖 एआय सुचवलेला शब्द',
                            letterCount: length,
                        });
                    }
                }
            }
        }

        return result;
    } catch (_e) {
        return [];
    }
}

/**
 * Fills a complete word into the grid slot, updating the cells.
 */
export function fillWordInSlot(
    grid: GridCell[][],
    slot: ManualSlot,
    word: string
): GridCell[][] {
    const graphemes = getGraphemes(word);
    const newGrid = grid.map(r => r.map(c => ({ ...c })));
    const { row, col, direction, length } = slot;

    for (let i = 0; i < Math.min(length, graphemes.length); i++) {
        const letter = graphemes[i];
        if (direction === 'across') {
            newGrid[row][col + i].letter = letter;
            newGrid[row][col + i].isBlack = false;
        } else {
            newGrid[row + i][col].letter = letter;
            newGrid[row + i][col].isBlack = false;
        }
    }

    return newGrid;
}

/**
 * Calculates live crossword numbering, extracts all words and clues, and provides validation metrics.
 */
export function autoNumberManualGrid(
    grid: GridCell[][],
    customCluesMap: Map<string, string> = new Map()
) {
    const size = grid.length;
    const workingGrid: GridCell[][] = grid.map(r => r.map(c => ({
        letter: c.isBlack ? null : (c.letter || null),
        isBlack: Boolean(c.isBlack),
        number: null
    })));

    let clueNumber = 1;
    const numberMap = new Map<string, number>();

    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            if (workingGrid[r][c].isBlack) continue;

            const isAcrossStart = (c === 0 || workingGrid[r][c - 1]?.isBlack) && (c + 1 < size && !workingGrid[r][c + 1]?.isBlack);
            const isDownStart = (r === 0 || workingGrid[r - 1]?.[c]?.isBlack) && (r + 1 < size && !workingGrid[r + 1]?.[c]?.isBlack);

            if (isAcrossStart || isDownStart) {
                workingGrid[r][c].number = clueNumber;
                numberMap.set(`${r},${c}`, clueNumber);
                clueNumber++;
            }
        }
    }

    const placedWordsRaw = extractPlacedWordsFromGrid(workingGrid);

    const placedWords: PlacedWord[] = placedWordsRaw.map(p => {
        const cleanWord = p.word.trim();
        let rawClue = customCluesMap.get(cleanWord);
        if (!rawClue || isGenericClue(rawClue)) {
            rawClue = getMarathiWordClue(cleanWord) || MARATHI_DICTIONARY[cleanWord] || SMART_WORD_CLUES[cleanWord] || generateSmartMarathiClue(cleanWord);
        }
        const finalClue = sanitizeClue(cleanWord, rawClue) || getMarathiWordClue(cleanWord) || generateSmartMarathiClue(cleanWord);
        return {
            ...p,
            word: cleanWord,
            clue: finalClue,
            number: numberMap.get(`${p.row},${p.col}`) || 0
        };
    });

    const clues: Clues = { across: [], down: [] };
    const invalidWords: string[] = [];
    let validWordsCount = 0;

    placedWords.forEach(pw => {
        if (pw.number > 0) {
            const isValid = isAuthenticMarathiWord(pw.word);
            if (isValid) {
                validWordsCount++;
            } else {
                invalidWords.push(pw.word);
            }

            const clueItem = { number: pw.number, clue: pw.clue || sanitizeClue(pw.word, getMarathiWordClue(pw.word) || generateSmartMarathiClue(pw.word)), word: pw.word };
            if (pw.direction === 'across') {
                clues.across.push(clueItem);
            } else {
                clues.down.push(clueItem);
            }
        }
    });

    clues.across.sort((a, b) => a.number - b.number);
    clues.down.sort((a, b) => a.number - b.number);

    const totalCells = size * size;
    const blackCells = workingGrid.flat().filter(c => c.isBlack).length;
    const totalLetters = workingGrid.flat().filter(c => !c.isBlack && c.letter).length;
    const blackSquarePercentage = Math.round((blackCells / totalCells) * 100);

    return {
        grid: workingGrid,
        placedWords,
        clues,
        stats: {
            acrossCount: clues.across.length,
            downCount: clues.down.length,
            totalWords: clues.across.length + clues.down.length,
            totalLetters,
            blackCells,
            blackSquarePercentage,
            validWordsCount,
            invalidWords,
            isAllValid: invalidWords.length === 0 && (clues.across.length > 0 || clues.down.length > 0)
        }
    };
}
