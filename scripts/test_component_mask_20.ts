import { extractSlotsFromMask } from "../services/dynamicCrosswordSolver";
import { getConnectedComponents } from "./test_components_20";

// Let us test designing a 20x20 mask with components <= 35 slots:
// How can a 20x20 mask have 4 components of 35 slots?
// If Q0 (0..9, 0..9) is Component 0 (size ~30 slots)
// Q1 (0..9, 10..19) is Component 1 (size ~30 slots)
// Q2 (10..19, 0..9) is Component 2 (size ~30 slots)
// Q3 (10..19, 10..19) is Component 3 (size ~30 slots)

// When are they separate components?
// Remember:
// No across slot spans cols 9 and 10!
// No down slot spans rows 9 and 10!
// How can no across slot span cols 9 and 10?
// By having '#' at col 9 OR col 10 in every row r!
// Wait! If in row r:
// In row 0: cell (0, 9) is '#'
// In row 1: cell (1, 10) is '#'
// In row 2: cell (2, 9) is '#'
// In row 3: cell (3, 10) is '#'
// ...
// Then col 9 has 10 '#' and col 10 has 10 '#'!
// BUT THE USER SAID:
// "त्या बाबतीती ४च काळे ब्लॉक यावेत"!
// Col 9 should have ONLY 4 black blocks!
// Col 10 should have ONLY 4 black blocks!

console.log("Analyzing constraint...");
