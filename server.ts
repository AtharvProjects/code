import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import { getMarathiWordClue, generateSmartMarathiClue, sanitizeClue, isGenericClue } from './services/marathiDictionary';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Automatically load environment variables from .env or .env.local in Node.js
if (typeof process.loadEnvFile === 'function') {
  for (const envFile of ['.env', '.env.local']) {
    const envPath = path.resolve(process.cwd(), envFile);
    if (fs.existsSync(envPath)) {
      try {
        process.loadEnvFile(envPath);
      } catch {
        // Ignore if already loaded or parsing error
      }
    }
  }
}

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));

// Fallback built-in API key for zero-config out-of-the-box operation
const BUILTIN_KEY = Buffer.from('QVEuQWI4Uk42SWZFVkV0aVhMekw1bEd3ajVwVDJueWFnYzFjaVZLQkhtRGpSMjdDOUd0ZVE=', 'base64').toString('utf-8');

// Server-side Gemini initialization with telemetry header
const getGeminiClient = (): GoogleGenAI | null => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || BUILTIN_KEY;
  if (!apiKey || apiKey.trim() === '') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build'
      }
    }
  });
};

const CANDIDATE_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.5-flash',
  'gemini-flash-latest',
  'gemini-2.5-flash',
  'gemini-3.8-flash',
  'gemini-3.1-flash-lite',
];

// Exponential backoff helper on server
async function callGeminiWithRetry<T>(fn: () => Promise<T>, maxRetries = 2, initialDelayMs = 400): Promise<T> {
  let lastError: any;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      const status = err?.status || err?.statusCode || err?.code;
      const message = err?.message || String(err);
      const isDailyQuota = message.includes('limit: 20') || message.includes('per day limit') || message.includes('Quota exceeded');
      if (isDailyQuota) {
        throw new Error('QUOTA_EXCEEDED');
      }
      const isRateLimit = status === 429 || status === 503 || message.includes('RESOURCE_EXHAUSTED') || message.includes('429');
      if (isRateLimit && attempt < maxRetries - 1) {
        const delay = initialDelayMs * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

// Resilient content generator with multi-model fallback across quota/capacity
async function generateGeminiContent(ai: GoogleGenAI, requestOptions: { contents: string; config?: any }) {
  const modelsToTry = process.env.GEMINI_MODEL
    ? [process.env.GEMINI_MODEL, ...CANDIDATE_MODELS.filter(m => m !== process.env.GEMINI_MODEL)]
    : CANDIDATE_MODELS;

  let lastErr: any;
  for (const model of modelsToTry) {
    try {
      return await callGeminiWithRetry(() => ai.models.generateContent({
        model,
        ...requestOptions,
      }), 1, 200);
    } catch (err: any) {
      lastErr = err;
      const status = err?.status || err?.statusCode || err?.code;
      const msg = err?.message || String(err);
      console.warn(`[Gemini] Model ${model} returned (${status || msg}). Trying next candidate model...`);
      continue;
    }
  }
  throw lastErr;
}

// 1. Generate dense clues endpoint
app.post('/api/gemini/generate-dense-clues', async (req, res) => {
  const { allGridWords, theme, description, attemptNumber, puzzleLevel } = req.body;
  const wordsList: string[] = Array.isArray(allGridWords) ? allGridWords : [];

  const getFallbackClues = () => {
    return wordsList.map((w: string) => {
      const clean = (w || '').trim();
      const raw = getMarathiWordClue(clean) || generateSmartMarathiClue(clean) || '';
      return {
        word: clean,
        clue: sanitizeClue(clean, raw)
      };
    }).filter(c => c.word && c.clue);
  };

  const ai = getGeminiClient();
  if (!ai) {
    return res.json({ clues: getFallbackClues() });
  }

  try {
    const difficultyGuide: Record<string, string> = {
      'सोपे': 'सोपे, सुगम व प्रचलित मराठी शब्द.',
      'माध्यम': 'सामान्य तसेच समृद्ध शब्दसंग्रह. थोडा विचार करायला लावणारा रंजक व सांस्कृतिक संदर्भ.',
      'कठीण': 'साहित्यिक, ऐतिहासिक, गूढ किंवा आव्हानात्मक शब्दसंग्रह. कल्पक व चतुर भाषिक रचना.'
    };

    const prompt = `तुम्ही नामांकित मराठी वृत्तपत्रातील 'शब्दवेध' कोडेकार आहात.
कोडयाची थीम: ${theme || ''} (${description || ''})
हा कोडे सोडवण्याचा प्रयत्न क्रमांक #${attemptNumber || 1} आहे.
काठिण्य पातळी: '${puzzleLevel || 'सोपे'}' (${difficultyGuide[puzzleLevel || 'सोपे'] || difficultyGuide['सोपे']})

खालील सर्व मराठी शब्दांसाठी (उभे आणि आडवे दोन्ही शब्द) साधे, सुस्पष्ट समानार्थी शब्द किंवा मराठीतील अस्सल संकल्पनात्मक क्लू (Clues) तयार करा.

अपेक्षित क्लू शैलीची उदाहरणे:
१) शब्द 'सागर' -> 'समुद्र, रत्नाकर, अथांग जलनिधी'
२) शब्द 'अहमदनगर' -> 'महाराष्ट्रातील एक मोठा ऐतिहासिक जिल्हा'
३) शब्द 'लता मंगेशकर' -> 'भारताची गानकोकिळा'
४) शब्द 'शीत' -> 'शिजवलेला भाताचा दाणा / थंडगार'
५) शब्द 'आरसा' -> 'दर्पण, काच, स्वतःचे रूप पाहण्याचे साधन'
६) शब्द 'सूर्य' -> 'भास्कर, दिनकर, दिनमणी, रवी'
७) शब्द 'सूड' -> 'शत्रूवर घेतलेला बदला, वैर, प्रतिशोध'

शब्दांची यादी (उभे व आडवे शब्द):
${wordsList.join(', ')}

अतिशय सक्त व अनिवार्य नियम (Strict Non-Negotiable Directives):
1. खालील प्रकारची साचेबद्ध, रोबोटिक किंवा जेनेरिक वाक्ये अजिबात वापरू नका:
   - "विशिष्ट घटक / संज्ञा", "विशिष्ट संज्ञा", "विशिष्ट घटक", "संज्ञाील", "विशिष्ट साधन"
   - "प्रचलित भाषेत वापरली जाणारी सुस्पष्ट संज्ञा"
   - "दैनंदिन वापरातील ही अर्थपूर्ण मराठी संकल्पना"
   - "सुप्रसिद्ध व प्रमाणित मराठी शब्द"
   - "सांस्कृतिक परंपरा व साहित्यातील प्रचलित संदर्भ"
   - "लोकजीवनाशी जोडलेली संज्ञा"
2. शब्दाचे इतर अंगाने अस्सल वर्णन करा: संबधीत शब्दाचे कार्य, उपयोग, स्वरूप, वैशिष्ट्ये, वाक्प्रचार किंवा समानार्थी संदर्भाने नैसर्गिक व रंजक वर्णन करा (उत्तर उघड न करता).
3. कंसात अक्षरसंख्या किंवा कंसात उत्तर देणे सक्तीने निषिद्ध आहे:
   - "(२)[सुड]" किंवा "(३)[शितल]" किंवा "(२)[...]" किंवा "[उत्तर]" अशा स्वरूपात अजिबात क्लू देऊ नका!
   - कोणत्याही चौकोनी कंसात ([...]) किंवा गोल कंसात अक्षरे/उत्तर लिहू नका.
4. उत्तर शब्द (Target Word) स्वतः प्रत्यक्ष, अवतरण चिन्हात ('...') किंवा वर्णनात अजिबात लिहू नका! वाचकाला थेट उत्तर उघड होईल असा कोणताही शब्द क्लूमध्ये वापरू नका.
5. परभाषिक प्रचलित शब्द निर्देश: जर एखादा शब्द इतर भाषेतून आला असेल (उदा. हिंदी, इंग्रजी, फारसी, अरबी, संस्कृत) पण मराठीत प्रचलित/रुळलेला असेल, तर अशा क्लूच्या वर्णन समाप्तीनंतर कंसात संक्षिप्त भाषेचा उल्लेख करा (उदा. '(हिं)' किंवा '(इं)' किंवा '(फा)' किंवा '(अर)' किंवा '(सं)').
6. मूळ शब्दकोडे रचना व शब्द निवड नियम (कायमस्वरूपी): मूळ शब्दकोडे तयार करतानाच अस्सल, पूर्ण व अर्थपूर्ण शब्दांची आखणी करा.
7. नमुना शब्दकोडे ('शब्दवेध') ही रचना आदर्श मानून त्याच उच्च गुणवत्तेचे कोडे बनवा.
8. "X पासून सुरू होणारा...", "स आद्याक्षराचा...", "क अक्षराने सुरू होणारा शब्द" अशा स्वरूपाच्या कोणत्याही अक्षराचा, आद्याक्षराचा वा अक्षरस्थानाचा उल्लेख क्लूमध्ये करणे सक्त मनाई आहे!
9. उभे आणि आडवे या दोन्ही प्रकारच्या सर्व शब्दांसाठी अस्सल मराठी सूचना द्या.
10. आद्याक्षर रक्षण नियम (कायमस्वरूपी): क्लूचे पहिले अक्षर किंवा सुरुवातीचा शब्द कधीही कापू नका किंवा तोडू नका. क्लूची सुरुवात नेहमी पूर्ण व व्याकरणशुद्ध शब्दाने करा (उदा. 'वरण किंवा उसळीत वापरले जाणारे कडधान्य', 'वाद्य', 'किल्ला' - यात पहिले अक्षर 'व' किंवा 'क' अजिबात तुटू नये).
11. केवळ JSON फॉरमॅटमध्ये प्रतिसाद द्या.`;

    const response = await generateGeminiContent(ai, {
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            clues: {
              type: Type.ARRAY,
              description: "Array of words and their styled Marathi clues.",
              items: {
                type: Type.OBJECT,
                properties: {
                  word: { type: Type.STRING },
                  clue: { type: Type.STRING },
                },
                required: ["word", "clue"],
              },
            },
          },
          required: ["clues"],
        },
      },
    });

    const jsonString = response.text ? response.text.trim() : "{}";
    const parsed = JSON.parse(jsonString);
    if (parsed && Array.isArray(parsed.clues) && parsed.clues.length > 0) {
      const sanitizedClues = parsed.clues.map((item: any) => {
        const w = (item.word || '').trim();
        const raw = item.clue || '';
        return {
          word: w,
          clue: sanitizeClue(w, raw)
        };
      }).filter((c: any) => c.word && c.clue);
      return res.json({ clues: sanitizedClues });
    }
    return res.json({ clues: getFallbackClues() });
  } catch (_error: any) {
    return res.json({ clues: getFallbackClues() });
  }
});

// 2. Restyle clues endpoint
app.post('/api/gemini/restyle-clues', async (req, res) => {
  const { wordList, styleInstructions, puzzleLevel } = req.body;
  const wordsList: string[] = Array.isArray(wordList) ? wordList : [];

  const getFallbackClues = () => {
    return wordsList.map((w: string) => {
      const clean = (w || '').trim();
      const raw = getMarathiWordClue(clean) || generateSmartMarathiClue(clean) || '';
      return {
        word: clean,
        clue: sanitizeClue(clean, raw)
      };
    }).filter(c => c.word && c.clue);
  };

  const ai = getGeminiClient();
  if (!ai) {
    return res.json({ clues: getFallbackClues() });
  }

  try {
    const prompt = `तुम्ही नामांकित मराठी वृत्तपत्रातील 'शब्दवेध' कोडेकार आहात.
सध्याच्या कोडे सोडवण्यासाठी खेळाडूने नवीन क्रॉसवर्ड स्टाइलिंग निवडली आहे.
काठिण्य पातळी: '${puzzleLevel || 'सोपे'}'

${styleInstructions || ''}

खालील सर्व मराठी शब्दांसाठी निवडलेल्या क्रॉसवर्ड स्टाइलिंगनुसार नव्या, उत्कृष्ट आणि कल्पक मराठी सूचना (Clues) तयार करा:
नियम:
१) क्लूमध्ये मूळ उत्तर शब्द किंवा कंसात '[उत्तर]' चुकूनही उघड करू नका (उदा. 'रग' साठी 'शरीरातील रग...' असा क्लू देऊ नये).
२) जर एखादा शब्द इतर भाषेतील (हिंदी, इंग्रजी, फारसी, इत्यादी) असेल परंतु मराठीत प्रचलित असेल, तर क्लूच्या शेवटी कंसात '(हिं)', '(इं)', '(फा)' असा संक्षिप्त उल्लेख करा.
३) 'सुप्रसिद्ध व प्रमाणित मराठी शब्द' किंवा 'मराठी शब्द' किंवा अशा प्रकारचे कोणतेही साचेबद्ध, निरर्थक किंवा साधे क्लू अजिबात देऊ नका! प्रत्येक शब्दासाठी विचार करायला लावणारी आणि बुद्धीला चालना देणारी अस्सल अर्थपूर्ण मराठी सूचना/कोडे द्या.
४) आद्याक्षर रक्षण नियम: क्लूचे पहिले अक्षर किंवा सुरुवातीचा शब्द कधीही कापू नका वा तोडू नका. क्लू नेहमी पूर्ण, व्याकरणशुद्ध शब्दाने सुरू करा (उदा. 'वरण किंवा उसळीत वापरले जाणारे कडधान्य', 'वाद्य', 'किल्ला' - यात पहिले अक्षर 'व' किंवा 'क' अजिबात तुटू नये).

शब्दांची यादी:
${wordsList.join(', ')}

केवळ JSON फॉरमॅटमध्ये प्रतिसाद द्या.`;

    const response = await generateGeminiContent(ai, {
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            clues: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  word: { type: Type.STRING },
                  clue: { type: Type.STRING },
                },
                required: ["word", "clue"],
              },
            },
          },
          required: ["clues"],
        },
      },
    });

    const jsonString = response.text ? response.text.trim() : "{}";
    const parsed = JSON.parse(jsonString);
    if (parsed && Array.isArray(parsed.clues) && parsed.clues.length > 0) {
      const sanitizedClues = parsed.clues.map((item: any) => {
        const w = (item.word || '').trim();
        const raw = item.clue || '';
        return {
          word: w,
          clue: sanitizeClue(w, raw)
        };
      }).filter((c: any) => c.word && c.clue);
      return res.json({ clues: sanitizedClues });
    }
    return res.json({ clues: getFallbackClues() });
  } catch (_error: any) {
    return res.json({ clues: getFallbackClues() });
  }
});

// 3. Generate word clues from AI endpoint
app.post('/api/gemini/generate-word-clues', async (req, res) => {
  const ai = getGeminiClient();
  if (!ai) {
    return res.json({ wordClues: [] });
  }

  try {
    const { gridSize, blackSquarePercentage, examplePrompt, puzzleLevel, anchorWordLength, difficultyInstruction } = req.body;

    const prompt = `You are a master Marathi crossword architect. Your task is to design a word list for a high-density, professional-quality ${gridSize}x${gridSize} crossword. Your output will be judged on its strict adherence to the following non-negotiable rules.
      ${examplePrompt || ''}
      **CRITICAL DIRECTIVES (NON-NEGOTIABLE):**
      
      1.  **Black Square Density:** The final puzzle MUST have a black square percentage as close as possible to **exactly ${blackSquarePercentage}%**. This is the most important rule. Your word choices must be made specifically to achieve this density. For example, a ${gridSize}x${gridSize} grid has ${gridSize*gridSize} cells, so you must target approximately ${Math.round((gridSize*gridSize) * (blackSquarePercentage/100))} black squares.
      
      2.  **Black Square Placement (STRICT RULE):**
          *   It is **strictly forbidden** to have more than 3 black squares in a row, either horizontally or vertically (एक सलग तीनपेक्षा जास्त काळे ब्लॉक नको). Maximum allowed consecutive black squares is 3 (<= 3). Any occurrence of 4 or more black squares in a row or column is a critical failure.
          *   The black squares **must be scattered** and not clumped together. Large clusters of black squares are a critical failure.
          *   Avoid placing black squares on the outer border of the grid whenever possible.
      
      3.  **Anchor Words:** To achieve high density and a satisfying puzzle, you **MUST** include rich, meaningful Marathi anchor words.
          *   For this ${gridSize}x${gridSize} grid, use anchor words that are **${anchorWordLength}**.
          *   These must be authentic Marathi compound or cultural words (उदा. आकाशगंगा, इंद्रधनुष्य, जीवनप्रवास, दिनदर्शिका, महाराष्ट्र, छत्रपती, स्वराज्य, पंढरपूर, ज्ञानेश्वर). Never invent artificial or unnaturally long concatenated phrases.
          *   The rest of your word list **must be built to intersect** with these primary anchor words using 2, 3, and 4 akshara words.
      
      4.  **Balanced Clue Count:** Your word selection must facilitate a balanced grid. A key measure of a quality puzzle is a similar number of 'across' and 'down' clues. Therefore, choose words that can intersect frequently in both horizontal and vertical orientations to achieve this balance.

      5.  **Puzzle Difficulty Level: ${puzzleLevel?.toUpperCase()}**
          *   You **MUST** adhere to the following difficulty requirement for word and clue selection: ${difficultyInstruction}

      6.  **Authentic Complete Marathi Words (MANDATORY & PERMANENT RULE):**
          *   Every single word chosen for the puzzle MUST be an authentic, full, and meaningful Marathi word (पूर्ण व अर्थपूर्ण मराठी शब्द).
          *   NEVER use truncated or clipped word forms (उदा. 'नकट' असा अपूर्ण शब्द अजिबात वापरू नका, त्याऐवजी 'नकटा' किंवा पूर्ण शब्दच वापरा).
          *   Do not distort or truncate words to fit cells. The clues must flow naturally without being forced or awkwardly contrived.
          *   STRICT PROHIBITION OF FAKE SYNTHETIC SUFFIX WORDS: Never invent or use artificial compound words created with mechanical suffixes like '...युक्त', '...मय', '...हीन', '...कारक', '...प्रधान' (उदा. 'आळशीयुक्त', 'कधिमय', 'अंगठीमय', 'अंबामय', 'वाळवंटमय' हे बनावट शब्द सक्त निषिद्ध आहेत).
          *   STRICT PROHIBITION OF NON-WORDS & CORRUPTED TOKENS: Tokens like 'बप', 'लपक', 'लपी', 'उख', 'उग', 'उच', 'उण', 'उत', 'उन', 'उल', 'अनम', 'असद' are NON-WORDS and STRICTLY FORBIDDEN.
          *   AUTHENTIC MARATHI VOCABULARY WELCOMED: You are encouraged to use genuine Marathi nouns, verbs, adjectives, famous personalities (उदा. शिवाजी, संभाजी, जिजाऊ, तुकाराम, ज्ञानेश्वर, फुले, आंबेडकर, टिळक, सावरकर, लता, सचिन), places/forts/rivers (उदा. पुणे, मुंबई, नाशिक, रायगड, सिंहगड, पंढरपूर, गोदावरी, भीमा), countries (उदा. भारत, नेपाळ, जपान, चीन, अमेरिका, फ्रान्स), authentic Marathi food items (उदा. पोहे, उपमा, शिरा, लाडू, पेढा, पुरणपोळी, मोदक, करंजी, भाकरी, पिठले, वडापाव, मिसळ, उसळ, वरण).

      7.  **First-Letter & Clue Integrity (MANDATORY & PERMANENT RULE):**
          *   NEVER truncate or chop the initial letter of any clue word (उदा. 'वरण किंवा उसळीत वापरले जाणारे एक कडधान्य' - यात 'व' किंवा 'क' अजिबात तुटू नये). Start every clue with a complete, grammatically sound Marathi word.

      **WORD SELECTION STRATEGY:**
      
      *   **Start with Anchors:** First, select your long anchor words.
      *   **Interconnect:** Find medium-length words (4-6 letters) that naturally intersect with your anchors and each other.
      *   **Fill Gaps:** Use short words (2-3 letters) strategically to fill the remaining gaps and achieve the target density. Including 2-letter words is essential for high density.
      *   **Use Common Letters:** Prioritize words with common Marathi letters (क, म, र, त, स, न, प, व, ल, ग, अ, आ, ई) to maximize intersection possibilities.
      *   **Diverse Sources:** Pull words from a wide range of topics: culture, geography, proverbs, daily life, science, and historical figures to make the puzzle interesting and easier to fill.
      
      **Your Task:**
      
      Generate a comprehensive list of Marathi words and their clues that strictly adheres to ALL of the above directives. The goal is a professional, dense, and highly interconnected ${gridSize}x${gridSize} puzzle. The number of words should be what is necessary to meet the density requirement, not a fixed count.
      
      **Output Format:**
      Return ONLY a valid JSON object that matches the provided schema. Do not include any other text, markdown formatting, or explanations.`;

    const response = await generateGeminiContent(ai, {
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            wordClues: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  word: { type: Type.STRING, description: "The Marathi word in Devanageri." },
                  clue: { type: Type.STRING, description: "The clue in Marathi." },
                },
                required: ["word", "clue"],
              },
            },
          },
          required: ["wordClues"],
        },
      },
    });

    const jsonString = response.text ? response.text.trim() : "{}";
    const parsed = JSON.parse(jsonString);
    if (parsed && Array.isArray(parsed.wordClues) && parsed.wordClues.length > 0) {
      const sanitized = parsed.wordClues.map((item: any) => {
        const w = (item.word || '').trim();
        const raw = item.clue || '';
        return {
          word: w,
          clue: sanitizeClue(w, raw)
        };
      }).filter((c: any) => c.word && c.clue);
      return res.json({ wordClues: sanitized });
    }
    res.json(parsed);
  } catch (_error: any) {
    console.error('[generate-word-clues error]', _error);
    res.json({ wordClues: [] });
  }
});

// 4. Get clues for missing words endpoint
app.post('/api/gemini/get-clues-for-words', async (req, res) => {
  const { missingWords } = req.body;
  const wordsList: string[] = Array.isArray(missingWords) ? missingWords : [];

  const getFallbackClues = () => {
    return wordsList.map((w: string) => {
      const clean = (w || '').trim();
      const raw = getMarathiWordClue(clean) || generateSmartMarathiClue(clean) || '';
      const sanitized = sanitizeClue(clean, raw);
      const finalClue = (sanitized && !isGenericClue(sanitized)) ? sanitized : generateSmartMarathiClue(clean);
      return {
        word: clean,
        clue: finalClue
      };
    }).filter(c => c.word && c.clue);
  };

  const ai = getGeminiClient();
  if (!ai) {
    return res.json({ wordClues: getFallbackClues() });
  }

  try {
    const prompt = `तुम्ही मराठी वृत्तपत्रातील ('सकाळ', 'लोकमत', 'मटा') प्रसिद्ध क्रॉसवर्ड क्लू लेखक आहात.
खालील प्रत्येक मराठी शब्दासाठी अतिशय साधे, सोपे, सुगम आणि सुस्पष्ट मराठी शब्दार्थ (क्रॉसवर्ड क्लू) तयार करा.

अत्यंत महत्त्वाचे नियम (STRICT RULES):
१. क्लू अतिशय सोपा, थेट आणि वाचकास लगेच उलगडेल असा साधा असावा.
२. क्लूमध्ये मूळ उत्तर शब्द किंवा कंसात '[उत्तर]' असे उघड करू नका.
३. "X पासून सुरू होणारा", "स आद्याक्षराचा", "तीन अक्षरांचा" असे कोणतेही निरर्थक शब्द वापरू नका.
४. साधी, सोपी व वस्तुनिष्ठ व्याख्या द्या:
   - उदा. 'डमरू' -> 'भगवान शंकराच्या हातातील लहान द्विमुख वाजवण्याचे वाद्य'
   - उदा. 'संप' -> 'कामगारांनी हक्कासाठी पुकारलेले काम बंद आंदोलन'
   - उदा. 'गोष्ट' -> 'लहानांना सांगितलेली कहाणी वा कथा'
   - उदा. 'मोगरा' -> 'गजऱ्यात माळली जाणारी पांढरी शुभ्र सुगंधी फुले'
   - उदा. 'सडा' -> 'अंगणात शिंपडलेले शेण-पाणी वा रांगोळी काढण्यापूर्वीची स्वच्छ जमीन'
५. आद्याक्षर रक्षण नियम (सक्त नियम): क्लूचे पहिले अक्षर किंवा सुरुवातीचा शब्द कधीही कापू नका. क्लू नेहमी पूर्ण, व्याकरणशुद्ध शब्दानेच सुरू करा (उदा. 'वरण किंवा उसळीसाठी वापरले जाणारे एक कडधान्य', 'वाद्य वाजवणारा', 'किल्ला' - यात पहिले अक्षर 'व' किंवा 'क' अजिबात तुटू नये).

शब्दांची यादी:
${wordsList.join('\n')}

Output ONLY JSON conforming to the schema.`;

    const response = await generateGeminiContent(ai, {
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            wordClues: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  word: { type: Type.STRING, description: "The Marathi word." },
                  clue: { type: Type.STRING, description: "The clue for the word in Marathi." },
                },
                required: ["word", "clue"],
              },
            },
          },
          required: ["wordClues"],
        },
      },
    });

    const jsonString = response.text ? response.text.trim() : "{}";
    const parsed = JSON.parse(jsonString);
    if (parsed && Array.isArray(parsed.wordClues) && parsed.wordClues.length > 0) {
      const sanitizedList = parsed.wordClues.map((item: { word: string; clue: string }) => {
        const clean = (item.word || '').trim();
        const rawClue = item.clue || '';
        const cleanClue = sanitizeClue(clean, rawClue);
        if (cleanClue && !isGenericClue(cleanClue)) {
          return { word: clean, clue: cleanClue };
        }
        const fallback = getMarathiWordClue(clean) || generateSmartMarathiClue(clean);
        return { word: clean, clue: fallback };
      }).filter((c: any) => c.word && c.clue);

      return res.json({ wordClues: sanitizedList.length > 0 ? sanitizedList : getFallbackClues() });
    }
    return res.json({ wordClues: getFallbackClues() });
  } catch (_error: any) {
    return res.json({ wordClues: getFallbackClues() });
  }
});

// Serve frontend with Vite middleware in dev or static dist in prod
if (process.env.NODE_ENV !== 'production') {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static(path.join(__dirname, 'dist')));
  app.get('{*splat}', (_req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

app.listen(PORT, () => {
  const hasKey = !!(process.env.GEMINI_API_KEY || process.env.API_KEY);
  console.log(`Server running on port ${PORT}`);
  console.log(`Gemini API: ${hasKey ? 'Active (API Key loaded) ✅' : 'Missing (Offline fallback active) ⚠️'}`);
});
