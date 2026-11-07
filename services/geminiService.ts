import { WordClue, GridCell, PuzzleData, ClueStyle, Clues } from '../types';
import { getVerifiedPuzzle, getFreshVerifiedPuzzle, getThemedFreshPuzzle } from './puzzleBank';
import { getMarathiWordClue, isAuthenticMarathiWord, getCorrectedOrthographyWord, FORBIDDEN_AWKWARD_WORDS, sanitizeClue, generateSmartMarathiClue, MARATHI_DICTIONARY, SMART_WORD_CLUES, isGenericClue } from './marathiDictionary';
import { getSavedCustomWordBank, isStrictCustomWordsMode } from './customLexiconService';
import { batchSaveWordsToInfiniteLexicon, saveWordToInfiniteLexicon } from './infiniteLexiconService';
import { validateConsecutiveBlackBlocks } from './crosswordService';
import { getStyledClue, transformCluesStyle } from './clueStylingService';

export { sanitizeClue };

/**
 * Exponential backoff retry handler for Gemini API calls.
 * Gracefully handles 429 (Resource Exhausted) and 503 errors.
 */
async function callGeminiWithRetry<T>(fn: () => Promise<T>, maxRetries = 3, initialDelayMs = 1200): Promise<T> {
  let lastError: any;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      const status = err?.status || err?.statusCode || err?.code;
      const message = err?.message || String(err);
      const isRateLimit = status === 429 || status === 503 || message.includes('RESOURCE_EXHAUSTED') || message.includes('429');

      if (isRateLimit && attempt < maxRetries - 1) {
        const delay = initialDelayMs * Math.pow(2, attempt) + Math.random() * 400;
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

export interface GridValidationResult {
  isValid: boolean;
  acrossWords: string[];
  downWords: string[];
  invalidWords: string[];
  error?: string;
}

/**
 * Validates a 2D crossword grid against the authentic Marathi dictionary lexicon.
 * Ensures:
 * 1. All across segments of length >= 2 are valid, meaningful Marathi words.
 * 2. All down segments of length >= 2 are valid, meaningful Marathi words.
 * 3. Both across words AND down words are present (downWords.length > 0).
 * 4. Zero meaningless or gibberish words exist.
 */
export function validateGridAgainstLexicon(grid: string[][]): GridValidationResult {
  const size = grid.length;
  const acrossWords: string[] = [];
  const downWords: string[] = [];
  const invalidWords: string[] = [];

  // 1. Check all Across (horizontal) segments
  for (let r = 0; r < size; r++) {
    let cur: string[] = [];
    for (let c = 0; c < size; c++) {
      const cell = grid[r][c];
      if (cell && cell !== '#' && cell.trim() !== '') {
        cur.push(cell.trim());
      } else {
        if (cur.length >= 2) {
          const w = cur.join('');
          acrossWords.push(w);
          if (!isAuthenticMarathiWord(w) || FORBIDDEN_AWKWARD_WORDS.has(w)) {
            invalidWords.push(w);
          }
        }
        cur = [];
      }
    }
    if (cur.length >= 2) {
      const w = cur.join('');
      acrossWords.push(w);
      if (!isAuthenticMarathiWord(w) || FORBIDDEN_AWKWARD_WORDS.has(w)) {
        invalidWords.push(w);
      }
    }
  }

  // 2. Check all Down (vertical) segments
  for (let c = 0; c < size; c++) {
    let cur: string[] = [];
    for (let r = 0; r < size; r++) {
      const cell = grid[r][c];
      if (cell && cell !== '#' && cell.trim() !== '') {
        cur.push(cell.trim());
      } else {
        if (cur.length >= 2) {
          const w = cur.join('');
          downWords.push(w);
          if (!isAuthenticMarathiWord(w) || FORBIDDEN_AWKWARD_WORDS.has(w)) {
            invalidWords.push(w);
          }
        }
        cur = [];
      }
    }
    if (cur.length >= 2) {
      const w = cur.join('');
      downWords.push(w);
      if (!isAuthenticMarathiWord(w) || FORBIDDEN_AWKWARD_WORDS.has(w)) {
        invalidWords.push(w);
      }
    }
  }

  let isValid = true;
  let error: string | undefined;

  // Check strict rule: No duplicate words across and down (उभा व आडवा एकच शब्द नको, उदा. आडवा 'कुंतल' व उभा 'वतन' असे वेगवेगळे शब्द असावेत)
  const allWords = [...acrossWords, ...downWords];
  const seenWords = new Set<string>();
  const duplicateWords: string[] = [];
  for (const w of allWords) {
    if (seenWords.has(w)) {
      if (!duplicateWords.includes(w)) duplicateWords.push(w);
    }
    seenWords.add(w);
  }

  // Check strict rule: No orthography / diacritic distortion (e.g. 'वीलास' instead of 'विलास')
  const corruptedWords: { original: string; corrected: string }[] = [];
  for (const w of allWords) {
    const corrected = getCorrectedOrthographyWord(w);
    if (corrected) {
      corruptedWords.push({ original: w, corrected });
    }
  }

  // Check black square ratio: capped at max 28%
  let blackCount = 0;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const cell = grid[r][c];
      if (!cell || cell === '#' || cell.trim() === '' || cell.toLowerCase() === 'black') {
        blackCount++;
      }
    }
  }
  const blackPct = Math.round((blackCount / (size * size)) * 100);

  // Check structural rule: "एक सलग तीनपेक्षा जास्त काळे ब्लॉक नको (उभे / आडवे)"
  const blackValidation = validateConsecutiveBlackBlocks(grid);
  if (!blackValidation.isValid) {
    isValid = false;
    error = blackValidation.errorMessage;
  } else if (downWords.length === 0) {
    isValid = false;
    error = "उभे शब्द (Down words) तयार झालेले नाहीत.";
  } else if (acrossWords.length === 0) {
    isValid = false;
    error = "आडवे शब्द (Across words) तयार झालेले नाहीत.";
  } else if (duplicateWords.length > 0) {
    isValid = false;
    error = `उभा व आडवा एकच शब्द अथवा समान शब्दांची पुनरावृत्ती आढळली: ${duplicateWords.join(', ')} (नियम: उभा व आडवा वेगवेगळे शब्द असावेत; उदा. आडवा 'कुंतल' व उभा 'वतन').`;
  } else if (corruptedWords.length > 0) {
    isValid = false;
    const details = corruptedWords.map(cw => `'${cw.original}' (योग्य व्याकरणाने: '${cw.corrected}')`).join(', ');
    error = `मराठी व्याकरण नियम उल्लंघन: शब्दकोड्यात अशुद्ध वेलांटी/उकार असलेला शब्द आढळला: ${details}. (उदा. शब्द बसवण्यासाठी 'विलास' ऐवजी 'वीलास' लिहू नये). व्याकरणाचे नियम कटाक्षाने पाळावेत.`;
  } else if (invalidWords.length > 0) {
    isValid = false;
    error = `कोड्यामध्ये अपूर्ण किंवा ओढून-ताणून बसवलेले शब्द आढळले: ${invalidWords.join(', ')} (कायमस्वरूपी नियम: अपूर्ण रूप नको, उदा. 'नकट' ऐवजी 'नकटा' असा पूर्ण अर्थपूर्ण शब्दच वापरावा).`;
  } else if (blackPct > 25) {
    isValid = false;
    error = `काळे चौकोन प्रमाण खूप जास्त आहे: ${blackPct}% (नियम: काळे चौकोन २५% पेक्षा जास्त नसावेत).`;
  }

  return {
    isValid,
    acrossWords,
    downWords,
    invalidWords,
    error
  };
}

export interface AIDenseCrosswordResult {
  grid: string[][];
  clues: { word: string; clue: string }[];
  acrossWords?: string[];
  downWords?: string[];
  validation?: GridValidationResult;
  title?: string;
  theme?: string;
  attemptNumber?: number;
  clueStyle?: ClueStyle;
}

const CLUE_STYLE_PROMPT_GUIDES: Record<ClueStyle, string> = {
  cryptic: `【क्रॉसवर्ड स्टाइलिंग: कोडी / सांकेतिक (Riddles & Cryptic Wordplay)】
नियम व मार्गदर्शन:
- थेट किंवा साधे शब्दार्थ अजिबात देऊ नका!
- प्रत्येक शब्दासाठी वृत्तपत्रातील 'शब्दवेध' सारखे कूट प्रश्न, शब्दांची चलाखी, गूढ संकेत आणि विचार करायला लावणारी रंजक कोडी (Riddles & Cryptic Hints) तयार करा.
उदाहरणे:
- शब्द 'आरसा' -> 'समोर येणाऱ्या प्रत्येकाचे खरे रूप दाखवणारा निर्जीव मित्र'
- शब्द 'कमळ' -> 'चिखलात जन्मून देवाच्या पूजेत शोभणारे पवित्र राष्ट्रीय जलपुष्प'
- शब्द 'स्वप्न' -> 'डोळे मिटल्यावर रंगणारे आणि जागे होताच हवेत विरणारे चित्र'
- शब्द 'काजवा' -> 'अंधाऱ्या रात्री स्वतःच्या प्रकाशाने चमकणारा छोटा कीटक'
- शब्द 'दिवा' -> 'स्वतः जळून दुसऱ्यांच्या घराचा अंधार दूर करणारी वात'
- शब्द 'पाऊस' -> 'काळ्या ढगांतून मातीचा सुगंध दरवळवत बरसणारे अमृत'`,

  direct: `【क्रॉसवर्ड स्टाइलिंग: थेट अर्थ (Direct Meaning & Definitions)】
नियम व मार्गदर्शन:
- स्पष्ट, सोपे आणि वस्तुनिष्ठ शब्दार्थ किंवा प्रचलित समानार्थी शब्द द्या. नवशिक्यांसाठी व विद्यार्थ्यांसाठी थेट उत्तर शोधण्यास सोपे पडेल अशा सरळ व्याख्या द्या.
उदाहरणे:
- शब्द 'आरसा' -> 'स्वतःचे प्रतिबिंब पाहण्याचे साधन; दर्पण, काच'
- शब्द 'कमळ' -> 'पाण्यात उगवणारे भारताचे राष्ट्रीय फूल; पंकज, सरोज'
- शब्द 'सूर्य' -> 'सूर्योदयाचा तारा; भास्कर, दिनकर'`,

  proverbs: `【क्रॉसवर्ड स्टाइलिंग: म्हणी व वाक्प्रचार (Proverbs, Idioms & Literature)】
नियम व मार्गदर्शन:
- मराठी म्हणी, वाक्प्रचार, सुभाषिते व लोकगीतांमधील गाळलेले शब्द किंवा संदर्भ म्हणून सूचना द्या.
उदाहरणे:
- शब्द 'आरसा' -> 'म्हण: हाताच्या कंकणाला ... कशाला?'
- शब्द 'गाढव' -> 'म्हण: ... पुढे वाचली गीता, कालचा गोंधळ बरा होता'
- शब्द 'उंट' -> 'म्हण: ... वरून शेळ्या हाकणे'
- शब्द 'हात' -> 'म्हण: नाकापेक्षा ... जड किंवा वाक्प्रचार: संकटात मदतीचा ... देणे'`,

  mixed: `【क्रॉसवर्ड स्टाइलिंग: मिश्र / वृत्तपत्र शैली (Balanced Master Crossword)】
नियम व मार्गदर्शन:
- लोकसत्ता व सकाळ वृत्तपत्राच्या 'शब्दवेध' प्रमाणे संतुलित शैली वापरा: सुमारे ४०% रंजक कोडी, ३०% म्हणी/वाक्प्रचार आणि ३०% चतुर शब्दार्थ. खेळाडूला वैविध्यपूर्ण आणि दर्जेदार अनुभव मिळायला हवा.`
};

export async function generateDenseCrosswordAI(
  gridSize: number = 10,
  blackSquarePercentage: number = 15,
  puzzleLevel: 'सोपे' | 'माध्यम' | 'कठीण' = 'सोपे',
  attemptNumber: number = 1,
  usedWords: Set<string> = new Set(),
  themeId: string = 'auto',
  excludeMaskSignature?: string
): Promise<AIDenseCrosswordResult> {
  // 1. Fetch and validate candidate grids with guaranteed fresh words and changing masks
  // Works uniformly for all verified puzzle banks (5x5, 6x6, 7x7, 8x8, 9x9, 10x10, 12x12, 15x15)
  let chosenMaster = getThemedFreshPuzzle(themeId, usedWords, attemptNumber, gridSize, excludeMaskSignature, blackSquarePercentage);
  if (chosenMaster.grid.length !== gridSize || chosenMaster.gridSize !== gridSize) {
    chosenMaster = getFreshVerifiedPuzzle(usedWords, gridSize, attemptNumber, excludeMaskSignature, blackSquarePercentage);
  }
  let validation = validateGridAgainstLexicon(chosenMaster.grid);

  // If not valid or missing down words, search through available master templates for this size
  if (!validation.isValid || validation.downWords.length === 0 || chosenMaster.grid.length !== gridSize) {
    for (let themeIdx = 0; themeIdx < 5; themeIdx++) {
      const candidate = getVerifiedPuzzle(gridSize, themeIdx);
      if (candidate.grid.length === gridSize) {
        const val = validateGridAgainstLexicon(candidate.grid);
        if (val.isValid && val.downWords.length > 0) {
          chosenMaster = candidate;
          validation = val;
          break;
        }
      }
    }
  }

  // If still not valid, fallback to guaranteed verified master puzzle for this size
  if (!validation.isValid || validation.downWords.length === 0 || chosenMaster.grid.length !== gridSize) {
    const fallback = getVerifiedPuzzle(gridSize, 0);
    const val = validateGridAgainstLexicon(fallback.grid);
    if (val.isValid && val.downWords.length > 0 && fallback.grid.length === gridSize) {
      chosenMaster = fallback;
      validation = val;
    }
  }

  // Grid validation completed

  const difficultyGuide = {
    'सोपे': 'सोपे, सुगम व प्रचलित मराठी शब्द.',
    'माध्यम': 'सामान्य तसेच समृद्ध शब्दसंग्रह. थोडा विचार करायला लावणारा रंजक व सांस्कृतिक संदर्भ.',
    'कठीण': 'साहित्यिक, ऐतिहासिक, गूढ किंवा आव्हानात्मक शब्दसंग्रह. कल्पक व चतुर भाषिक रचना.'
  };

  // 2. Gather all verified words from both Across and Down directions
  const allGridWords = Array.from(new Set([...validation.acrossWords, ...validation.downWords]));
  
  // Base clue dictionary for all words in the grid using simple, authentic dictionary clues
  const baseClueMap = new Map<string, string>();
  for (const c of chosenMaster.clues) {
    if (c.word && c.clue) {
      baseClueMap.set(c.word.trim(), sanitizeClue(c.word.trim(), c.clue.trim()));
    }
  }

  // Overlay user's custom word bank clues if available
  const customWordBank = getSavedCustomWordBank();
  for (const item of customWordBank) {
    if (item.word && item.clue) {
      baseClueMap.set(item.word.trim(), sanitizeClue(item.word.trim(), item.clue.trim()));
    }
  }

  for (const w of allGridWords) {
    if (!baseClueMap.has(w)) {
      baseClueMap.set(w, getMarathiWordClue(w) || generateSmartMarathiClue(w));
    }
  }

  // 3. Call server API endpoint to personalize clues for BOTH across and down words
  try {
    const res = await fetch('/api/gemini/generate-dense-clues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        allGridWords,
        theme: chosenMaster.theme,
        description: chosenMaster.description,
        attemptNumber,
        puzzleLevel,
      }),
    });

    if (!res.ok) {
      throw new Error(`Server returned ${res.status}`);
    }

    const parsed = await res.json();

    const aiClueMap = new Map<string, string>();
    if (parsed && Array.isArray(parsed.clues)) {
      for (const item of parsed.clues) {
        if (item.word && item.clue) {
          const w = item.word.trim();
          aiClueMap.set(w, sanitizeClue(w, item.clue.trim()));
        }
      }
    }

    // Merge AI clues with authentic dictionary clues for all grid words
    const finalClues = allGridWords.map(w => {
      const raw = aiClueMap.get(w) || baseClueMap.get(w) || getMarathiWordClue(w) || generateSmartMarathiClue(w);
      return {
        word: w,
        clue: sanitizeClue(w, raw)
      };
    });

    return {
      grid: chosenMaster.grid,
      clues: finalClues,
      acrossWords: validation.acrossWords,
      downWords: validation.downWords,
      validation,
      title: chosenMaster.title,
      theme: chosenMaster.theme,
      attemptNumber,
    };
  } catch (_error) {
    const finalClues = allGridWords.map(w => {
      const raw = baseClueMap.get(w) || getMarathiWordClue(w) || generateSmartMarathiClue(w);
      return {
        word: w,
        clue: sanitizeClue(w, raw)
      };
    });

    return {
      grid: chosenMaster.grid,
      clues: finalClues,
      acrossWords: validation.acrossWords,
      downWords: validation.downWords,
      validation,
      title: chosenMaster.title,
      theme: chosenMaster.theme,
      attemptNumber,
    };
  }
}

/**
 * Regenerates all clues for an active puzzle into a new target ClueStyle without touching the grid layout.
 */
export async function regenerateCluesForPuzzleWithStyle(
  puzzle: PuzzleData,
  newStyle: ClueStyle,
  puzzleLevel: 'सोपे' | 'माध्यम' | 'कठीण' = 'सोपे'
): Promise<Clues> {
  const allWords = new Set<string>();
  puzzle.clues.across.forEach(c => { if (c.word) allWords.add(c.word.trim()); });
  puzzle.clues.down.forEach(c => { if (c.word) allWords.add(c.word.trim()); });

  const wordList = Array.from(allWords);
  if (wordList.length === 0) {
    return puzzle.clues;
  }

  try {
    const styleInstructions = CLUE_STYLE_PROMPT_GUIDES[newStyle] || CLUE_STYLE_PROMPT_GUIDES.cryptic;

    const res = await fetch('/api/gemini/restyle-clues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        wordList,
        styleInstructions,
        puzzleLevel,
      }),
    });

    if (!res.ok) {
      throw new Error(`Server returned ${res.status}`);
    }

    const parsed = await res.json();
    const aiClueMap = new Map<string, string>();
    if (parsed && Array.isArray(parsed.clues)) {
      for (const item of parsed.clues) {
        if (item.word && item.clue) {
          aiClueMap.set(item.word.trim(), item.clue.trim());
        }
      }
    }

    return transformCluesStyle(puzzle.clues, newStyle, aiClueMap);
  } catch (_err) {
    return transformCluesStyle(puzzle.clues, newStyle);
  }
}


export async function generateWordCluesFromAI(
  gridSize: number,
  blackSquarePercentage: number,
  examplePuzzle: PuzzleData | null,
  puzzleLevel: 'सोपे' | 'माध्यम' | 'कठीण'
): Promise<WordClue[]> {
  try {
    const anchorWordLength = gridSize > 10 ? '4 ते 6 अक्षरे (उदा. आकाशगंगा, इंद्रधनुष्य, जीवनप्रवास, ज्ञानसाधना, दिनदर्शिका, महाराष्ट्र, छत्रपती, स्वराज्य)' : '3 ते 5 अक्षरे';
    
    const difficultyInstructions = {
        'सोपे': 'Use very common, everyday Marathi words. Clues must be simple, direct, and straightforward. Avoid obscure words or complex wordplay. The puzzle is for beginners.',
        'माध्यम': 'Use a mix of common words and some less common, more interesting vocabulary. Clues can be slightly more creative and require some thought, but should not be overly cryptic.',
        'कठीण': 'Use a diverse and challenging vocabulary, including literary words, technical terms, or rare words. Clues must be clever, cryptic, and may involve puns, metaphors, or require specialized knowledge. The puzzle is for experts.'
    };

    let examplePrompt = '';
    if (examplePuzzle) {
        const gridRepresentation = examplePuzzle.grid.map(row => 
            row.map(cell => cell.isBlack ? '#' : '_').join(' ')
        ).join('\n');

        examplePrompt = `
      **LEARNING FROM USER PREFERENCE (CRITICAL):**
      The user has provided an example of a puzzle grid they find well-designed. Your primary goal is to generate a word list that can be arranged into a new grid with a **very similar structure and aesthetic**. Pay close attention to the density, placement, and flow of black squares (#) in the example below. Your choice of word lengths and their potential for interconnection MUST be directly inspired by this example to match the user's preferred style.

      **User's Preferred Grid Example (${examplePuzzle.grid.length}x${examplePuzzle.grid.length}):**
      \`\`\`
      ${gridRepresentation}
      \`\`\`
      `;
    }

    const res = await fetch('/api/gemini/generate-word-clues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gridSize,
        blackSquarePercentage,
        examplePrompt,
        puzzleLevel,
        anchorWordLength,
        difficultyInstruction: difficultyInstructions[puzzleLevel],
      }),
    });

    if (!res.ok) {
      throw new Error(`Server returned ${res.status}`);
    }

    const parsed = await res.json();
    
    if (parsed && Array.isArray(parsed.wordClues) && parsed.wordClues.length > 0) {
        return parsed.wordClues as WordClue[];
    }
    throw new Error("AI कडून अवैध स्वरूपात प्रतिसाद मिळाला.");

  } catch (_error) {
    // 1. If we have verified clues from matching size
    const verified = getVerifiedPuzzle(gridSize, 0);
    if (verified && Array.isArray(verified.clues) && verified.clues.length > 0) {
        const matchingClues = verified.clues
            .filter(c => c.word.length <= gridSize)
            .map(c => ({
                word: c.word,
                clue: sanitizeClue(c.word, c.clue || getMarathiWordClue(c.word) || 'संकेतावरून ओळखा')
            }));
        if (matchingClues.length >= 10) {
            return matchingClues;
        }
    }

    // 2. Select authentic words suited for this grid size from MARATHI_DICTIONARY
    const eligibleWords = Object.entries(MARATHI_DICTIONARY)
        .filter(([w]) => !FORBIDDEN_AWKWARD_WORDS.has(w) && w.length >= 2 && w.length <= Math.min(gridSize, 8))
        .map(([w, clue]) => ({
            word: w,
            clue: sanitizeClue(w, clue)
        }));

    // Shuffle and pick ~25-35 words
    const shuffled = [...eligibleWords].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Math.min(40, Math.max(20, gridSize * 3)));
    
    if (selected.length > 0) {
        return selected;
    }

    return [
        { word: 'सागर', clue: 'समुद्र, अथांग जलनिधी' },
        { word: 'कमळ', clue: 'भारताचे राष्ट्रीय जलपुष्प' },
        { word: 'शिवार', clue: 'हिरवेगार शेत' },
        { word: 'किल्ला', clue: 'अभेद्य दुर्ग' },
        { word: 'पाऊस', clue: 'आकाशातून बरसणारे पाणी' },
        { word: 'सूर्य', clue: 'दिनकर, भास्कर' }
    ];
  }
}

export async function getCluesForWords(words: string[], forceAi: boolean = false): Promise<WordClue[]> {
    const cleanWords = Array.from(new Set(words.map(w => (w || '').trim()).filter(w => w.length >= 2)));
    if (cleanWords.length === 0) {
        return [];
    }

    const results: WordClue[] = [];
    const missingWords: string[] = [];

    // Filter clean words and check local dictionary if forceAi is false
    for (const cleanW of cleanWords) {
        if (!forceAi) {
            const dictClue = getMarathiWordClue(cleanW);
            if (dictClue && !isGenericClue(dictClue)) {
                results.push({ word: cleanW, clue: sanitizeClue(cleanW, dictClue) });
                continue;
            }
        }
        missingWords.push(cleanW);
    }

    if (missingWords.length === 0) {
        return results;
    }

    try {
        const res = await fetch('/api/gemini/get-clues-for-words', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ missingWords }),
        });

        if (!res.ok) {
            throw new Error(`Server returned ${res.status}`);
        }

        const parsed = await res.json();

        const clueList = parsed?.clues || parsed?.wordClues || (Array.isArray(parsed) ? parsed : []);

        if (Array.isArray(clueList)) {
            for (const item of clueList) {
                if (item.word && item.clue) {
                    const w = item.word.trim();
                    const sanitized = sanitizeClue(w, item.clue.trim());
                    if (sanitized && !isGenericClue(sanitized)) {
                        results.push({ word: w, clue: sanitized });
                    }
                }
            }
        }
    } catch (_error) {
        // Fallback below smoothly computes high-fidelity dictionary clues
    }

    // Fallback: Ensure ALL cleanWords get genuine, sanitized clues - NEVER empty!
    const coveredWords = new Set(results.map(r => r.word.trim()));
    for (const mw of cleanWords) {
        if (!coveredWords.has(mw)) {
            const dictClue = getMarathiWordClue(mw) || MARATHI_DICTIONARY[mw] || SMART_WORD_CLUES[mw] || generateSmartMarathiClue(mw);
            results.push({ word: mw, clue: sanitizeClue(mw, dictClue) });
            coveredWords.add(mw);
        }
    }

    // AUTO-LEARNING: Automatically and permanently save ALL generated/fetched word-clue pairs to infinite storage!
    batchSaveWordsToInfiniteLexicon(results, 'ai_auto_learning');

    return results;
}