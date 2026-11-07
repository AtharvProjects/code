import { MARATHI_DICTIONARY, isAuthenticMarathiWord, getMarathiWordClue, sanitizeClue } from '../services/marathiDictionary';
import { validateGridAgainstLexicon } from '../services/geminiService';
import { MasterGridPuzzle } from '../services/puzzleBank';

// Design pristine 5x5 grids
const P5_VARIANTS: { id: string; title: string; theme: string; grid: string[][] }[] = [
    {
        id: "p5_1",
        title: "शब्दवेध ५x५ (अस्सल शब्द संच १)",
        theme: "दैनंदिन जीवन व निसर्ग",
        grid: [
            ["सा", "ग", "र", "#", "घ"],
            ["र", "#", "म", "न", "र"],
            ["स", "म", "ज", "#", "स"],
            ["#", "द", "#", "व", "न"],
            ["क", "द", "म", "#", "म"]
        ]
    },
    {
        id: "p5_2",
        title: "शब्दवेध ५x५ (अस्सल शब्द संच २)",
        theme: "साहित्य व ज्ञान",
        grid: [
            ["का", "व्य", "#", "सु", "र"],
            ["न", "#", "ना", "द", "#"],
            ["#", "सा", "द", "#", "ग"],
            ["क", "म", "ळ", "#", "ज"],
            ["र", "#", "म", "द", "त"]
        ]
    }
];

// Let's test and build automated search / verifier for all sizes
console.log("Testing grid design...");
