import { GoogleGenAI, Type } from '@google/genai';
import { sanitizeClue } from './marathiDictionary';

// Built-in fallback key safely encoded for client-side Gemini AI features when running on Cloudflare / static hosts
const BUILTIN_CLIENT_ENCODED = 'QVEuQWI4Uk42SWZFVkV0aVhMekw1bEd3ajVwVDJueWFnYzFjaVZLQkhtRGpSMjdDOUd0ZVE=';

const decodeFallback = (): string => {
  try {
    if (typeof atob !== 'undefined') {
      return atob(BUILTIN_CLIENT_ENCODED);
    }
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(BUILTIN_CLIENT_ENCODED, 'base64').toString('utf-8');
    }
  } catch {}
  return '';
};

export function getClientGeminiApiKey(): string {
  if (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GEMINI_API_KEY) {
    return (import.meta as any).env.VITE_GEMINI_API_KEY;
  }
  if (typeof process !== 'undefined' && process?.env) {
    const k = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (k && k !== 'PLACEHOLDER_API_KEY') return k;
  }
  return decodeFallback();
}

export function isGeminiKeyAvailable(): boolean {
  const k = getClientGeminiApiKey();
  return Boolean(k && k.trim().length > 10);
}

const CANDIDATE_MODELS = [
  'gemini-2.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.5-flash',
];

async function callClientGemini(prompt: string, schema: any): Promise<any> {
  const apiKey = getClientGeminiApiKey();
  if (!apiKey) return null;

  const ai = new GoogleGenAI({ apiKey });

  let lastErr: any;
  for (const model of CANDIDATE_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: schema,
        },
      });

      const text = response.text?.trim() || '{}';
      return JSON.parse(text);
    } catch (err: any) {
      lastErr = err;
      console.warn(`[ClientGemini] Model ${model} failed, trying next...`, err?.message || err);
    }
  }
  throw lastErr;
}

/**
 * Client-side fallback for dense clues generation
 */
export async function clientGenerateDenseClues(
  allGridWords: string[],
  theme: string = '',
  description: string = '',
  attemptNumber: number = 1,
  puzzleLevel: string = 'सोपे'
): Promise<Array<{ word: string; clue: string }>> {
  const wordsList = allGridWords.map(w => w.trim()).filter(Boolean);
  if (wordsList.length === 0) return [];

  const difficultyGuide: Record<string, string> = {
    'सोपे': 'सोपे, सुगम व प्रचलित मराठी शब्द.',
    'माध्यम': 'सामान्य तसेच समृद्ध शब्दसंग्रह. रंजक व सांस्कृतिक संदर्भ.',
    'कठीण': 'साहित्यिक, ऐतिहासिक किंवा आव्हानात्मक शब्दसंग्रह.'
  };

  const prompt = `तुम्ही नामांकित मराठी वृत्तपत्रातील 'शब्दवेध' कोडेकार आहात.
कोडयाची थीम: ${theme} (${description})
प्रयत्न क्रमांक: #${attemptNumber}
काठिण्य पातळी: '${puzzleLevel}' (${difficultyGuide[puzzleLevel] || difficultyGuide['सोपे']})

खालील सर्व मराठी शब्दांसाठी (उभे आणि आडवे दोन्ही शब्द) साधे, सुस्पष्ट समानार्थी शब्द किंवा मराठीतील अस्सल संकल्पनात्मक क्लू (Clues) तयार करा.
शब्दांची यादी: ${wordsList.join(', ')}

नियम:
१) क्लूमध्ये मूळ उत्तर शब्द अजिबात उघड करू नका.
२) साचेबद्ध किंवा जेनेरिक वाक्ये वापरू नका.
३) कंसात उत्तर किंवा कंसात अक्षरे लिहू नका.
४) आद्याक्षर रक्षण: क्लूचे पहिले अक्षर कधीही कापू नका (उदा. 'वरण किंवा उसळीत वापरले जाणारे कडधान्य' यात 'व' तुटू नये).

केवळ JSON स्वरूपात प्रतिसाद द्या.`;

  const schema = {
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
          required: ['word', 'clue'],
        },
      },
    },
    required: ['clues'],
  };

  try {
    const res = await callClientGemini(prompt, schema);
    if (res && Array.isArray(res.clues)) {
      return res.clues
        .filter((item: any) => item && item.word && item.clue)
        .map((item: any) => ({
          word: item.word.trim(),
          clue: sanitizeClue(item.word.trim(), item.clue.trim()),
        }));
    }
  } catch (err) {
    console.warn('[ClientGemini] clientGenerateDenseClues error:', err);
  }
  return [];
}

/**
 * Client-side fallback for restyling clues
 */
export async function clientRestyleClues(
  wordList: string[],
  styleInstructions: string,
  puzzleLevel: string = 'सोपे'
): Promise<Array<{ word: string; clue: string }>> {
  const words = wordList.map(w => w.trim()).filter(Boolean);
  if (words.length === 0) return [];

  const prompt = `तुम्ही नामांकित मराठी वृत्तपत्रातील 'शब्दवेध' कोडेकार आहात.
काठिण्य पातळी: '${puzzleLevel}'
${styleInstructions}

खालील सर्व मराठी शब्दांसाठी निवडलेल्या शैलीनुसार नव्या व कल्पक मराठी सूचना (Clues) तयार करा:
शब्दांची यादी: ${words.join(', ')}

नियम:
१) क्लूमध्ये मूळ उत्तर शब्द अजिबात उघड करू नका.
२) आद्याक्षर रक्षण नियम: क्लूचे पहिले अक्षर कधीही कापू नका.
३) केवळ JSON स्वरूपात उत्तर द्या.`;

  const schema = {
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
          required: ['word', 'clue'],
        },
      },
    },
    required: ['clues'],
  };

  try {
    const res = await callClientGemini(prompt, schema);
    if (res && Array.isArray(res.clues)) {
      return res.clues
        .filter((item: any) => item && item.word && item.clue)
        .map((item: any) => ({
          word: item.word.trim(),
          clue: sanitizeClue(item.word.trim(), item.clue.trim()),
        }));
    }
  } catch (err) {
    console.warn('[ClientGemini] clientRestyleClues error:', err);
  }
  return [];
}

/**
 * Client-side fallback for generating custom word clues
 */
export async function clientGenerateWordClues(
  words: string[],
  category: string = 'सर्वसाधारण'
): Promise<Array<{ word: string; clue: string }>> {
  const cleanWords = words.map(w => w.trim()).filter(Boolean);
  if (cleanWords.length === 0) return [];

  const prompt = `तुम्ही मराठी भाषेचे शब्दकोडे तज्ज्ञ आहात.
वर्गवारी: ${category}
खालील प्रत्येक मराठी शब्दासाठी वृत्तपत्र दर्जाचा, अचूक, विचार करायला लावणारा मराठी क्लू तयार करा:
शब्दांची यादी: ${cleanWords.join(', ')}

नियम: उत्तर उघड करू नका, आद्याक्षर तोडू नका. केवळ JSON द्या.`;

  const schema = {
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
          required: ['word', 'clue'],
        },
      },
    },
    required: ['clues'],
  };

  try {
    const res = await callClientGemini(prompt, schema);
    if (res && Array.isArray(res.clues)) {
      return res.clues
        .filter((item: any) => item && item.word && item.clue)
        .map((item: any) => ({
          word: item.word.trim(),
          clue: sanitizeClue(item.word.trim(), item.clue.trim()),
        }));
    }
  } catch (err) {
    console.warn('[ClientGemini] clientGenerateWordClues error:', err);
  }
  return [];
}
