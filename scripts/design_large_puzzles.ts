import { buildWordCatalog, extractSlotsFromMask, solveGridSlotsFast } from "./services/dynamicCrosswordSolver";
import { isMaskValidNoSingles, validateGridCompletely } from "./scripts/solveAllSizesPerfect";

const catalog = buildWordCatalog();

// Let us write a helper to check mask validity:
export function checkMaskPristine(mask: string[]): { valid: boolean; badSlots: any[]; rowBlacks: number[]; colBlacks: number[] } {
    const N = mask.length;
    const slots = extractSlotsFromMask(mask);
    const badSlots = slots.filter(s => s.len < 2 || s.len > 5);
    const rowBlacks = mask.map(r => (r.match(/#/g) || []).length);
    const colBlacks: number[] = [];
    for (let c = 0; c < N; c++) {
        let b = 0;
        for (let r = 0; r < N; r++) if (mask[r][c] === '#') b++;
        colBlacks.push(b);
    }
    return {
        valid: badSlots.length === 0,
        badSlots,
        rowBlacks,
        colBlacks
    };
}

console.log("Mask checker ready.");
