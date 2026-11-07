import { extractSlotsFromMask } from "../services/dynamicCrosswordSolver";

// Helper to get connected components
export function getConnectedComponents(slots: any[]) {
    const cellToSlots = new Map<string, number[]>();
    slots.forEach((s, sIdx) => {
        s.cells.forEach((c: any) => {
            const key = `${c.r},${c.c}`;
            if (!cellToSlots.has(key)) cellToSlots.set(key, []);
            cellToSlots.get(key)!.push(sIdx);
        });
    });

    const adj = Array(slots.length).fill(null).map(() => [] as number[]);
    for (const list of cellToSlots.values()) {
        for (let i = 0; i < list.length; i++) {
            for (let j = i + 1; j < list.length; j++) {
                adj[list[i]].push(list[j]);
                adj[list[j]].push(list[i]);
            }
        }
    }

    const visited = new Set<number>();
    const components: any[][] = [];

    for (let i = 0; i < slots.length; i++) {
        if (visited.has(i)) continue;
        const comp: any[] = [];
        const queue = [i];
        visited.add(i);

        while (queue.length > 0) {
            const curr = queue.shift()!;
            comp.push(slots[curr]);
            for (const neighbor of adj[curr]) {
                if (!visited.has(neighbor)) {
                    visited.add(neighbor);
                    queue.push(neighbor);
                }
            }
        }
        components.push(comp);
    }

    return components;
}

console.log("Component analyzer ready.");
