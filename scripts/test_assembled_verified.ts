import { VERIFIED_PUZZLES_12X12 } from "../services/puzzleBank";
import { ALL_USER_1000_WORDS } from "../services/userLexicon1000";
import { MARATHI_DICTIONARY } from "../services/marathiDictionary";
import { checkAllWordsValid } from "./solve_large_guaranteed";
import { getGraphemes } from "../services/crosswordService";

const p0 = VERIFIED_PUZZLES_12X12[0];
const p1 = VERIFIED_PUZZLES_12X12[1];

// Let us assemble 25x25:
const g25 = Array(25).fill(null).map(() => Array(25).fill("#"));

// Place the 4 quadrants:
for (let r = 0; r < 12; r++) {
  for (let c = 0; c < 12; c++) {
    g25[r][c] = p0.grid[r][c];
    g25[r][c + 13] = p1.grid[r][c];
    g25[r + 13][c] = p1.grid[r][c];
    g25[r + 13][c + 13] = p0.grid[r][c];
  }
}

// In row 12: exactly 4 black blocks at 4, 9, 15, 20.
// Let us pick 5 verified words:
// Slot 1 (cols 0..3): "इतिहास" (इ, ति, हा, स)
// Slot 2 (cols 5..8): "राजवाडा" (रा, ज, वा, डा)
// Slot 3 (cols 10..14): "कल्याणकारी" (क, ल्या, ण, का, री) -> index 12 is 'ण'!
// Slot 4 (cols 16..19): "देशभक्त" (दे, श, भ, क्त)
// Slot 5 (cols 21..24): "सुसंस्कृत" (सु, सं, स्कृ, त)

const row12Words = [
  { start: 0, word: "इतिहास" },
  { start: 5, word: "राजवाडा" },
  { start: 10, word: "कल्याणकारी" },
  { start: 16, word: "देशभक्त" },
  { start: 21, word: "सुसंस्कृत" }
];

for (const rw of row12Words) {
  const g = getGraphemes(rw.word);
  for (let i = 0; i < g.length; i++) {
    g25[12][rw.start + i] = g[i];
  }
}

// In col 12: exactly 4 black blocks at 4, 9, 15, 20.
// Slot 1 (rows 0..3): "संविधान" (सं, वि, धा, न)
// Slot 2 (rows 5..8): "पत्रकार" (प, त्र, का, र)
// Slot 3 (rows 10..14): 5-letter word with index 12 having 'ण'!
// Let's find a 5-letter word where 3rd grapheme is 'ण':
// "नारायणराव" -> ना, रा, य, ण, रा, व (6)
// "कारणपरंपरा" (6)
// Let us search catalog for 5-letter word with 3rd grapheme 'ण':
// e.g. "कल्याणकारी" has 'ण' at index 2 (10, 11, 12)!
// Let's check!
console.log("3rd grapheme of कल्याणकारी:", getGraphemes("कल्याणकारी")[2]);
