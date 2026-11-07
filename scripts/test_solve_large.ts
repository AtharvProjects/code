import { buildWordCatalog, extractSlotsFromMask, solveGridSlotsFast } from "./services/dynamicCrosswordSolver";
import { isMaskValidNoSingles, validateGridCompletely } from "./scripts/solveAllSizesPerfect";

const catalog = buildWordCatalog();

// Let us write a helper that tests candidate masks
// A candidate mask of size N:
// 1. mask has N rows of length N
// 2. No full black row or col
// 3. For 20x20: row 9, 10 have 4 blacks each, col 9, 10 have 4 blacks each
// 4. For 25x25: row 12 has 4 blacks, col 12 has 4 blacks
// 5. Max slot len <= 5, min slot len >= 2
// 6. Every cell has at least one direction >= 2

export function checkMaskProperties(mask: string[], size: number) {
  const N = size;
  if (mask.length !== N) return { ok: false, reason: "Wrong size" };
  for (let r = 0; r < N; r++) {
    const b = (mask[r].match(/#/g) || []).length;
    if (b === N) return { ok: false, reason: `Row ${r} all black` };
    if (size === 20 && (r === 9 || r === 10) && b !== 4) return { ok: false, reason: `Row ${r} has ${b} blacks (expected 4)` };
    if (size === 25 && r === 12 && b !== 4) return { ok: false, reason: `Row ${r} has ${b} blacks (expected 4)` };
  }
  for (let c = 0; c < N; c++) {
    let b = 0;
    for (let r = 0; r < N; r++) if (mask[r][c] === "#") b++;
    if (b === N) return { ok: false, reason: `Col ${c} all black` };
    if (size === 20 && (c === 9 || c === 10) && b !== 4) return { ok: false, reason: `Col ${c} has ${b} blacks (expected 4)` };
    if (size === 25 && c === 12 && b !== 4) return { ok: false, reason: `Col ${c} has ${b} blacks (expected 4)` };
  }

  // Check slots
  const slots = extractSlotsFromMask(mask);
  for (const s of slots) {
    if (s.len > 5) return { ok: false, reason: `Slot len ${s.len} > 5` };
    if (s.len < 2) return { ok: false, reason: `Slot len ${s.len} < 2` };
  }

  // Check isolated cells
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (mask[r][c] === "0") {
        const h = (c > 0 && mask[r][c - 1] === "0") || (c < N - 1 && mask[r][c + 1] === "0");
        const v = (r > 0 && mask[r - 1][c] === "0") || (r < N - 1 && mask[r + 1][c] === "0");
        if (!h && !v) return { ok: false, reason: `Cell (${r},${c}) isolated` };
      }
    }
  }

  return { ok: true, slotsCount: slots.length };
}

console.log("checkMaskProperties loaded.");
