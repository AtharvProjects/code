import { INTERLOCKING_MASKS_13X13, extractSlotsFromMask, buildWordCatalog, WordEntry, GridSlot, solveGridSlotsFast } from "../services/dynamicCrosswordSolver";
import { checkGridStrict } from "./solve_clean_25x25_seamless";

const catalog = buildWordCatalog();
const m13 = INTERLOCKING_MASKS_13X13[0];
const q1_mask = m13.map(row => row.split("").reverse().join(""));
const q2_mask = [...m13].reverse();
const q3_mask = [...m13].reverse().map(row => row.split("").reverse().join(""));

function solveGridWithFixed(mask: string[], fixed: { r: number; c: number; char: string }[], usedWords: Set<string>, seed: number = 1) {
  const N = mask.length;
  const slots = extractSlotsFromMask(mask);
  const matrix: (string | null)[][] = Array(N).fill(null).map(() => Array(N).fill(null));

  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (mask[r][c] === "#") matrix[r][c] = "#";
    }
  }
  for (const fc of fixed) {
    matrix[fc.r][fc.c] = fc.char;
  }

  const byLen = new Map<number, WordEntry[]>();
  const index = new Map<string, WordEntry[]>();
  const catalogMap = new Map<string, WordEntry>();

  for (const item of catalog) {
    catalogMap.set(item.word, item);
    if (!byLen.has(item.length)) byLen.set(item.length, []);
    byLen.get(item.length)!.push(item);

    for (let i = 0; i < item.length; i++) {
      const key = `${item.length}:${i}:${item.graphemes[i]}`;
      if (!index.has(key)) index.set(key, []);
      index.get(key)!.push(item);
    }
  }

  function getCandidates(slot: GridSlot): WordEntry[] {
    let constrained: { pos: number; char: string }[] = [];
    for (let i = 0; i < slot.len; i++) {
      const char = matrix[slot.cells[i].r][slot.cells[i].c];
      if (char) constrained.push({ pos: i, char });
    }

    if (constrained.length === 0) return byLen.get(slot.len) || [];

    let smallestList: WordEntry[] | null = null;
    for (const con of constrained) {
      const key = `${slot.len}:${con.pos}:${con.char}`;
      const list = index.get(key) || [];
      if (!smallestList || list.length < smallestList.length) smallestList = list;
    }

    if (!smallestList || smallestList.length === 0) return [];
    return smallestList.filter(item => {
      for (const con of constrained) {
        if (item.graphemes[con.pos] !== con.char) return false;
      }
      return true;
    });
  }

  const assignedWords = new Set<string>();
  let steps = 0;
  const MAX_STEPS = 30000;

  function backtrack(): boolean {
    steps++;
    if (steps > MAX_STEPS) return false;

    for (const s of slots) {
      if (s.cells.every(c => matrix[c.r][c.c] !== null)) {
        const formed = s.cells.map(c => matrix[c.r][c.c]!).join("");
        if (!catalogMap.has(formed)) return false;
      }
    }

    let bestSlot: GridSlot | null = null;
    let bestCandidates: WordEntry[] | null = null;
    let minCand = Infinity;

    for (const s of slots) {
      if (s.cells.every(c => matrix[c.r][c.c] !== null)) continue;
      const candidates = getCandidates(s).filter(w => !assignedWords.has(w.word) && !usedWords.has(w.word));
      if (candidates.length === 0) return false;

      if (candidates.length < minCand) {
        minCand = candidates.length;
        bestSlot = s;
        bestCandidates = candidates;
        if (minCand <= 1) break;
      }
    }

    if (!bestSlot || !bestCandidates) return true;

    for (const word of bestCandidates) {
      assignedWords.add(word.word);
      const prevCells: (string | null)[] = [];
      for (let i = 0; i < bestSlot.len; i++) {
        const cell = bestSlot.cells[i];
        prevCells.push(matrix[cell.r][cell.c]);
        matrix[cell.r][cell.c] = word.graphemes[i];
      }

      if (backtrack()) return true;

      assignedWords.delete(word.word);
      for (let i = 0; i < bestSlot.len; i++) {
        const cell = bestSlot.cells[i];
        matrix[cell.r][cell.c] = prevCells[i];
      }
    }

    return false;
  }

  if (backtrack()) {
    return {
      grid: matrix.map(r => r.map(c => c || "#")),
      placedWords: Array.from(assignedWords)
    };
  }
  return null;
}

console.log("Searching unified 4-quadrant solution...");

for (let seed0 = 1; seed0 <= 20; seed0++) {
  const sol0 = solveGridSlotsFast(extractSlotsFromMask(m13), 13, catalog, new Set(), seed0);
  if (!sol0) continue;

  const used = new Set(sol0.placedWords.map(p => p.entry.word));

  // Try solving Q1:
  const fixedCol0_Q1: { r: number; c: number; char: string }[] = [];
  for (let r = 0; r < 13; r++) {
    if (sol0.grid[r][12] !== "#") {
      fixedCol0_Q1.push({ r, c: 0, char: sol0.grid[r][12] });
    }
  }

  let sol1 = null;
  for (let s1 = 1; s1 <= 5; s1++) {
    sol1 = solveGridWithFixed(q1_mask, fixedCol0_Q1, used, s1 * 11);
    if (sol1) break;
  }
  if (!sol1) continue;
  console.log(`Seed0=${seed0}: Q1 solved!`);

  sol1.placedWords.forEach(w => used.add(w));

  // Try solving Q2:
  const fixedRow0_Q2: { r: number; c: number; char: string }[] = [];
  for (let c = 0; c < 13; c++) {
    if (sol0.grid[12][c] !== "#") {
      fixedRow0_Q2.push({ r: 0, c, char: sol0.grid[12][c] });
    }
  }

  let sol2 = null;
  for (let s2 = 1; s2 <= 5; s2++) {
    sol2 = solveGridWithFixed(q2_mask, fixedRow0_Q2, used, s2 * 17);
    if (sol2) break;
  }
  if (!sol2) continue;
  console.log(`Seed0=${seed0}: Q2 solved!`);

  sol2.placedWords.forEach(w => used.add(w));

  // Try solving Q3:
  const fixed_Q3: { r: number; c: number; char: string }[] = [];
  for (let c = 0; c < 13; c++) {
    if (sol1.grid[12][c] !== "#") {
      fixed_Q3.push({ r: 0, c, char: sol1.grid[12][c] });
    }
  }
  for (let r = 1; r < 13; r++) {
    if (sol2.grid[r][12] !== "#") {
      fixed_Q3.push({ r, c: 0, char: sol2.grid[r][12] });
    }
  }

  let sol3 = null;
  for (let s3 = 1; s3 <= 5; s3++) {
    sol3 = solveGridWithFixed(q3_mask, fixed_Q3, used, s3 * 23);
    if (sol3) break;
  }
  if (!sol3) continue;
  console.log(`SUCCESS! All 4 quadrants solved with seed0=${seed0}!`);

  // Assemble full 25x25
  const fullGrid: string[][] = Array(25).fill(null).map(() => Array(25).fill("#"));
  for (let r = 0; r < 13; r++) {
    for (let c = 0; c < 13; c++) {
      fullGrid[r][c] = sol0.grid[r][c];
      fullGrid[r][c + 12] = sol1.grid[r][c];
      fullGrid[r + 12][c] = sol2.grid[r][c];
      fullGrid[r + 12][c + 12] = sol3.grid[r][c];
    }
  }

  const chk = checkGrid(fullGrid);
  console.log("Full grid check:", chk);
  break;
}
