/**
 * Infinite Auto-Learning Marathi Vocabulary Engine ("स्वयंशिक्षक अनंत शब्दकोश")
 * 
 * Guarantees:
 * 1. EVERY word typed, changed, or searched by user automatically triggers high-speed AI clue generation.
 * 2. EVERY newly generated or edited word and clue is AUTOMATICALLY & PERMANENTLY saved to local persistent storage.
 * 3. The dictionary grows infinitely (thousands to millions of words).
 * 4. NO Marathi word EVER feels unknown to the app!
 */

import { MARATHI_DICTIONARY, SMART_WORD_CLUES, sanitizeClue, isAuthenticMarathiWord, getMarathiWordClue, generateSmartMarathiClue, isGenericClue, FORBIDDEN_JUNK_WORDS, FORBIDDEN_AWKWARD_WORDS, isSyntheticSuffixWord } from './marathiDictionary';
import { USER_WORDS_SET } from './userLexicon1000';
import { IMPORTED_VOCABULARY_MAP, IMPORTED_VOCABULARY_WORDS } from './importedVocabularyDatabase';
import { extractPlacedWordsFromGrid } from './crosswordService';
import { invalidateWordCatalogCache } from './dynamicCrosswordSolver';
import { GridCell } from '../types';
import persistentLearnedWordsRaw from '../data/persistent_learned_lexicon.json';

export interface LearnedWordEntry {
    word: string;
    clue: string;
    addedAt: number;
    source?: string;
}

const INFINITE_STORAGE_KEY = 'shabdavedh_infinite_learned_lexicon_v1';

// In-memory registry of learned words
const learnedRegistry = new Map<string, LearnedWordEntry>();

/**
 * Initialize and load all previously auto-learned words from persistent storage and backend bundle into active memory.
 */
export function initializeInfiniteLexicon(): number {
    let count = 0;

    // 1. Load embedded persistent learned words from repo
    try {
        if (Array.isArray(persistentLearnedWordsRaw)) {
            for (const entry of persistentLearnedWordsRaw) {
                if (entry && entry.word && entry.clue) {
                    const cleanWord = entry.word.trim();
                    const rawClue = entry.clue.trim();
                    const cleanClue = sanitizeClue(cleanWord, rawClue);
                    if (cleanWord.length >= 2 && cleanClue.length >= 2) {
                        learnedRegistry.set(cleanWord, { ...entry, clue: cleanClue });
                        MARATHI_DICTIONARY[cleanWord] = cleanClue;
                        SMART_WORD_CLUES[cleanWord] = cleanClue;
                        USER_WORDS_SET.add(cleanWord);
                        IMPORTED_VOCABULARY_MAP[cleanWord] = cleanClue;
                        count++;
                    }
                }
            }
        }
    } catch (e) {
        console.warn('Failed to load embedded persistent words:', e);
    }

    // 2. Load any browser localStorage saved words
    try {
        if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
            const raw = localStorage.getItem(INFINITE_STORAGE_KEY);
            if (raw) {
                const parsed: LearnedWordEntry[] = JSON.parse(raw);
                if (Array.isArray(parsed)) {
                    for (const entry of parsed) {
                        if (entry && entry.word && entry.clue) {
                            const cleanWord = entry.word.trim();
                            const rawClue = entry.clue.trim();
                            const cleanClue = sanitizeClue(cleanWord, rawClue);
                            if (cleanWord.length >= 2 && cleanClue.length >= 2) {
                                learnedRegistry.set(cleanWord, { ...entry, clue: cleanClue });
                                MARATHI_DICTIONARY[cleanWord] = cleanClue;
                                SMART_WORD_CLUES[cleanWord] = cleanClue;
                                USER_WORDS_SET.add(cleanWord);
                                IMPORTED_VOCABULARY_MAP[cleanWord] = cleanClue;
                                count++;
                            }
                        }
                    }
                }
            }
        }
    } catch (e) {
        console.warn('Failed to initialize infinite lexicon from storage:', e);
    }

    return count;
}

/**
 * Automatically & permanently save a new word with its clue to the infinite lexicon.
 */
export function saveWordToInfiniteLexicon(word: string, clue: string, source: string = 'ai_auto'): boolean {
    if (!word || !clue) return false;
    const cleanWord = word.trim();
    const cleanClue = sanitizeClue(cleanWord, clue.trim());
    if (cleanWord.length < 2 || cleanClue.length < 2) return false;

    const entry: LearnedWordEntry = {
        word: cleanWord,
        clue: cleanClue,
        addedAt: Date.now(),
        source
    };

    // Update in-memory registry
    learnedRegistry.set(cleanWord, entry);

    // Update runtime memory dictionaries instantly
    MARATHI_DICTIONARY[cleanWord] = cleanClue;
    SMART_WORD_CLUES[cleanWord] = cleanClue;
    USER_WORDS_SET.add(cleanWord);
    IMPORTED_VOCABULARY_MAP[cleanWord] = cleanClue;

    // Persist to storage
    try {
        if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
            const allEntries = Array.from(learnedRegistry.values());
            localStorage.setItem(INFINITE_STORAGE_KEY, JSON.stringify(allEntries));
        }
    } catch (e) {
        console.error('Error persisting learned word to infinite storage:', e);
    }

    return true;
}

/**
 * Batch save multiple words & clues into the infinite lexicon.
 */
export function batchSaveWordsToInfiniteLexicon(entries: { word: string; clue: string }[], source: string = 'batch_ai'): number {
    if (!Array.isArray(entries) || entries.length === 0) return 0;
    let addedCount = 0;

    for (const e of entries) {
        if (e && e.word && e.clue) {
            const cleanW = e.word.trim();
            const cleanC = sanitizeClue(cleanW, e.clue.trim());
            if (cleanW.length >= 2 && cleanC.length >= 2) {
                learnedRegistry.set(cleanW, {
                    word: cleanW,
                    clue: cleanC,
                    addedAt: Date.now(),
                    source
                });
                MARATHI_DICTIONARY[cleanW] = cleanC;
                SMART_WORD_CLUES[cleanW] = cleanC;
                USER_WORDS_SET.add(cleanW);
                IMPORTED_VOCABULARY_MAP[cleanW] = cleanC;
                addedCount++;
            }
        }
    }

    // Persist batch to storage
    try {
        if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
            const allEntries = Array.from(learnedRegistry.values());
            localStorage.setItem(INFINITE_STORAGE_KEY, JSON.stringify(allEntries));
        }
    } catch (e) {
        console.error('Error persisting batch entries to infinite storage:', e);
    }

    return addedCount;
}

/**
 * Get total count statistics of learned words.
 */
export function getLearnedLexiconStats(): { learnedCount: number; totalBaseCount: number; totalCombinedCount: number } {
    const learnedCount = learnedRegistry.size;
    const totalBaseCount = IMPORTED_VOCABULARY_WORDS.length;
    return {
        learnedCount,
        totalBaseCount,
        totalCombinedCount: totalBaseCount + learnedCount
    };
}

/**
 * Computes the grand total count of unique authentic words across all dictionaries,
 * lexicons, and dynamically learned persistent storage.
 */
export function getTotalAuthenticWordsCount(): number {
    const uniqueSet = new Set<string>();
    
    // 1. Core dictionary
    Object.keys(MARATHI_DICTIONARY).forEach(w => {
        const clean = w.trim();
        if (clean.length >= 2 && !FORBIDDEN_JUNK_WORDS.has(clean) && !FORBIDDEN_AWKWARD_WORDS.has(clean) && !isSyntheticSuffixWord(clean)) {
            uniqueSet.add(clean);
        }
    });

    // 2. User 1000 words
    USER_WORDS_SET.forEach(w => {
        const clean = w.trim();
        if (clean.length >= 2 && !FORBIDDEN_JUNK_WORDS.has(clean) && !FORBIDDEN_AWKWARD_WORDS.has(clean) && !isSyntheticSuffixWord(clean)) {
            uniqueSet.add(clean);
        }
    });

    // 3. Imported vocabulary
    IMPORTED_VOCABULARY_WORDS.forEach(w => {
        const clean = w.trim();
        if (clean.length >= 2 && !FORBIDDEN_JUNK_WORDS.has(clean) && !FORBIDDEN_AWKWARD_WORDS.has(clean) && !isSyntheticSuffixWord(clean)) {
            uniqueSet.add(clean);
        }
    });

    // 4. Learned words
    learnedRegistry.forEach((_val, w) => {
        const clean = w.trim();
        if (clean.length >= 2 && !FORBIDDEN_JUNK_WORDS.has(clean) && !FORBIDDEN_AWKWARD_WORDS.has(clean) && !isSyntheticSuffixWord(clean)) {
            uniqueSet.add(clean);
        }
    });

    return uniqueSet.size;
}

export interface ManualPuzzleSaveResult {
    totalPlacedWords: number;
    newWordsAdded: number;
    duplicatesSkipped: number;
    newWordList: string[];
    totalActiveLexiconCount: number;
}

/**
 * Extracts all words and clues from a manually constructed (complete or partial) puzzle grid,
 * de-duplicates against existing words in the repository, permanently persists all new words
 * and clues to local persistent storage + backend server, invalidates the catalog cache,
 * and notifies all listeners across the app.
 */
export async function saveManualPuzzleWordsToLexicon(
    grid: GridCell[][],
    customClues: Map<string, string> = new Map()
): Promise<ManualPuzzleSaveResult> {
    if (!grid || grid.length === 0) {
        return {
            totalPlacedWords: 0,
            newWordsAdded: 0,
            duplicatesSkipped: 0,
            newWordList: [],
            totalActiveLexiconCount: getTotalAuthenticWordsCount()
        };
    }

    // 1. Extract all placed words from the current grid (across and down, length >= 2)
    const placed = extractPlacedWordsFromGrid(grid);
    const uniquePlacedMap = new Map<string, string>();

    for (const p of placed) {
        const cleanWord = (p.word || '').trim();
        // Skip single aksharas or words with invalid starts
        if (cleanWord.length < 2 || cleanWord.startsWith('ळ') || cleanWord.startsWith('ण') || cleanWord.includes(' ')) {
            continue;
        }
        if (FORBIDDEN_JUNK_WORDS.has(cleanWord) || isSyntheticSuffixWord(cleanWord)) {
            continue;
        }

        if (!uniquePlacedMap.has(cleanWord)) {
            let rawClue = customClues.get(cleanWord) || '';
            if (!rawClue || isGenericClue(rawClue)) {
                rawClue = getMarathiWordClue(cleanWord) || MARATHI_DICTIONARY[cleanWord] || generateSmartMarathiClue(cleanWord) || 'अस्सल संदर्भ';
            }
            const cleanClue = sanitizeClue(cleanWord, rawClue);
            uniquePlacedMap.set(cleanWord, cleanClue);
        }
    }

    const uniqueWordsList = Array.from(uniquePlacedMap.entries());
    const totalPlacedWords = uniqueWordsList.length;

    // 2. Identify which words are genuinely NEW vs duplicates
    const newWordsToSave: { word: string; clue: string }[] = [];
    let duplicatesSkipped = 0;

    for (const [w, clue] of uniqueWordsList) {
        const alreadyInCoreDict = Boolean(MARATHI_DICTIONARY[w]);
        const alreadyInUserSet = USER_WORDS_SET.has(w);
        const alreadyInImported = Boolean(IMPORTED_VOCABULARY_MAP[w]);
        const alreadyLearned = learnedRegistry.has(w);

        // If it's already in the vocabulary, update clue if current is better, but count as duplicate
        if (alreadyInCoreDict || alreadyInUserSet || alreadyInImported || alreadyLearned) {
            duplicatesSkipped++;
            if (clue && (!MARATHI_DICTIONARY[w] || isGenericClue(MARATHI_DICTIONARY[w]))) {
                MARATHI_DICTIONARY[w] = clue;
                SMART_WORD_CLUES[w] = clue;
            }
        } else {
            // Brand new word!
            newWordsToSave.push({ word: w, clue });
        }
    }

    // 3. Save new words locally to persistent infinite lexicon
    if (newWordsToSave.length > 0) {
        batchSaveWordsToInfiniteLexicon(newWordsToSave, 'manual_constructor_user');
    }

    // 4. Send ALL placed words (and specifically new ones) to backend persistent storage
    if (typeof window !== 'undefined') {
        try {
            const allWordsToSend = uniqueWordsList.map(([word, clue]) => ({ word, clue }));
            await fetch('/api/lexicon/save-words', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ words: allWordsToSend })
            });
        } catch (e) {
            console.warn('Backend /api/lexicon/save-words sync warning (saved locally):', e);
        }
    }

    // 5. Invalidate solver's catalog cache so newly added words are immediately available for future puzzles
    invalidateWordCatalogCache();

    const totalActiveLexiconCount = getTotalAuthenticWordsCount();

    // 6. Broadcast event to update homepage badges and counters in real time
    if (typeof window !== 'undefined') {
        try {
            window.dispatchEvent(new CustomEvent('shabdavedh_lexicon_updated', {
                detail: {
                    totalCount: totalActiveLexiconCount,
                    newWordsAdded: newWordsToSave.length,
                    duplicatesSkipped
                }
            }));
        } catch {}
    }

    return {
        totalPlacedWords,
        newWordsAdded: newWordsToSave.length,
        duplicatesSkipped,
        newWordList: newWordsToSave.map(w => w.word),
        totalActiveLexiconCount
    };
}

/**
 * Get all learned entries array.
 */
export function getAllLearnedWordEntries(): LearnedWordEntry[] {
    return Array.from(learnedRegistry.values());
}

/**
 * Export learned database as downloadable JSON file.
 */
export function exportInfiniteLexiconJSON(): void {
    const data = Array.from(learnedRegistry.values());
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `marathi_infinite_learned_lexicon_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

// Auto-run initialization at module import time
initializeInfiniteLexicon();
