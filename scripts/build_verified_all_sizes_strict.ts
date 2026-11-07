import fs from 'fs';
import { ALL_USER_1000_WORDS } from '../services/userLexicon1000';
import { MARATHI_DICTIONARY } from '../services/marathiDictionary';
import { MasterGridPuzzle, GridCell } from '../types';
import { extractPlacedWordsFromGrid, getGraphemes } from '../services/crosswordService';

const validWordsSet = new Set([...ALL_USER_1000_WORDS, ...Object.keys(MARATHI_DICTIONARY)]);

console.log("Valid words in lexicon:", validWordsSet.size);
