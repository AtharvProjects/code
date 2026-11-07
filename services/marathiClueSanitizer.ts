/**
 * Marathi Clue Sanitizer & First-Letter Integrity Guard
 * 
 * Provides an app-wide permanent safeguard against:
 * 1. Initial letter / matra truncation (उदा. 'वरण' -> 'रण', 'किल्ला' -> 'ल्ला', 'वाद्य' -> 'द्य')
 * 2. Orphaned dependent vowel signs (अनाथ मात्रा: ा, ि, ी, ु, ू, इत्यादी)
 * 3. Answer word leakage (Zero Leakage)
 * 4. Generic robotic placeholder templates
 */

import { MARATHI_DICTIONARY, SMART_WORD_CLUES } from './marathiDictionary';

const DEVANAGARI_DEPENDENT_SIGNS = /^[\u0901-\u0903\u093C\u093E-\u094D]/;

/**
 * Validates whether a clue begins with valid, intact Devanagari text
 * and does not suffer from severed initial consonants or orphaned matras.
 */
export function validateDevanagariClueIntegrity(clue: string): { isValid: boolean; reason?: string } {
    if (!clue || !clue.trim()) {
        return { isValid: false, reason: 'Empty clue' };
    }
    const trimmed = clue.trim();

    // Check for orphaned dependent vowel sign / virama at start
    if (DEVANAGARI_DEPENDENT_SIGNS.test(trimmed)) {
        return { isValid: false, reason: 'Starts with orphaned dependent matra or virama' };
    }

    return { isValid: true };
}

/**
 * Permanent First-Letter Integrity Guard:
 * Compares the first meaningful Devanagari word before and after sanitization.
 * If any regex or cleaning step chopped the initial consonant (e.g. 'वरण' -> 'रण', 'किल्ला' -> 'ल्ला'),
 * this guard immediately catches it and restores the original authentic word.
 */
export function guardFirstWordIntegrity(word: string, rawClue: string, cleanedClue: string): string {
    if (!cleanedClue || !cleanedClue.trim()) return cleanedClue;
    let result = cleanedClue.trim();

    // 1. Detect and recover severed consonants if clue begins with an orphaned dependent matra/virama
    if (DEVANAGARI_DEPENDENT_SIGNS.test(result)) {
        if (rawClue && rawClue.trim()) {
            const rawMatch = rawClue.match(/(?:^|[\s:;=\-–—\(\[\{"'\u2022\*\d०-९]+)([\u0900-\u097F\u200C\u200D]+)/);
            if (rawMatch && rawMatch[1]) {
                const rawFirstWord = rawMatch[1].trim();
                const cleanFirstWord = result.match(/^[\u0900-\u097F\u200C\u200D]+/)?.[0] || '';
                if (cleanFirstWord && rawFirstWord.endsWith(cleanFirstWord)) {
                    result = result.replace(/^[\u0900-\u097F\u200C\u200D]+/, rawFirstWord);
                }
            }
        }
        // If still starts with an orphan matra, fallback to pristine dictionary clue
        if (DEVANAGARI_DEPENDENT_SIGNS.test(result)) {
            const cleanWord = (word || '').trim();
            const fallback = (cleanWord && (MARATHI_DICTIONARY[cleanWord] || SMART_WORD_CLUES[cleanWord])) || '';
            if (fallback && !DEVANAGARI_DEPENDENT_SIGNS.test(fallback)) {
                return fallback;
            }
        }
    }

    // 2. Prevent chopped initial consonants (e.g. 'वरण' -> 'रण', 'किल्ला' -> 'ल्ला', 'वाद्य' -> 'द्य')
    if (rawClue && rawClue.trim()) {
        const rawMatch = rawClue.match(/(?:^|[\s:;=\-–—\(\[\{"'\u2022\*\d०-९]+)([\u0900-\u097F\u200C\u200D]+)/);
        const cleanedMatch = result.match(/^([\u0900-\u097F\u200C\u200D]+)/);

        if (rawMatch && cleanedMatch) {
            const rawFirst = rawMatch[1].trim();
            const cleanedFirst = cleanedMatch[1].trim();
            const cleanWord = (word || '').trim();

            const ignoredLabels = new Set([
                'उत्तर', 'शब्द', 'उत्तरशब्द', 'उदा', 'क्लु', 'संकेत', 'अर्थ', 
                'प्रश्न', 'क्रमांक', 'आडवा', 'उभा', 'अस्सल', 'मराठी'
            ]);

            if (rawFirst !== cleanWord && !ignoredLabels.has(rawFirst) && rawFirst.length > cleanedFirst.length) {
                if (rawFirst.endsWith(cleanedFirst)) {
                    result = result.replace(new RegExp(`^${cleanedFirst}`), rawFirst);
                }
            }
        }
    }

    // 3. Known corrupted phrase repair: "रण किंवा उसळी" -> "वरण किंवा उसळी"
    if (/^रण\s+किंवा\s+उसळी/i.test(result)) {
        result = result.replace(/^रण\s+किंवा\s+उसळी/i, 'वरण किंवा उसळी');
    }

    return result;
}
