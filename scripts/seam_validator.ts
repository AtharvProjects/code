import { ALL_USER_1000_WORDS } from "../services/userLexicon1000";
import { MARATHI_DICTIONARY } from "../services/marathiDictionary";
import { VERIFIED_PUZZLES_12X12, VERIFIED_PUZZLES } from "../services/puzzleBank";
import { extractPlacedWordsFromGrid, getMarathiWordClue } from "../services/crosswordService";

const validWordsSet = new Set([...ALL_USER_1000_WORDS, ...Object.keys(MARATHI_DICTIONARY)]);

function checkGrid(grid: string[][]) {
    const size = grid.length;
    const cellGrid = grid.map(row => row.map(c => ({
        letter: c === "#" ? null : c,
        isBlack: c === "#",
        number: null
    })));

    const words = extractPlacedWordsFromGrid(cellGrid as any);
    const invalid = words.filter(w => !validWordsSet.has(w.word));
    return {
        totalWords: words.length,
        invalidWords: invalid,
        validCount: words.length - invalid.length
    };
}

console.log("Validator ready. Valid words count:", validWordsSet.size);
