import { PuzzleData } from '../types';
import { extractPlacedWordsFromGrid } from './crosswordService';

export interface DownloadedPuzzleRecord {
    id: string;
    attemptNumber: number; // 1, 2, 3...
    timestamp: number;
    dateFormatted: string;
    gridSize: number;
    theme: string;
    wordCount: number;
    words: string[]; // List of authentic Marathi words in this downloaded puzzle
}

export interface DownloadedHistoryStats {
    totalDownloadedCount: number;
    currentAttemptNumber: number;
    blockedWordsCount: number;
    freedWordsCount: number;
    activeWindowAttemptsCount: number; // up to 100
}

const STORAGE_KEY = 'marathiDownloadedPuzzlesHistory_v1';
const MAX_BLOCKED_ATTEMPTS_WINDOW = 100;

function toDevanagariNumerals(num: number | string): string {
    const marathiDigits = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];
    return String(num).replace(/[0-9]/g, d => marathiDigits[Number(d)]);
}

function formatCurrentDateTimeMarathi(ts: number): string {
    const d = new Date(ts);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    const dateStr = `${day}/${month}/${year}`;
    const timeStr = `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
    return `${toDevanagariNumerals(dateStr)} ${toDevanagariNumerals(timeStr)}`;
}

let memoryStorageFallback: Record<string, string> = {};

function getStorage(): { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void } {
    if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage;
    }
    if (typeof localStorage !== 'undefined') {
        return localStorage;
    }
    return {
        getItem: (k: string) => memoryStorageFallback[k] || null,
        setItem: (k: string, v: string) => { memoryStorageFallback[k] = v; },
        removeItem: (k: string) => { delete memoryStorageFallback[k]; }
    };
}

/**
 * Retrieves the complete history of downloaded puzzle attempts from localStorage.
 */
export function getDownloadedPuzzlesHistory(): DownloadedPuzzleRecord[] {
    const storage = getStorage();
    if (!storage) return [];
    try {
        const raw = storage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
            return parsed;
        }
        return [];
    } catch (e) {
        console.error('Failed to load downloaded puzzles history:', e);
        return [];
    }
}

/**
 * Saves the downloaded puzzles history to localStorage.
 */
export function saveDownloadedPuzzlesHistory(history: DownloadedPuzzleRecord[]): void {
    const storage = getStorage();
    if (!storage) return;
    try {
        storage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch (e) {
        console.error('Failed to save downloaded puzzles history:', e);
    }
}

/**
 * Extracts all unique placed words from a puzzle.
 */
export function extractUniqueWordsFromPuzzle(puzzle: PuzzleData): string[] {
    const wordSet = new Set<string>();
    
    // 1. From grid
    if (puzzle.grid && puzzle.grid.length > 0) {
        const placed = extractPlacedWordsFromGrid(puzzle.grid);
        placed.forEach(p => {
            if (p.word && p.word.trim().length >= 2) {
                wordSet.add(p.word.trim());
            }
        });
    }

    // 2. From clues
    if (puzzle.clues?.across) {
        puzzle.clues.across.forEach(c => {
            if (c.word && c.word.trim().length >= 2) wordSet.add(c.word.trim());
        });
    }
    if (puzzle.clues?.down) {
        puzzle.clues.down.forEach(c => {
            if (c.word && c.word.trim().length >= 2) wordSet.add(c.word.trim());
        });
    }

    // 3. From words array if attached
    if (Array.isArray((puzzle as any).words)) {
        (puzzle as any).words.forEach((w: any) => {
            const wordStr = typeof w === 'string' ? w : w?.word;
            if (wordStr && wordStr.trim().length >= 2) wordSet.add(wordStr.trim());
        });
    }

    return Array.from(wordSet).sort();
}

/**
 * Records a puzzle when it is DOWNLOADED by the user as an official attempt.
 * This locks its words from being reused for the next 100 downloaded attempts.
 */
export function recordDownloadedPuzzle(
    puzzle: PuzzleData,
    theme: string = 'अस्सल मराठी शब्दवेध'
): DownloadedPuzzleRecord {
    const history = getDownloadedPuzzlesHistory();
    const nextAttemptNumber = history.length + 1;
    const now = Date.now();
    const words = extractUniqueWordsFromPuzzle(puzzle);
    const size = puzzle.grid?.length || 10;

    const record: DownloadedPuzzleRecord = {
        id: `downloaded_att_${nextAttemptNumber}_${now}`,
        attemptNumber: nextAttemptNumber,
        timestamp: now,
        dateFormatted: formatCurrentDateTimeMarathi(now),
        gridSize: size,
        theme,
        wordCount: words.length,
        words
    };

    history.push(record);
    saveDownloadedPuzzlesHistory(history);
    return record;
}

/**
 * Returns the Set of all words used in the last 100 downloaded puzzles.
 * These words are STRICTLY FORBIDDEN from being reused in any new puzzle.
 */
export function getBlockedWords(): Set<string> {
    const history = getDownloadedPuzzlesHistory();
    // Take the last 100 downloaded attempts (rolling 100-attempt exclusion window)
    const activeWindow = history.slice(-MAX_BLOCKED_ATTEMPTS_WINDOW);
    const blocked = new Set<string>();
    activeWindow.forEach(record => {
        record.words.forEach(w => {
            const clean = w.trim();
            if (clean) blocked.add(clean);
        });
    });
    return blocked;
}

/**
 * Returns the Set of words that were used in attempts older than 100 attempts ago
 * and are NOT in the active 100-attempt window.
 * Per user condition: "मागील कोड्यामधील शब्द शर्ती नुसार वापर करण्यास परवानगी असेल"
 * These words are freed and permitted to be recycled.
 */
export function getFreedWords(): Set<string> {
    const history = getDownloadedPuzzlesHistory();
    if (history.length <= MAX_BLOCKED_ATTEMPTS_WINDOW) {
        return new Set<string>();
    }

    const olderThanWindow = history.slice(0, -MAX_BLOCKED_ATTEMPTS_WINDOW);
    const currentlyBlocked = getBlockedWords();
    const freed = new Set<string>();

    olderThanWindow.forEach(record => {
        record.words.forEach(w => {
            const clean = w.trim();
            if (clean && !currentlyBlocked.has(clean)) {
                freed.add(clean);
            }
        });
    });

    return freed;
}

/**
 * Returns the current attempt number for the next puzzle to be downloaded.
 */
export function getCurrentAttemptNumber(): number {
    return getDownloadedPuzzlesHistory().length + 1;
}

/**
 * Checks if a specific word is blocked under the strict 100-attempt rule.
 */
export function isWordBlocked(word: string): boolean {
    if (!word) return false;
    return getBlockedWords().has(word.trim());
}

/**
 * Computes summary statistics for UI display.
 */
export function getDownloadedHistoryStats(): DownloadedHistoryStats {
    const history = getDownloadedPuzzlesHistory();
    const blocked = getBlockedWords();
    const freed = getFreedWords();
    return {
        totalDownloadedCount: history.length,
        currentAttemptNumber: history.length + 1,
        blockedWordsCount: blocked.size,
        freedWordsCount: freed.size,
        activeWindowAttemptsCount: Math.min(MAX_BLOCKED_ATTEMPTS_WINDOW, history.length)
    };
}

/**
 * Clears the downloaded history (used if user explicitly resets history).
 */
export function clearDownloadedPuzzlesHistory(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
        console.error('Failed to clear downloaded history:', e);
    }
}
