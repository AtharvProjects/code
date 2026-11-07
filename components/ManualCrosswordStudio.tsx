import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { GridCell, PuzzleData, Clues, PlacedWord, WordClue } from '../types';
import { getGraphemes, createPuzzleDataFromGrid } from '../services/crosswordService';
import {
    createBlankManualGrid,
    createTemplateManualGrid,
    toggleManualBlackCell,
    autoNumberManualGrid,
} from '../services/manualConstructorService';
import { toDevanagari } from './PrintableShabdavedhPDF';
import { sanitizeClue, getMarathiWordClue, isGenericClue, generateSmartMarathiClue } from '../services/marathiDictionary';
import { getCluesForWords } from '../services/geminiService';
import { CrosswordGrid } from './CrosswordGrid';
import { ClueList } from './ClueList';
import { MarathiOnScreenKeyboard } from './MarathiOnScreenKeyboard';
import { ModifiedWordsCluePanel } from './ModifiedWordsCluePanel';
import {
    PlayIcon,
    PrintIcon,
    PencilIcon,
    CheckIcon,
    TrashIcon,
    BookOpenIcon,
    RefreshCwIcon
} from './Icons';

interface ManualCrosswordStudioProps {
    onLoadIntoSolver: (puzzle: PuzzleData) => void;
    onPrintPuzzle: (puzzle: PuzzleData) => void;
    initialGridSize?: number;
    currentAutoPuzzle?: PuzzleData | null;
}

const MANUAL_STORAGE_KEY = 'marathiManualCrosswordState_v2';

export const ManualCrosswordStudio: React.FC<ManualCrosswordStudioProps> = ({
    onLoadIntoSolver,
    onPrintPuzzle,
    initialGridSize = 10,
    currentAutoPuzzle
}) => {
    // 1. Restore size from localStorage if available
    const [size, setSize] = useState<number>(() => {
        try {
            const raw = localStorage.getItem(MANUAL_STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (typeof parsed.size === 'number' && parsed.size >= 5) {
                    return parsed.size;
                }
            }
        } catch (e) {
            console.warn('Could not load saved manual size:', e);
        }
        return initialGridSize;
    });

    // 2. Restore grid from localStorage if available
    const [grid, setGrid] = useState<GridCell[][]>(() => {
        try {
            const raw = localStorage.getItem(MANUAL_STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed.grid && Array.isArray(parsed.grid) && parsed.grid.length > 0) {
                    return parsed.grid;
                }
            }
        } catch (e) {
            console.warn('Could not load saved manual grid:', e);
        }
        return createBlankManualGrid(initialGridSize);
    });

    // 3. Restore custom clues from localStorage if available
    const [customClues, setCustomClues] = useState<Map<string, string>>(() => {
        try {
            const raw = localStorage.getItem(MANUAL_STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed.customClues && Array.isArray(parsed.customClues)) {
                    const validEntries = (parsed.customClues as [string, string][]).filter(([_, clue]) => clue && !isGenericClue(clue));
                    return new Map<string, string>(validEntries);
                }
            }
        } catch (e) {
            console.warn('Could not load saved manual custom clues:', e);
        }
        return new Map<string, string>();
    });

    const [isSymmetrical, setIsSymmetrical] = useState<boolean>(true);
    const [showOnScreenKeyboard, setShowOnScreenKeyboard] = useState<boolean>(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [isGeneratingClues, setIsGeneratingClues] = useState<boolean>(false);
    const [hasRestoredSession, setHasRestoredSession] = useState<boolean>(() => {
        return !!localStorage.getItem(MANUAL_STORAGE_KEY);
    });


    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3500);
    };

    // Auto-save on ANY change to size, grid, or customClues
    useEffect(() => {
        try {
            const payload = {
                size,
                grid,
                customClues: Array.from(customClues.entries()),
                lastSaved: Date.now()
            };
            localStorage.setItem(MANUAL_STORAGE_KEY, JSON.stringify(payload));
        } catch (e) {
            console.error('Failed to auto-save manual crossword state to localStorage:', e);
        }
    }, [size, grid, customClues]);

    // Auto-calculate numbering, extracted words, clues and stats in real time
    const { grid: numberedGrid, placedWords, clues, stats } = useMemo(() => {
        return autoNumberManualGrid(grid, customClues);
    }, [grid, customClues]);

    const fetchingWordsRef = useRef<Set<string>>(new Set());
    const aiFetchedWordsRef = useRef<Set<string>>(new Set());

    // Real-time dynamic clue update effect: Whenever grid words change, automatically update clues
    useEffect(() => {
        if (placedWords.length === 0) return;

        const nextCluesMap = new Map<string, string>(customClues);
        let needsUpdate = false;
        const wordsNeedingAi: string[] = [];

        // 1. Purge clues for words no longer present on the grid
        const activeWordsSet = new Set(placedWords.map(pw => pw.word.trim()));
        Array.from(nextCluesMap.keys()).forEach(key => {
            if (!activeWordsSet.has(key)) {
                nextCluesMap.delete(key);
                aiFetchedWordsRef.current.delete(key);
                needsUpdate = true;
            }
        });

        // 2. Assign instant smart dictionary clues and queue words needing AI clue
        placedWords.forEach(pw => {
            const word = pw.word.trim();
            const currentClue = nextCluesMap.get(word) || '';
            if (!currentClue || isGenericClue(currentClue)) {
                const dictClue = getMarathiWordClue(word);
                if (dictClue && !isGenericClue(dictClue)) {
                    nextCluesMap.set(word, dictClue);
                    needsUpdate = true;
                } else if (currentClue) {
                    nextCluesMap.delete(word);
                    needsUpdate = true;
                }
            }
            if (!aiFetchedWordsRef.current.has(word) && !fetchingWordsRef.current.has(word)) {
                wordsNeedingAi.push(word);
            }
        });

        if (needsUpdate) {
            setCustomClues(nextCluesMap);
        }

        // Asynchronously fetch fresh AI clues from server for any new or modified words
        if (wordsNeedingAi.length > 0) {
            wordsNeedingAi.forEach(w => fetchingWordsRef.current.add(w));
            (async () => {
                try {
                    const fetched = await getCluesForWords(wordsNeedingAi, true); // forceAi: true
                    if (fetched && fetched.length > 0) {
                        setCustomClues(prev => {
                            const updated = new Map<string, string>(prev);
                            fetched.forEach(f => {
                                if (f.word && f.clue) {
                                    const wKey = f.word.trim();
                                    const sanitized = sanitizeClue(wKey, f.clue);
                                    if (sanitized && !isGenericClue(sanitized)) {
                                        updated.set(wKey, sanitized);
                                        aiFetchedWordsRef.current.add(wKey);
                                    }
                                }
                            });
                            return updated;
                        });
                    }
                } catch (_err) {
                    // Local smart dictionary fallback already active
                } finally {
                    wordsNeedingAi.forEach(w => fetchingWordsRef.current.delete(w));
                }
            })();
        }
    }, [placedWords]);

    // Grid change handler: exactly like the automatic edit mode
    const handleGridChange = (newGrid: GridCell[][]) => {
        setGrid(newGrid);
    };

    // Clues change handler: directly updates clues for matching words
    const handleCluesChange = (newClues: Clues) => {
        setCustomClues(prev => {
            const next = new Map(prev);
            newClues.across.forEach(c => {
                if (c.word && c.clue) next.set(c.word, c.clue);
            });
            newClues.down.forEach(c => {
                if (c.word && c.clue) next.set(c.word, c.clue);
            });
            return next;
        });
        showToast('क्लूज यशस्वीरीत्या अद्यतनित व जतन झाले!');
    };

    // Handle changing grid size
    const handleSizeChange = (newSize: number) => {
        setSize(newSize);
        const newGrid = createTemplateManualGrid(newSize, 0);
        setGrid(newGrid);
        showToast(`ग्रिड आकार ${toDevanagari(newSize)}x${toDevanagari(newSize)} वर सेट केला! (आपोआप जतन)`);
    };

    // Reset to a brand new puzzle
    const handleResetToNew = (templateIdx: number = 0) => {
        const freshGrid = createTemplateManualGrid(size, templateIdx);
        setGrid(freshGrid);
        setCustomClues(new Map());
        showToast('नवीन कोडे सुरू झाले!');
    };

    // Auto-fetch/generate high-quality dictionary & AI clues for all current words
    const handleAutoGenerateAllClues = async () => {
        if (placedWords.length === 0) {
            showToast('ग्रिडवर आधी अक्षरे भरून शब्द तयार करा.');
            return;
        }

        setIsGeneratingClues(true);
        // 1. Clear existing clues state before generating new ones
        setCustomClues(new Map());
        aiFetchedWordsRef.current.clear();
        fetchingWordsRef.current.clear();

        try {
            // 2. Ensure Gemini API call receives the latest updated array of Marathi words
            const allWords: string[] = Array.from(new Set<string>(placedWords.map(pw => pw.word.trim()))).filter((w: string) => w.length >= 2);
            const fetched = await getCluesForWords(allWords, true); // forceAi: true
            const newCluesMap = new Map<string, string>();

            // 3. Map returned clues directly to exact corresponding word
            if (fetched && fetched.length > 0) {
                fetched.forEach(f => {
                    if (f.word && f.clue) {
                        const cleanWordKey = f.word.trim();
                        const sanitized = sanitizeClue(cleanWordKey, f.clue);
                        if (sanitized && !isGenericClue(sanitized)) {
                            newCluesMap.set(cleanWordKey, sanitized);
                            aiFetchedWordsRef.current.add(cleanWordKey);
                        }
                    }
                });
            }

            // Ensure no word remains with empty or generic clue
            placedWords.forEach(pw => {
                const word = pw.word.trim();
                const current = newCluesMap.get(word) || '';
                if (!current || isGenericClue(current)) {
                    const fallback = getMarathiWordClue(word) || generateSmartMarathiClue(word);
                    if (fallback && !isGenericClue(fallback)) {
                        newCluesMap.set(word, sanitizeClue(word, fallback));
                    }
                }
            });

            setCustomClues(newCluesMap);
            showToast(`सर्व ${toDevanagari(placedWords.length)} शब्दांचे एआय द्वारे अचूक मराठी क्लूज तयार व जतन झाले!`);
        } catch (_error) {
            showToast('क्लूज तयार करताना त्रुटी आली. स्थानिक शब्दकोशातील क्लूज वापरले.');
        } finally {
            setIsGeneratingClues(false);
        }
    };

    // Import current AI puzzle layout into Manual Studio
    const handleImportAutoPuzzleLayout = (clearLetters: boolean) => {
        if (!currentAutoPuzzle || !currentAutoPuzzle.grid) {
            showToast('कोणतेही स्वयंचलित कोडे उपलब्ध नाही!');
            return;
        }

        const newSize = currentAutoPuzzle.grid.length;
        const importedGrid: GridCell[][] = currentAutoPuzzle.grid.map(row =>
            row.map(cell => ({
                letter: clearLetters ? null : (cell.isBlack ? null : cell.letter),
                isBlack: Boolean(cell.isBlack),
                number: null
            }))
        );

        setSize(newSize);
        setGrid(importedGrid);

        if (clearLetters) {
            setCustomClues(new Map());
            showToast(`स्वयंचलित कोड्याची ${toDevanagari(newSize)}x${toDevanagari(newSize)} काळी चौकट लोड झाली! (सर्व अक्षरे साफ, नवीन शब्द टाईप करा)`);
        } else {
            const importedCluesMap = new Map<string, string>();
            if (currentAutoPuzzle.clues) {
                currentAutoPuzzle.clues.across?.forEach(c => { if (c.word && c.clue) importedCluesMap.set(c.word, c.clue); });
                currentAutoPuzzle.clues.down?.forEach(c => { if (c.word && c.clue) importedCluesMap.set(c.word, c.clue); });
            }
            setCustomClues(importedCluesMap);
            showToast(`स्वयंचलित कोडे ${toDevanagari(newSize)}x${toDevanagari(newSize)} अक्षरांसह लोड झाले!`);
        }
    };

    // Clear all letters while keeping black square layout
    const handleClearLettersOnly = () => {
        const newGrid = grid.map(row => row.map(cell => ({
            ...cell,
            letter: null
        })));
        setGrid(newGrid);
        showToast('सर्व अक्षरे पुसली, काळ्या चौकटी कायम आहेत!');
    };

    // Load full manual puzzle into the main solver
    const handleExportToSolver = () => {
        const wordClues: WordClue[] = placedWords.map(pw => {
            const rawClue = customClues.get(pw.word);
            const validClue = (rawClue && !isGenericClue(rawClue)) ? rawClue : (getMarathiWordClue(pw.word) || '');
            return {
                word: pw.word,
                clue: sanitizeClue(pw.word, validClue)
            };
        });

        const puzzleData = createPuzzleDataFromGrid(numberedGrid, wordClues);
        onLoadIntoSolver(puzzleData);
    };

    // Generate Printable PDF
    const handleExportPdf = () => {
        const wordClues: WordClue[] = placedWords.map(pw => {
            const rawClue = customClues.get(pw.word);
            const validClue = (rawClue && !isGenericClue(rawClue)) ? rawClue : (getMarathiWordClue(pw.word) || '');
            return {
                word: pw.word,
                clue: sanitizeClue(pw.word, validClue)
            };
        });

        const puzzleData = createPuzzleDataFromGrid(numberedGrid, wordClues);
        onPrintPuzzle(puzzleData);
    };

    return (
        <div className="space-y-6">
            {/* AI Auto-Puzzle Import Banner */}
            {currentAutoPuzzle && currentAutoPuzzle.grid && (
                <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-amber-500/10 dark:from-amber-900/30 dark:to-amber-900/20 border border-amber-300 dark:border-amber-700/60 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <span className="p-2.5 bg-amber-500/20 text-amber-900 dark:text-amber-200 rounded-xl text-xl flex-shrink-0">
                            🤖
                        </span>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm sm:text-base font-bold text-amber-950 dark:text-amber-100">
                                    वर्तमान स्वयंचलित कोडे: {currentAutoPuzzle.title || 'मराठी शब्दकोडे'} ({toDevanagari(currentAutoPuzzle.grid.length)}x{toDevanagari(currentAutoPuzzle.grid.length)})
                                </h3>
                            </div>
                            <p className="text-xs text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                                या कोड्याची काळी चौकट (Black Square Structure) जशीच्या तशी वापरून स्वतःचे नवीन शब्द टाईप करा!
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={() => handleImportAutoPuzzleLayout(true)}
                            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all active:scale-95 flex items-center gap-1.5"
                            title="काळ्या चौकटींची रचना कायम ठेवून सर्व अक्षरे साफ करा जेणेकरून नवीन शब्द भरता येतील"
                        >
                            <span>✨ काळी चौकट आणा (अक्षरे साफ)</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => handleImportAutoPuzzleLayout(false)}
                            className="px-3 py-1.5 bg-amber-100 dark:bg-amber-900/60 hover:bg-amber-200 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 rounded-xl text-xs font-semibold transition-all active:scale-95"
                            title="मूळ अक्षरे व काळ्या चौकटींसह कोडे लोड करा"
                        >
                            <span>📝 अक्षरांसह आणा</span>
                        </button>
                    </div>
                </div>
            )}
            {/* Header & Main Actions Bar */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md border border-indigo-100 dark:border-slate-700 p-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700 pb-4 mb-4">
                    <div>
                        <div className="flex items-center gap-2.5">
                            <span className="p-2 bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 rounded-xl text-xl">
                                ✍️
                            </span>
                            <div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                                        मानवी रचना स्टुडिओ
                                    </h2>
                                    <span className="inline-flex items-center gap-1 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-xs font-bold px-2.5 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-800">
                                        <span>💾</span>
                                        <span>प्रयत्न कायम स्मरणात (Auto-Saved)</span>
                                    </span>
                                </div>
                                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                                    मध्येच बाहेर पडलात किंवा रिफ्रेश केले तरी तुमची शेवटची रचना व अक्षरे आपोआप जतन राहतात!
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={handleAutoGenerateAllClues}
                            disabled={isGeneratingClues || placedWords.length === 0}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-700 hover:bg-indigo-100 font-bold text-xs sm:text-sm rounded-xl shadow-xs transition-all active:scale-95 disabled:opacity-50"
                            title="तयार शब्दांसाठी शब्दकोशातून क्लूज तयार करा"
                        >
                            <RefreshCwIcon className={`w-4 h-4 ${isGeneratingClues ? 'animate-spin' : ''}`} />
                            <span>{isGeneratingClues ? 'क्लूज तयार होत आहेत...' : '💡 क्लूज तयार करा'}</span>
                        </button>
                        <button
                            type="button"
                            onClick={handleExportToSolver}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-xs transition-all active:scale-95"
                            title="तयार केलेले कोडे खेळण्यासाठी मुख्य स्क्रीनवर उघडा"
                        >
                            <PlayIcon className="w-4 h-4" />
                            <span>सोडवायला घ्या</span>
                        </button>
                        <button
                            type="button"
                            onClick={handleExportPdf}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-xs transition-all active:scale-95"
                            title="वर्तमानपत्र दर्जाची PDF डाउनलोड करा"
                        >
                            <PrintIcon className="w-4 h-4" />
                            <span>PDF डाउनलोड</span>
                        </button>
                    </div>
                </div>

                {/* Grid Size & Tools Row */}
                <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                    {/* Size Selector */}
                    <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">आकार:</span>
                        {[5, 6, 7, 8, 9, 10, 12, 15].map(s => (
                            <button
                                key={`size-btn-${s}`}
                                type="button"
                                onClick={() => handleSizeChange(s)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                                    size === s
                                        ? 'bg-indigo-600 text-white shadow-xs'
                                        : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-slate-600'
                                }`}
                            >
                                {toDevanagari(s)}x{toDevanagari(s)}
                            </button>
                        ))}
                    </div>

                    {/* Mask Templates & Tools */}
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                setGrid(createBlankManualGrid(size));
                                showToast('पूर्ण कोरा पांढरा ग्रिड लोड झाला!');
                            }}
                            className="px-3 py-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold transition-colors"
                        >
                            📄 पूर्ण पांढरा ग्रिड
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setGrid(createTemplateManualGrid(size, 0));
                                showToast('वृत्तपत्र सममिती मास्क लोड झाला!');
                            }}
                            className="px-3 py-1 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-lg text-xs font-semibold transition-colors"
                        >
                            📰 वृत्तपत्र मास्क
                        </button>
                        <button
                            type="button"
                            onClick={handleClearLettersOnly}
                            className="px-2.5 py-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-medium"
                            title="फक्त अक्षरे पुसा"
                        >
                            🧹 अक्षरे पुसा
                        </button>
                        <button
                            type="button"
                            onClick={() => handleResetToNew(0)}
                            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-lg text-xs font-medium"
                            title="नवीन कोडे सुरू करा"
                        >
                            🔄 नवीन कोडे
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowOnScreenKeyboard(!showOnScreenKeyboard)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                                showOnScreenKeyboard
                                    ? 'bg-amber-100 dark:bg-amber-900/60 border-amber-400 text-amber-900 dark:text-amber-200'
                                    : 'bg-slate-100 dark:bg-slate-700 border-slate-300 text-slate-700 dark:text-slate-300'
                            }`}
                        >
                            ⌨️ ऑन-स्क्रीन कीबोर्ड {showOnScreenKeyboard ? 'सुरू' : 'बंद'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Toast Banner */}
            {toastMessage && (
                <div className="p-3 bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-100 text-xs sm:text-sm font-semibold rounded-xl flex items-center justify-between shadow-xs animate-fadeIn">
                    <div className="flex items-center gap-2">
                        <CheckIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                        <span>{toastMessage}</span>
                    </div>
                    <button onClick={() => setToastMessage(null)} className="font-bold text-emerald-700 hover:text-emerald-900 px-1">✕</button>
                </div>
            )}

            {/* Main Interactive Grid & Clues Container */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-6">
                {/* Status Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200 dark:border-slate-700">
                    <div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <span>तुमचे संपादन ग्रिड</span>
                            <span className="text-xs bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-300 font-semibold px-2 py-0.5 rounded">
                                थेट संपादन (Live Edit Mode)
                            </span>
                        </h3>
                        <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs">
                            <span className="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-300 font-semibold px-2 py-0.5 rounded">
                                एकूण शब्द: {toDevanagari(stats.totalWords)} (आडवे {toDevanagari(stats.acrossCount)} + उभे {toDevanagari(stats.downCount)})
                            </span>
                            <span className="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 font-semibold px-2 py-0.5 rounded">
                                काळे चौकोन: {toDevanagari(stats.blackSquarePercentage)}% ({toDevanagari(stats.blackCells)}/{toDevanagari(size * size)})
                            </span>
                            <span className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium px-2 py-0.5 rounded">
                                अक्षरे: {toDevanagari(stats.totalLetters)}
                            </span>
                        </div>
                    </div>

                    <div className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                        💡 <strong>कसे वापरावे:</strong> कोणत्याही पांढऱ्या चौकोनावर क्लिक करून मोबाईल कीबोर्डने थेट अक्षर टाईप करा. स्पेस दिल्यास काळा चौकोन होतो.
                    </div>
                </div>

                {/* Modified / Custom Words & Independent Clue Generator Panel */}
                <ModifiedWordsCluePanel
                    placedWords={placedWords}
                    originalWordsSet={new Set()}
                    currentCluesMap={customClues}
                    onApplyClues={(newClues) => {
                        setCustomClues(prev => {
                            const next = new Map(prev);
                            newClues.forEach(c => {
                                if (c.word && c.clue) next.set(c.word, c.clue);
                            });
                            return next;
                        });
                        showToast(`${toDevanagari(newClues.length)} बदललेल्या शब्दांचे अचूक क्लूज लागू झाले!`);
                    }}
                    onUpdatePuzzle={() => {
                        showToast('कोडे व क्लूज यशस्वीरीत्या अद्यतनित व जतन झाले!');
                    }}
                    isUpdating={isGeneratingClues}
                />

                {/* The Interactive Crossword Grid */}
                <div className="mx-auto mb-8 max-w-lg transition-all duration-200">
                    <CrosswordGrid
                        grid={numberedGrid}
                        showSolution={true}
                        isEditMode={true}
                        onGridChange={handleGridChange}
                    />
                </div>

                {/* Optional On-Screen Keyboard helper */}
                {showOnScreenKeyboard && (
                    <div className="max-w-2xl mx-auto mb-8">
                        <MarathiOnScreenKeyboard
                            onInsertChar={(char) => {
                                showToast(`अक्षर '${char}' टाईप करण्यासाठी ग्रिडमधील चौकोनावर टॅप करा`);
                            }}
                            onApplyMatra={(matra) => {
                                showToast(`मात्रा '${matra}' जोडण्यासाठी ग्रिडमधील चौकोनावर टॅप करा`);
                            }}
                            onBackspace={() => {}}
                            onToggleDirection={() => {}}
                            onToggleBlack={() => {}}
                            onNavigate={() => {}}
                            direction="across"
                            activeCellLetter={null}
                            isCurrentCellBlack={false}
                        />
                    </div>
                )}

                {/* The EXACT ClueList Component with Devanagari numbering & Inline Editing */}
                <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <BookOpenIcon className="w-5 h-5 text-indigo-600" />
                            <span>कोड्याचे क्लूज (आडवे व उभे शब्द)</span>
                        </h3>
                        <span className="text-xs font-semibold text-slate-500">
                            एकूण {toDevanagari(clues.across.length + clues.down.length)} क्लूज
                        </span>
                    </div>

                    <ClueList
                        clues={clues}
                        onCluesChange={handleCluesChange}
                        showSolution={true}
                    />
                </div>
            </div>
        </div>
    );
};