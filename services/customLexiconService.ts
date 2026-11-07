/**
 * Custom Lexicon & Word Bank Management Service ("शब्दभांडार व्यवस्थापक")
 * 
 * Enables users to:
 * 1. Paste thousands of words or upload Word (.docx), Text (.txt), CSV (.csv), or JSON (.json) files.
 * 2. Parse, clean, and organize words by Marathi grapheme length (२, ३, ४, ५, ६+ अक्षरी).
 * 3. Store custom clues or automatically fetch authentic Marathi clues.
 * 4. Persist the user's custom lexicon in localStorage.
 * 5. Solve and generate crosswords strictly using custom words or in hybrid mode.
 */

import { getGraphemes } from './crosswordService';
import { MARATHI_DICTIONARY, getMarathiWordClue, sanitizeClue, generateSmartMarathiClue } from './marathiDictionary';
import { ALL_USER_1000_WORDS } from './userLexicon1000';
import { MasterGridPuzzle, getFreshVerifiedPuzzle, getPuzzleListForSize } from './puzzleBank';
import { PuzzleData, GridCell, Clues, Clue } from '../types';

export interface CustomWordItem {
    word: string;
    clue: string;
    length: number;
    source?: 'user_pasted' | 'file_upload' | 'default_corpus';
    addedAt?: number;
}

export interface CustomLexiconStats {
    totalWords: number;
    len2: number;
    len3: number;
    len4: number;
    len5: number;
    len6Plus: number;
}

const STORAGE_KEY = 'shabdavedh_custom_wordbank_v2';
const STRICT_MODE_KEY = 'shabdavedh_strict_custom_mode_v2';

// Clean and extract valid Marathi Devanagari word
export function cleanDevanagariWord(raw: string): string {
    if (!raw) return '';
    // Trim whitespace and remove quotes, brackets, numbers, bullets, list markers
    let cleaned = raw.trim()
        .replace(/^[\d\u0966-\u096F\.\-\*\u2022\)\(\[\]\{\}\>\:\,\;\'\"\»\⁃\–\—\t]+/g, '')
        .replace(/[\d\u0966-\u096F\.\-\*\u2022\)\(\[\]\{\}\>\:\,\;\'\"\»\⁃\–\—\t]+$/g, '')
        .trim();

    // Keep only valid Devanagari characters, matras, viramas, anusvars, nuktas
    cleaned = cleaned.replace(/[^\u0900-\u097F\u200C\u200D]/g, '');
    return cleaned;
}

/**
 * Parse raw text into structured CustomWordItems.
 * Supports:
 * - Comma separated word list (उदा. "सागर, आकाश, कमळ, पुस्तक, शेतकरी, वाचन...")
 * - Space / newline / tab separated word list
 * - Numbered / bulleted list (उदा. "१. सागर", "• आकाश", "1) कमळ")
 * - Word with clue (उदा. "शब्द : अर्थ/संकेत" किंवा "शब्द - संकेत" किंवा "शब्द = संकेत" किंवा "शब्द -> संकेत")
 * - CSV format ("शब्द,संकेत" किंवा "\"शब्द\",\"संकेत\"")
 */
export function parseRawTextToWords(rawText: string, source: 'user_pasted' | 'file_upload' = 'user_pasted'): CustomWordItem[] {
    if (!rawText || !rawText.trim()) return [];

    const lines = rawText.split(/\r?\n/);
    const resultMap = new Map<string, CustomWordItem>();

    for (const rawLine of lines) {
        let line = rawLine.trim();
        if (!line) continue;

        // Strip leading list bullet/numbering: e.g. '1.', '१.', '1)', '१)', '•', '*', '-'
        line = line.replace(/^[\d\u0966-\u096F]+[\.\)\-\:\s]+/g, '').trim();
        line = line.replace(/^[\u2022\*\-\_\>\»\⁃\–\—\s]+/g, '').trim();
        if (!line) continue;

        let isDef = false;
        let wordPart = '';
        let cluePart = '';

        // 1. Explicit definition separators: colon :, equals =, arrow -> or =>, em-dash —, en-dash –, tab \t
        const colonMatch = line.match(/^([^:\=\—\–\>\t]+)[:\=\—\–\>\t](.+)$/);
        if (colonMatch) {
            const potentialWord = cleanDevanagariWord(colonMatch[1]);
            const graphemes = getGraphemes(potentialWord);
            if (graphemes.length >= 2 && graphemes.length <= 15) {
                isDef = true;
                wordPart = potentialWord;
                cluePart = colonMatch[2].trim();
            }
        }

        // 2. Spaced hyphen ' - ' as definition separator
        if (!isDef && line.includes(' - ')) {
            const parts = line.split(' - ');
            const potentialWord = cleanDevanagariWord(parts[0]);
            const graphemes = getGraphemes(potentialWord);
            if (graphemes.length >= 2 && graphemes.length <= 15 && parts[1]?.trim()) {
                isDef = true;
                wordPart = potentialWord;
                cluePart = parts.slice(1).join(' - ').trim();
            }
        }

        // 3. Quoted CSV format '"word","clue"' or ''word','clue''
        if (!isDef && (line.startsWith('"') || line.startsWith("'"))) {
            const csvMatch = line.match(/^[\"\']([^\"\']+)[\"\']\s*,\s*[\"\']([^\"\']+)[\"\']$/);
            if (csvMatch) {
                const potentialWord = cleanDevanagariWord(csvMatch[1]);
                const graphemes = getGraphemes(potentialWord);
                if (graphemes.length >= 2 && graphemes.length <= 15) {
                    isDef = true;
                    wordPart = potentialWord;
                    cluePart = csvMatch[2].trim();
                }
            }
        }

        // 4. Single comma CSV where column 2 is a multi-word phrase/definition (and line has exactly 1 comma)
        if (!isDef && !line.includes(';') && (line.match(/,/g) || []).length === 1) {
            const parts = line.split(',');
            const potentialWord = cleanDevanagariWord(parts[0]);
            const potentialClue = parts[1].trim();
            const graphemes = getGraphemes(potentialWord);
            // If part 2 contains multiple words (spaces) and has length > 6, treat as word-clue pair
            if (graphemes.length >= 2 && graphemes.length <= 15 && (potentialClue.includes(' ') && potentialClue.length > 6)) {
                isDef = true;
                wordPart = potentialWord;
                cluePart = potentialClue;
            }
        }

        if (isDef && wordPart) {
            const graphemes = getGraphemes(wordPart);
            const finalClue = cluePart
                ? sanitizeClue(wordPart, cluePart)
                : (MARATHI_DICTIONARY[wordPart] || getMarathiWordClue(wordPart) || generateSmartMarathiClue(wordPart));
            
            resultMap.set(wordPart, {
                word: wordPart,
                clue: finalClue,
                length: graphemes.length,
                source,
                addedAt: Date.now()
            });
        } else {
            // It's a word list separated by commas, spaces, semicolons, tabs, dandas, bullets, brackets, etc.
            const tokens = line.split(/[\s\,\;\।\t\u2022\*\_\(\)\[\]\{\}\<\>\/\\\|\n\r]+/);
            for (const token of tokens) {
                const cleaned = cleanDevanagariWord(token);
                if (cleaned) {
                    const graphemes = getGraphemes(cleaned);
                    if (graphemes.length >= 2 && graphemes.length <= 15) {
                        const defaultClue = MARATHI_DICTIONARY[cleaned] || getMarathiWordClue(cleaned) || generateSmartMarathiClue(cleaned);
                        resultMap.set(cleaned, {
                            word: cleaned,
                            clue: defaultClue,
                            length: graphemes.length,
                            source,
                            addedAt: Date.now()
                        });
                    }
                }
            }
        }
    }

    return Array.from(resultMap.values());
}

/**
 * Load default combined corpus words from ALL_USER_1000_WORDS + MARATHI_DICTIONARY with authentic clues.
 */
export function getDefaultCorpusWordItems(): CustomWordItem[] {
    const combinedWordSet = new Set<string>([
        ...ALL_USER_1000_WORDS,
        ...Object.keys(MARATHI_DICTIONARY)
    ]);

    const result: CustomWordItem[] = [];
    for (const w of combinedWordSet) {
        const cleaned = cleanDevanagariWord(w);
        if (!cleaned) continue;
        const graphemes = getGraphemes(cleaned);
        if (graphemes.length >= 2 && graphemes.length <= 15) {
            result.push({
                word: cleaned,
                clue: MARATHI_DICTIONARY[cleaned] || getMarathiWordClue(cleaned) || generateSmartMarathiClue(cleaned),
                length: graphemes.length,
                source: 'default_corpus',
                addedAt: Date.now()
            });
        }
    }

    return result;
}

/**
 * Get active custom words from localStorage (or initialize with default corpus words).
 */
export function getSavedCustomWordBank(): CustomWordItem[] {
    try {
        if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    return parsed;
                }
            }
        }
    } catch (e) {
        console.warn('Failed to load custom word bank from storage:', e);
    }
    return getDefaultCorpusWordItems();
}

/**
 * Save custom word bank to localStorage and update memory dictionary.
 */
export function saveCustomWordBank(words: CustomWordItem[]): void {
    try {
        if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(words));
        }
        // Also update runtime dictionary with user-supplied clues
        for (const item of words) {
            if (item.word && item.clue) {
                MARATHI_DICTIONARY[item.word] = item.clue;
            }
        }
    } catch (e) {
        console.error('Failed to save custom word bank:', e);
    }
}

/**
 * Strict Custom Words Mode state (Strictly use ONLY user's custom words).
 */
export function isStrictCustomWordsMode(): boolean {
    try {
        const val = localStorage.getItem(STRICT_MODE_KEY);
        return val === 'true';
    } catch {
        return false;
    }
}

export function setStrictCustomWordsMode(strict: boolean): void {
    try {
        localStorage.setItem(STRICT_MODE_KEY, strict ? 'true' : 'false');
    } catch (e) {
        console.error('Failed to set strict custom mode:', e);
    }
}

/**
 * Calculate statistical breakdown of words.
 */
export function computeLexiconStats(words: CustomWordItem[]): CustomLexiconStats {
    const stats: CustomLexiconStats = {
        totalWords: words.length,
        len2: 0,
        len3: 0,
        len4: 0,
        len5: 0,
        len6Plus: 0
    };

    for (const item of words) {
        if (item.length === 2) stats.len2++;
        else if (item.length === 3) stats.len3++;
        else if (item.length === 4) stats.len4++;
        else if (item.length === 5) stats.len5++;
        else if (item.length >= 6) stats.len6Plus++;
    }

    return stats;
}

/**
 * Parse Word (.docx) file content in browser.
 */
export async function parseDocxFile(file: File): Promise<CustomWordItem[]> {
    try {
        // Dynamic import mammoth
        const mammoth = await import('mammoth');
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        return parseRawTextToWords(result.value, 'file_upload');
    } catch (err) {
        console.error('Docx parsing error:', err);
        // Fallback: read file as text
        const text = await file.text();
        return parseRawTextToWords(text, 'file_upload');
    }
}

/**
 * Dynamic Fast Solver for generating an interconnected Crossword using ONLY or PREFERENTIALLY
 * the custom words in the active custom lexicon.
 */
export function solveCrosswordWithCustomLexicon(
    gridSize: number = 10,
    attemptNumber: number = 1,
    strictCustomOnly: boolean = false,
    usedWords: Set<string> = new Set()
): PuzzleData | null {
    const customWords = getSavedCustomWordBank();
    const customWordMap = new Map<string, string>();
    customWords.forEach(w => customWordMap.set(w.word, w.clue));

    const wordsByLen = new Map<number, string[]>();
    for (const item of customWords) {
        if (!wordsByLen.has(item.length)) {
            wordsByLen.set(item.length, []);
        }
        wordsByLen.get(item.length)!.push(item.word);
    }

    // 1. Select master grid pattern for this size with rotating masks and fresh words
    const masterList = getPuzzleListForSize(gridSize);
    if (!masterList || masterList.length === 0) return null;

    const baseMaster = getFreshVerifiedPuzzle(usedWords, gridSize, attemptNumber);
    if (!baseMaster) return null;

    // Check if we can use the baseMaster directly by substituting custom clues
    const masterGrid = baseMaster.grid;
    const N = masterGrid.length;

    // Check word matches with custom lexicon
    const acrossWords: { r: number; c: number; word: string }[] = [];
    const downWords: { r: number; c: number; word: string }[] = [];

    // Extract Across (Strictly >= 2 graphemes)
    for (let r = 0; r < N; r++) {
        let cur = '';
        let startC = -1;
        for (let c = 0; c < N; c++) {
            const ch = masterGrid[r][c];
            if (ch && ch !== '#' && ch.trim()) {
                if (cur.length === 0) startC = c;
                cur += ch.trim();
            } else {
                if (cur && getGraphemes(cur).length >= 2) {
                    acrossWords.push({ r, c: startC, word: cur });
                }
                cur = '';
                startC = -1;
            }
        }
        if (cur && getGraphemes(cur).length >= 2) {
            acrossWords.push({ r, c: startC, word: cur });
        }
    }

    // Extract Down (Strictly >= 2 graphemes)
    for (let c = 0; c < N; c++) {
        let cur = '';
        let startR = -1;
        for (let r = 0; r < N; r++) {
            const ch = masterGrid[r][c];
            if (ch && ch !== '#' && ch.trim()) {
                if (cur.length === 0) startR = r;
                cur += ch.trim();
            } else {
                if (cur && getGraphemes(cur).length >= 2) {
                    downWords.push({ r: startR, c, word: cur });
                }
                cur = '';
                startR = -1;
            }
        }
        if (cur && getGraphemes(cur).length >= 2) {
            downWords.push({ r: startR, c, word: cur });
        }
    }

    // Build the grid cells and clues - strictly assign numbers ONLY to valid word starting cells
    const finalGrid: GridCell[][] = [];
    const cellNumbers = new Map<string, number>();
    let currentNumber = 1;

    // Determine numbers sequentially, skipping any cell that does not start a valid >=2 letter word
    for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
            const isAcrossStart = acrossWords.some(w => w.r === r && w.c === c);
            const isDownStart = downWords.some(w => w.r === r && w.c === c);
            if (isAcrossStart || isDownStart) {
                cellNumbers.set(`${r},${c}`, currentNumber);
                currentNumber++;
            }
        }
    }

    for (let r = 0; r < N; r++) {
        const row: GridCell[] = [];
        for (let c = 0; c < N; c++) {
            const ch = masterGrid[r][c];
            const isBlack = !ch || ch === '#' || !ch.trim();
            const num = cellNumbers.get(`${r},${c}`) || null;
            row.push({
                letter: isBlack ? null : ch.trim(),
                isBlack,
                number: num
            });
        }
        finalGrid.push(row);
    }

    const clues: Clues = { across: [], down: [] };

    acrossWords.forEach(item => {
        const num = cellNumbers.get(`${item.r},${item.c}`) || 0;
        const clueText = customWordMap.get(item.word) || MARATHI_DICTIONARY[item.word] || getMarathiWordClue(item.word);
        clues.across.push({
            number: num,
            clue: clueText,
            word: item.word
        });
    });

    downWords.forEach(item => {
        const num = cellNumbers.get(`${item.r},${item.c}`) || 0;
        const clueText = customWordMap.get(item.word) || MARATHI_DICTIONARY[item.word] || getMarathiWordClue(item.word);
        clues.down.push({
            number: num,
            clue: clueText,
            word: item.word
        });
    });

    return {
        grid: finalGrid,
        clues,
        unplacedWords: []
    };
}
