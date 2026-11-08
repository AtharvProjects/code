import React, { useState, useRef, useEffect } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { WordClue, PuzzleData, GridCell, Clues } from './types';
import { WordInputForm } from './components/WordInputForm';
import { PuzzleControls } from './components/PuzzleControls';
import { CrosswordGrid } from './components/CrosswordGrid';
import { ClueList } from './components/ClueList';
import { PuzzleIcon, AlertTriangleIcon, ScissorIcon, CheckIcon, WandIcon, PencilIcon, TrophyIcon } from './components/Icons';
import { ImprovementModal } from './components/ImprovementModal';
import { PrintableShabdavedhPDF, toDevanagari } from './components/PrintableShabdavedhPDF';
import { THEME_OPTIONS, getThemedFreshPuzzle } from './services/puzzleBank';
import { ManualCrosswordStudio } from './components/ManualCrosswordStudio';
import { LimcaRecordCrosswordStudio } from './components/LimcaRecordCrosswordStudio';
import { ModifiedWordsCluePanel } from './components/ModifiedWordsCluePanel';
import { VocabularyInspectorModal } from './components/VocabularyInspectorModal';
import { IMPORTED_VOCABULARY_WORDS } from './services/importedVocabularyDatabase';
import { saveWordToInfiniteLexicon } from './services/infiniteLexiconService';
import {
    getDefaultShabdavedhPuzzle,
    buildPuzzleFromMaster,
    buildPuzzleFromAIGrid,
    generateCrosswordData,
    extractUniqueWordsFromGrid,
    createPuzzleDataFromGrid,
    extractPlacedWordsFromGrid
} from './services/crosswordService';
import { getMarathiWordClue, sanitizeClue, isGenericClue, generateSmartMarathiClue } from './services/marathiDictionary';
import { getGridMaskSignature } from './services/dynamicCrosswordSolver';
import {
    generateDenseCrosswordAI,
    generateWordCluesFromAI,
    getCluesForWords
} from './services/geminiService';
import { transformGridMatrix, buildPuzzleDataFromMatrix } from './services/denseCrosswordEngine';

const App: React.FC = () => {
    const [wordClues, setWordClues] = useState<WordClue[]>([]);
    const [puzzleData, setPuzzleData] = useState<PuzzleData | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [showSolution, setShowSolution] = useState(false);
    const [aiError, setAiError] = useState<string | null>(null);
    const [isPrinting, setIsPrinting] = useState(false);
    const printContentRef = useRef<HTMLDivElement>(null);
    const page1Ref = useRef<HTMLDivElement>(null);
    const page2Ref = useRef<HTMLDivElement>(null);
    const [pdfSuccessMessage, setPdfSuccessMessage] = useState<string | null>(null);
    const [gridSize, setGridSize] = useState(10);
    const [blackSquarePercentage, setBlackSquarePercentage] = useState(28);
    const [puzzleVersion, setPuzzleVersion] = useState(0);
    const [isEditMode, setIsEditMode] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [originalPuzzleData, setOriginalPuzzleData] = useState<PuzzleData | null>(null);
    const [showEditHelpModal, setShowEditHelpModal] = useState(false);
    const [originalWordsSet, setOriginalWordsSet] = useState<Set<string>>(new Set());
    const [puzzleLevel, setPuzzleLevel] = useState<'सोपे' | 'माध्यम' | 'कठीण'>('सोपे');
    const [attemptCount, setAttemptCount] = useState(1);
    const [attemptSuccessMsg, setAttemptSuccessMsg] = useState<string | null>(null);
    const [usedWordsHistory, setUsedWordsHistory] = useState<Set<string>>(new Set());
    const [selectedTheme, setSelectedTheme] = useState<string>('auto');
    const [puzzleSource, setPuzzleSource] = useState<'ai' | 'database'>('ai');
    const [isAiClueSyncing, setIsAiClueSyncing] = useState(false);
    const [aiSyncSuccessMsg, setAiSyncSuccessMsg] = useState<string | null>(null);
    const aiFetchedWordsCacheRef = useRef<Map<string, string>>(new Map());
    const [showTransferToManualModal, setShowTransferToManualModal] = useState(false);
    const [showVocabModal, setShowVocabModal] = useState(false);

    const [activeMode, setActiveMode] = useState<'auto' | 'manual' | 'limca'>(() => {
        try {
            const savedMode = localStorage.getItem('marathiCrosswordActiveMode');
            if (savedMode === 'manual' || savedMode === 'auto' || savedMode === 'limca') return savedMode;
        } catch (e) {
            console.warn('Could not read active mode from storage:', e);
        }
        return 'auto';
    });

    // Save active mode whenever it changes
    useEffect(() => {
        try {
            localStorage.setItem('marathiCrosswordActiveMode', activeMode);
        } catch (e) {
            console.error('Failed to save active mode:', e);
        }
    }, [activeMode]);

    const handleOpenInManualStudio = (clearLetters: boolean = true) => {
        setShowTransferToManualModal(false);
        if (!puzzleData) return;

        const size = puzzleData.grid.length;
        const manualGrid: GridCell[][] = puzzleData.grid.map(row =>
            row.map(cell => ({
                letter: clearLetters ? null : (cell.isBlack ? null : cell.letter),
                isBlack: Boolean(cell.isBlack),
                number: null
            }))
        );

        try {
            const payload = {
                size,
                grid: manualGrid,
                customClues: clearLetters ? [] : Array.from(
                    new Map([
                        ...(puzzleData.clues?.across || []).map(c => [c.word, c.clue] as [string, string]),
                        ...(puzzleData.clues?.down || []).map(c => [c.word, c.clue] as [string, string])
                    ]).entries()
                ),
                lastSaved: Date.now()
            };
            localStorage.setItem('marathiManualCrosswordState_v2', JSON.stringify(payload));
        } catch (e) {
            console.error('Failed to transfer puzzle to manual studio:', e);
        }

        setActiveMode('manual');
        setAttemptSuccessMsg(
            clearLetters
                ? `काळ्या चौकटींच्या (${toDevanagari(size)}x${toDevanagari(size)}) चौकटीसह मानवी स्टुडिओत लोड झाले! सर्व अक्षरे साफ केली आहेत, आता नवीन शब्द टाईप करा.`
                : 'काळ्या चौकटी व शब्दांसह मानवी स्टुडिओत उघडले!'
        );
    };

    // Load puzzle on initial render (defaulting to the official Shabdavedh sample)
    useEffect(() => {
        try {
            const savedPuzzleJSON = localStorage.getItem('marathiCrosswordState_v5');
            if (savedPuzzleJSON) {
                const savedPuzzle: PuzzleData = JSON.parse(savedPuzzleJSON);
                setPuzzleData(savedPuzzle);
            } else {
                const defaultPuzzle = getDefaultShabdavedhPuzzle();
                setPuzzleData(defaultPuzzle);
            }
        } catch (e) {
            console.error('Failed to load puzzle from local storage:', e);
            const defaultPuzzle = getDefaultShabdavedhPuzzle();
            setPuzzleData(defaultPuzzle);
        }
    }, []);

    // Save puzzle to local storage whenever it changes
    useEffect(() => {
        if (puzzleData) {
            try {
                localStorage.setItem('marathiCrosswordState_v5', JSON.stringify(puzzleData));
            } catch (e) {
                console.error('Failed to save puzzle to local storage:', e);
            }
        }
    }, [puzzleData]);


    const handleGridSizeChange = (newSize: number) => {
        setGridSize(newSize);
        const nextAttempt = attemptCount + 1;
        setAttemptCount(nextAttempt);
        const currentWords = new Set<string>(usedWordsHistory);
        if (puzzleData?.clues?.across) {
            puzzleData.clues.across.forEach(c => { if (c.word) currentWords.add(c.word); });
        }
        if (puzzleData?.clues?.down) {
            puzzleData.clues.down.forEach(c => { if (c.word) currentWords.add(c.word); });
        }

        const currentSignature = puzzleData?.grid ? getGridMaskSignature(puzzleData.grid) : undefined;
        const master = getThemedFreshPuzzle(selectedTheme, currentWords, nextAttempt, newSize, currentSignature, blackSquarePercentage);
        const newPuzzle = buildPuzzleFromMaster(master);
        setPuzzleData(newPuzzle);
        setPuzzleVersion(v => v + 1);

        const newWords = new Set<string>();
        newPuzzle.clues.across.forEach(c => { if (c.word) newWords.add(c.word); });
        newPuzzle.clues.down.forEach(c => { if (c.word) newWords.add(c.word); });

        setUsedWordsHistory(prev => {
            const updated = new Set(prev);
            newWords.forEach(w => updated.add(w));
            return updated.size > 300 ? new Set(Array.from(updated).slice(-150)) : updated;
        });

        const totalC = newPuzzle.grid.length * newPuzzle.grid[0].length;
        const blackC = newPuzzle.grid.flat().filter(c => c.isBlack).length;
        const actualPct = Math.round((blackC / totalC) * 100);

        setAttemptSuccessMsg(`${newSize}x${newSize} कोडे यशस्वीरीत्या लोड झाले (${master.theme} | काळे चौकोन: ${toDevanagari(actualPct)}% [${toDevanagari(blackC)}/${toDevanagari(totalC)}])`);
    };

    const handleShuffleMask = async () => {
        const nextAttempt = attemptCount + 1;
        setAttemptCount(nextAttempt);
        setShowSolution(false);
        setIsEditMode(false);

        const currentWords = new Set<string>(usedWordsHistory);
        if (puzzleData?.clues?.across) {
            puzzleData.clues.across.forEach(c => { if (c.word) currentWords.add(c.word); });
        }
        if (puzzleData?.clues?.down) {
            puzzleData.clues.down.forEach(c => { if (c.word) currentWords.add(c.word); });
        }

        const currentSignature = puzzleData?.grid ? getGridMaskSignature(puzzleData.grid) : undefined;
        let newPuzzle: PuzzleData;

        if (puzzleSource === 'ai') {
            setIsGenerating(true);
            try {
                const aiResult = await generateDenseCrosswordAI(
                    gridSize,
                    blackSquarePercentage,
                    puzzleLevel,
                    nextAttempt,
                    currentWords,
                    selectedTheme,
                    currentSignature
                );
                if (aiResult && aiResult.grid && aiResult.grid.length > 0) {
                    newPuzzle = await buildPuzzleFromAIGrid(aiResult.grid, aiResult.clues, gridSize);
                    aiResult.clues.forEach(c => {
                        if (c.word && c.clue) {
                            aiFetchedWordsCacheRef.current.set(c.word.trim(), c.clue.trim());
                        }
                    });
                } else {
                    const master = getThemedFreshPuzzle(selectedTheme, currentWords, nextAttempt, gridSize, currentSignature, blackSquarePercentage);
                    newPuzzle = buildPuzzleFromMaster(master);
                }
            } catch {
                const master = getThemedFreshPuzzle(selectedTheme, currentWords, nextAttempt, gridSize, currentSignature, blackSquarePercentage);
                newPuzzle = buildPuzzleFromMaster(master);
            } finally {
                setIsGenerating(false);
            }
        } else {
            const master = getThemedFreshPuzzle(selectedTheme, currentWords, nextAttempt, gridSize, currentSignature, blackSquarePercentage);
            newPuzzle = buildPuzzleFromMaster(master);
        }

        // Guarantee that the mask signature ALWAYS changes on shuffle
        let newSig = getGridMaskSignature(newPuzzle.grid);
        if (currentSignature && newSig === currentSignature) {
            for (let v = 1; v < 8; v++) {
                const charMatrix = newPuzzle.grid.map(row => row.map(cell => cell.isBlack || !cell.letter ? '#' : cell.letter));
                const transformed = transformGridMatrix(charMatrix, (nextAttempt * 3 + v) % 8);
                const testSig = transformed.map(r => r.map(c => c === '#' ? '#' : '0').join('')).join('|');
                if (testSig !== currentSignature) {
                    newPuzzle = buildPuzzleDataFromMatrix(transformed, selectedTheme);
                    break;
                }
            }
        }

        setPuzzleData(newPuzzle);
        setPuzzleVersion(v => v + 1);

        const newWords = new Set<string>();
        newPuzzle.clues.across.forEach(c => { if (c.word) newWords.add(c.word); });
        newPuzzle.clues.down.forEach(c => { if (c.word) newWords.add(c.word); });

        setUsedWordsHistory(prev => {
            const updated = new Set(prev);
            newWords.forEach(w => updated.add(w));
            return updated.size > 300 ? new Set(Array.from(updated).slice(-150)) : updated;
        });

        const totalC = newPuzzle.grid.length * newPuzzle.grid[0].length;
        const blackC = newPuzzle.grid.flat().filter(c => c.isBlack).length;
        const actualPct = Math.round((blackC / totalC) * 100);

        setAttemptSuccessMsg(`प्रयत्न #${toDevanagari(nextAttempt)}: काळ्या चौकोनांची नवी जागा व शब्द यशस्वीरीत्या बदलले! (काळे चौकोन: ${toDevanagari(actualPct)}% [${toDevanagari(blackC)}/${toDevanagari(totalC)} घरे])`);
    };

    const handleDatabaseGenerate = () => {
        setIsGenerating(true);
        setAiError(null);
        setShowSolution(false);
        setIsEditMode(false);
        setPuzzleSource('database');
        const nextAttempt = attemptCount + 1;
        setAttemptCount(nextAttempt);

        const currentWords = new Set<string>(usedWordsHistory);
        if (puzzleData?.clues?.across) {
            puzzleData.clues.across.forEach(c => { if (c.word) currentWords.add(c.word); });
        }
        if (puzzleData?.clues?.down) {
            puzzleData.clues.down.forEach(c => { if (c.word) currentWords.add(c.word); });
        }

        const currentSignature = puzzleData?.grid ? getGridMaskSignature(puzzleData.grid) : undefined;
        const master = getThemedFreshPuzzle(selectedTheme, currentWords, nextAttempt, gridSize, currentSignature, blackSquarePercentage);
        const newPuzzle = buildPuzzleFromMaster(master);
        setPuzzleData(newPuzzle);
        setPuzzleVersion(v => v + 1);

        const newWords = new Set<string>();
        newPuzzle.clues.across.forEach(c => { if (c.word) newWords.add(c.word); });
        newPuzzle.clues.down.forEach(c => { if (c.word) newWords.add(c.word); });

        setUsedWordsHistory(prev => {
            const updated = new Set(prev);
            newWords.forEach(w => updated.add(w));
            return updated.size > 300 ? new Set(Array.from(updated).slice(-150)) : updated;
        });

        const totalC = newPuzzle.grid.length * newPuzzle.grid[0].length;
        const blackC = newPuzzle.grid.flat().filter(c => c.isBlack).length;
        const actualPct = Math.round((blackC / totalC) * 100);

        setAttemptSuccessMsg(`प्रयत्न #${toDevanagari(nextAttempt)}: ८,०००+ अधिकृत शब्दभांडार डेटाबेसमधून कोडे व क्लूज यशस्वीरीत्या तयार झाले (${master.theme} | काळे चौकोन: ${toDevanagari(actualPct)}%)`);
        setIsGenerating(false);
    };

    const handleAiGenerate = async () => {
        setIsGenerating(true);
        setAiError(null);
        setAttemptSuccessMsg(null);
        setShowSolution(false);
        setIsEditMode(false);
        setPuzzleSource('ai');
        const currentPuzzle = puzzleData;
        const currentAttempt = attemptCount;

        // Track previously used words to guarantee 100% diversity and fresh vocabulary across attempts
        const activeUsedWords = new Set<string>(usedWordsHistory);
        if (currentPuzzle?.clues?.across) {
            currentPuzzle.clues.across.forEach(c => { if (c.word) activeUsedWords.add(c.word); });
        }
        if (currentPuzzle?.clues?.down) {
            currentPuzzle.clues.down.forEach(c => { if (c.word) activeUsedWords.add(c.word); });
        }

        const currentSignature = currentPuzzle?.grid ? getGridMaskSignature(currentPuzzle.grid) : undefined;

        try {
            // 1. Direct AI / Dynamic Dense Crossword generation with guaranteed fresh words and Gemini AI clues
            try {
                const aiResult = await generateDenseCrosswordAI(
                    gridSize,
                    blackSquarePercentage,
                    puzzleLevel,
                    currentAttempt,
                    activeUsedWords,
                    selectedTheme,
                    currentSignature
                );
                if (aiResult && aiResult.grid && aiResult.grid.length > 0) {
                    const puzzle = await buildPuzzleFromAIGrid(aiResult.grid, aiResult.clues, gridSize);
                    setPuzzleData(puzzle);
                    setPuzzleVersion(v => v + 1);
                    setAttemptCount(prev => prev + 1);

                    // Cache AI clues in memory for real-time reference
                    aiResult.clues.forEach(c => {
                        if (c.word && c.clue) {
                            aiFetchedWordsCacheRef.current.set(c.word.trim(), c.clue.trim());
                        }
                    });

                    // Calculate overlap with previous puzzles & update history
                    const newWords = new Set<string>();
                    puzzle.clues.across.forEach(c => { if (c.word) newWords.add(c.word); });
                    puzzle.clues.down.forEach(c => { if (c.word) newWords.add(c.word); });
                    const overlapWords = [...newWords].filter(w => activeUsedWords.has(w));

                    setUsedWordsHistory(prev => {
                        const updated = new Set(prev);
                        newWords.forEach(w => updated.add(w));
                        return updated.size > 250 ? new Set(Array.from(updated).slice(-100)) : updated;
                    });

                    setAttemptSuccessMsg(`प्रयत्न #${toDevanagari(currentAttempt)}: Gemini AI द्वारे शब्द व अस्सल एआय क्लूज तयार झाले! (मागील कोड्यातील केवळ ${toDevanagari(overlapWords.length)} शब्द)`);
                    return;
                }
            } catch (_denseError) {
                // Fallback to word list generation
            }

            // 2. Fallback: generate word clues and build grid
            const newWordClues = await generateWordCluesFromAI(gridSize, blackSquarePercentage, currentPuzzle, puzzleLevel);
            setWordClues(newWordClues);
            const puzzle = generateCrosswordData(newWordClues, gridSize);
            setPuzzleData(puzzle);
            setPuzzleVersion(v => v + 1);
            setAttemptCount(prev => prev + 1);
            setAttemptSuccessMsg(`प्रयत्न #${toDevanagari(currentAttempt)}: Gemini AI शब्द व रचना तयार झाली!`);
        } catch (_error) {
            handleDatabaseGenerate();
        } finally {
            setIsGenerating(false);
        }
    };

    const handlePrint = async () => {
        const printElement = printContentRef.current;
        const page1Element = page1Ref.current;
        const page2Element = page2Ref.current;

        if (!printElement || !page1Element || !page2Element) return;

        setIsPrinting(true);
        setPdfSuccessMessage(null);

        printElement.classList.remove('hidden');
        printElement.classList.add('print-capture-active');

        try {
            // Ensure Devanagari fonts are fully loaded
            if ((document as any).fonts?.ready) {
                await (document as any).fonts.ready;
            }
            await new Promise(resolve => setTimeout(resolve, 150));

            // CRITICAL: Dynamically measure full actual rendered height so NO clue or solution is EVER cropped
            const p1Height = Math.max(1123, page1Element.scrollHeight, page1Element.offsetHeight);
            const p2Height = Math.max(1123, page2Element.scrollHeight, page2Element.offsetHeight);

            // Capture Page 1 (The Puzzle Page - Newspaper design matching sample)
            const canvas1 = await html2canvas(page1Element, {
                scale: 1.5, // 1.5 provides high-DPI crisp Marathi text without bloated memory
                useCORS: true,
                backgroundColor: '#ffffff',
                width: 794,
                height: p1Height,
                windowWidth: 794,
                windowHeight: p1Height,
                scrollY: 0,
                scrollX: 0,
            });

            // Capture Page 2 (The Solution Sheet - उत्तरतालिका)
            const canvas2 = await html2canvas(page2Element, {
                scale: 1.5,
                useCORS: true,
                backgroundColor: '#ffffff',
                width: 794,
                height: p2Height,
                windowWidth: 794,
                windowHeight: p2Height,
                scrollY: 0,
                scrollX: 0,
            });

            // CRITICAL OPTIMIZATION FOR LIGHTWEIGHT FILE SIZE (Kb मध्ये):
            const imgData1 = canvas1.toDataURL('image/jpeg', 0.72);
            const imgData2 = canvas2.toDataURL('image/jpeg', 0.72);

            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4',
                compress: true,
            });

            const pdfWidth = pdf.internal.pageSize.getWidth(); // 210mm
            const pdfHeight = pdf.internal.pageSize.getHeight(); // 297mm

            // Page 1: Newspaper Puzzle
            pdf.addImage(imgData1, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');

            // Page 2: Solution Sheet
            pdf.addPage();
            pdf.addImage(imgData2, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');

            // Compute file size in KB
            const arrayBuffer = pdf.output('arraybuffer');
            const sizeInKb = Math.round(arrayBuffer.byteLength / 1024);

            pdf.save('shabdavedh_crossword.pdf');

            setPdfSuccessMessage(`पीडीएफ यशस्वीरीत्या डाउनलोड झाली! आकार: ${toDevanagari(sizeInKb)} KB (लाईट व्हर्जन)`);
            setTimeout(() => {
                setPdfSuccessMessage(null);
            }, 6000);

        } catch (error) {
            console.error("PDF generation failed:", error);
            alert("PDF तयार करताना त्रुटी आली. कृपया पुन्हा प्रयत्न करा.");
        } finally {
            printElement.classList.add('hidden');
            printElement.classList.remove('print-capture-active');
            setIsPrinting(false);
        }
    };

    const handleToggleEditMode = () => {
        if (isEditMode) {
            // This is the "Cancel" action
            if (originalPuzzleData) {
                setPuzzleData(originalPuzzleData);
            }
            setOriginalPuzzleData(null);
            setIsEditMode(false);
        } else {
            // This is the "Edit" action, show the help modal first
            setShowEditHelpModal(true);
        }
    };

    const enterEditMode = () => {
        setShowEditHelpModal(false);
        if (puzzleData) {
            setOriginalPuzzleData(puzzleData);
            const placed = extractPlacedWordsFromGrid(puzzleData.grid);
            setOriginalWordsSet(new Set(placed.map(pw => pw.word.trim())));
            setIsEditMode(true);
        }
    };

    const handleApplyCustomClues = (newClues: WordClue[]) => {
        if (!puzzleData) return;
        const currentPlaced = extractPlacedWordsFromGrid(puzzleData.grid);
        const newCluesMap = new Map<string, string>();
        newClues.forEach(nc => {
            if (nc.word && nc.clue) newCluesMap.set(nc.word.trim(), nc.clue.trim());
        });

        const updatedWordClues: WordClue[] = currentPlaced.map(pw => {
            const word = pw.word.trim();
            const customClue = newCluesMap.get(word);
            let existingClue: string | undefined;
            if (puzzleData.clues) {
                const found = [...puzzleData.clues.across, ...puzzleData.clues.down].find(c => c.word === word);
                if (found && found.clue) existingClue = found.clue;
            }
            const dictClue = getMarathiWordClue(word);
            const finalClue = customClue || dictClue || existingClue || generateSmartMarathiClue(word);
            return {
                word,
                clue: sanitizeClue(word, finalClue)
            };
        });

        const newPuzzle = createPuzzleDataFromGrid(puzzleData.grid, updatedWordClues);
        setPuzzleData(newPuzzle);
        setPuzzleVersion(v => v + 1);
        setAttemptSuccessMsg(`${toDevanagari(newClues.length)} बदललेल्या शब्दांचे अचूक क्लूज लागू करण्यात आले!`);
    };

    const gridDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);

    const triggerAiClueGenerationForGrid = (grid: GridCell[][], changedWordsList: string[] = []) => {
        if (gridDebounceTimerRef.current) {
            clearTimeout(gridDebounceTimerRef.current);
        }

        gridDebounceTimerRef.current = setTimeout(async () => {
            const placedWordsRaw = extractPlacedWordsFromGrid(grid);
            const uniqueWords = Array.from(new Set(placedWordsRaw.map(pw => pw.word.trim()))).filter(w => w.length >= 2);
            if (uniqueWords.length === 0) return;

            // Target words needing AI clues: explicitly changed words or words missing cached AI clues
            const wordsToFetch = (changedWordsList.length > 0
                ? changedWordsList
                : uniqueWords
            ).filter(w => !aiFetchedWordsCacheRef.current.has(w));

            if (wordsToFetch.length === 0) return;

            setIsAiClueSyncing(true);
            try {
                const aiCluesList = await getCluesForWords(wordsToFetch, true); // forceAi: true
                if (!aiCluesList || aiCluesList.length === 0) return;

                aiCluesList.forEach(wc => {
                    if (wc.word && wc.clue && !isGenericClue(wc.clue)) {
                        const cleanWord = wc.word.trim();
                        const cleanClue = sanitizeClue(cleanWord, wc.clue);
                        aiFetchedWordsCacheRef.current.set(cleanWord, cleanClue);
                    }
                });

                setPuzzleData(currentPuzzle => {
                    if (!currentPuzzle) return null;
                    const currentPlaced = extractPlacedWordsFromGrid(currentPuzzle.grid);
                    const updatedWordClues: WordClue[] = currentPlaced.map(pw => {
                        const word = pw.word.trim();
                        const aiClue = aiFetchedWordsCacheRef.current.get(word);
                        let existingClue: string | undefined;
                        if (currentPuzzle.clues) {
                            const found = [...currentPuzzle.clues.across, ...currentPuzzle.clues.down].find(c => c.word === word);
                            if (found && found.clue && !isGenericClue(found.clue)) {
                                existingClue = found.clue;
                            }
                        }
                        const dictClue = getMarathiWordClue(word);
                        const smartClue = generateSmartMarathiClue(word);
                        // Priority: Newly fetched AI clue > Cached AI clue > Existing clue > Dictionary
                        const finalClue = aiClue || existingClue || dictClue || smartClue || '';
                        return {
                            word,
                            clue: sanitizeClue(word, finalClue),
                        };
                    });

                    return createPuzzleDataFromGrid(currentPuzzle.grid, updatedWordClues);
                });

                setPuzzleVersion(v => v + 1);
                setAiSyncSuccessMsg(`बदललेल्या ${toDevanagari(wordsToFetch.length)} शब्दांचे क्लूज Gemini AI द्वारे अद्यतनित झाले!`);
                setTimeout(() => setAiSyncSuccessMsg(null), 3500);
            } catch (_err) {
                console.warn('Auto AI clue update failed:', _err);
            } finally {
                setIsAiClueSyncing(false);
            }
        }, 350);
    };

    const handleGridChange = (newGrid: GridCell[][]) => {
        if (!puzzleData) return;

        // 1. Extract placed words currently formed on the new grid
        const placedWordsRaw = extractPlacedWordsFromGrid(newGrid);
        const currentActiveWords = new Set(placedWordsRaw.map(pw => pw.word.trim()));

        // 2. Identify words that were modified or newly formed on the grid
        const previousActiveWords = new Set([
            ...(puzzleData.clues?.across || []).map(c => c.word.trim()),
            ...(puzzleData.clues?.down || []).map(c => c.word.trim()),
        ]);
        const changedWords = placedWordsRaw
            .map(pw => pw.word.trim())
            .filter(w => w.length >= 2 && !previousActiveWords.has(w));

        // 3. Preserve existing clues ONLY for words that are STILL present on the new grid (clears old/removed words!)
        const existingCluesMap = new Map<string, string>();
        if (puzzleData.clues) {
            [...puzzleData.clues.across, ...puzzleData.clues.down].forEach(c => {
                const cleanW = (c.word || '').trim();
                if (cleanW && c.clue && currentActiveWords.has(cleanW)) {
                    existingCluesMap.set(cleanW, c.clue);
                }
            });
        }

        // 4. Build updated WordClue array with instant local dictionary clues or cached AI clues
        const wordClues: WordClue[] = placedWordsRaw.map(pw => {
            const cleanW = pw.word.trim();
            const cachedAi = aiFetchedWordsCacheRef.current.get(cleanW);
            const existingClue = existingCluesMap.get(cleanW);
            const dictClue = getMarathiWordClue(cleanW);
            const validClue = cachedAi || existingClue || dictClue || generateSmartMarathiClue(cleanW);
            return {
                word: cleanW,
                clue: sanitizeClue(cleanW, validClue),
            };
        });

        // 5. Create fresh PuzzleData with updated grid and clues immediately
        const updatedPuzzle = createPuzzleDataFromGrid(newGrid, wordClues);
        setPuzzleData(updatedPuzzle);
        setPuzzleVersion(v => v + 1);

        // 6. Trigger dedicated Gemini AI clue generation for edited/new grid words
        triggerAiClueGenerationForGrid(newGrid, changedWords);
    };

    const handleCluesChange = (newClues: Clues) => {
        // Save all updated word clues into memory and infinite lexicon database permanently
        [...newClues.across, ...newClues.down].forEach(c => {
            if (c.word && c.clue && c.clue.trim().length >= 2) {
                saveWordToInfiniteLexicon(c.word.trim(), c.clue.trim(), 'user_clue_edit');
            }
        });
        setPuzzleData(p => (p ? { ...p, clues: newClues } : null));
        setPuzzleVersion(v => v + 1);
    };

    const handleUpdatePuzzleFromGrid = async () => {
        if (!puzzleData) return;

        setIsUpdating(true);
        setIsEditMode(false);

        try {
            const placedWordsRaw = extractPlacedWordsFromGrid(puzzleData.grid);
            const uniqueWords: string[] = Array.from(new Set<string>(placedWordsRaw.map(pw => pw.word.trim()))).filter((w: string) => w.length >= 2);

            // 1. Clear existing clues state before generating new ones
            setPuzzleData(prev => prev ? { ...prev, clues: { across: [], down: [] } } : null);

            // 2. Ensure Gemini API call receives the latest updated array of Marathi words
            let aiCluesList: WordClue[] = [];
            try {
                aiCluesList = await getCluesForWords(uniqueWords, true); // forceAi: true
            } catch (_e) {
                // Fallback to local dictionary clues below
            }

            const currentCluesMap = new Map<string, string>();
            aiCluesList.forEach(wc => {
                if (wc.word && wc.clue && !isGenericClue(wc.clue)) {
                    currentCluesMap.set(wc.word.trim(), sanitizeClue(wc.word.trim(), wc.clue));
                }
            });

            // 3. Mapping returned clues directly to exact corresponding word and grid number
            const combinedWordClues: WordClue[] = uniqueWords.map(word => {
                const aiClue = currentCluesMap.get(word);
                const dictClue = getMarathiWordClue(word);
                const smartClue = generateSmartMarathiClue(word);
                const finalClue = aiClue || dictClue || smartClue || '';
                return {
                    word,
                    clue: sanitizeClue(word, finalClue),
                };
            });

            const newPuzzle = createPuzzleDataFromGrid(puzzleData.grid, combinedWordClues);
            setPuzzleData(newPuzzle);
            setPuzzleVersion(v => v + 1);
            setAttemptSuccessMsg(`कोडे यशस्वीरीत्या अद्यतनित झाले! ग्रिडवरील बदललेल्या सर्व ${toDevanagari(uniqueWords.length)} शब्दांचे एआय द्वारे अचूक मराठी क्लूज तयार केले गेले.`);

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'कोडे अद्यतनित करण्यात अयशस्वी झाले.';
            setAiError(errorMessage);
            if (originalPuzzleData) setPuzzleData(originalPuzzleData); // Revert on error
        } finally {
            setIsUpdating(false);
            setOriginalPuzzleData(null);
        }
    };

    const handleLoadManualPuzzle = (puzzle: PuzzleData) => {
        setPuzzleData(puzzle);
        setPuzzleVersion(v => v + 1);
        setActiveMode('auto');
        setAttemptSuccessMsg('मानवी पद्धतीने तयार केलेले कोडे सोडवण्यासाठी यशस्वीरीत्या लोड झाले!');
    };

    // Instant local dictionary clue sync for words on grid (Zero network calls during live typing)
    useEffect(() => {
        if (!puzzleData || !puzzleData.grid) return;
        const placedWords = extractPlacedWordsFromGrid(puzzleData.grid);
        if (placedWords.length === 0) return;

        let updated = false;
        const updatedCluesMap = new Map<string, string>();

        if (puzzleData.clues) {
            [...puzzleData.clues.across, ...puzzleData.clues.down].forEach(c => {
                if (c.word && c.clue) updatedCluesMap.set(c.word, c.clue);
            });
        }

        placedWords.forEach(pw => {
            const currentClue = updatedCluesMap.get(pw.word);
            if (!currentClue || isGenericClue(currentClue)) {
                const dictClue = getMarathiWordClue(pw.word) || generateSmartMarathiClue(pw.word);
                if (dictClue && dictClue !== currentClue) {
                    updatedCluesMap.set(pw.word, dictClue);
                    updated = true;
                }
            }
        });

        if (updated) {
            setPuzzleData(prev => {
                if (!prev || !prev.grid) return prev;
                const updateClueList = (list: typeof prev.clues.across) =>
                    list.map(c => {
                        if (c.word && updatedCluesMap.has(c.word)) {
                            return { ...c, clue: sanitizeClue(c.word, updatedCluesMap.get(c.word)!) };
                        }
                        return c;
                    });

                return {
                    ...prev,
                    clues: {
                        across: updateClueList(prev.clues.across),
                        down: updateClueList(prev.clues.down),
                    }
                };
            });
        }
    }, [puzzleData?.grid, puzzleVersion]);

    const handlePrintManualPuzzle = (puzzle: PuzzleData) => {
        setPuzzleData(puzzle);
        setPuzzleVersion(v => v + 1);
        setTimeout(() => {
            handlePrint();
        }, 300);
    };

    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-sans p-4 sm:p-6 lg:p-8">
            <div className="max-w-4xl mx-auto">
                <header className="text-center mb-6 no-print">
                    <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 dark:text-white flex items-center justify-center gap-3">
                        <PuzzleIcon className="w-10 h-10 text-indigo-500" />
                        एआय शब्दकोडे जनरेटर
                    </h1>
                    <p className="mt-2 text-base sm:text-lg text-slate-600 dark:text-slate-400">
                        वृत्तपत्र दर्जाचे मराठी शब्दकोडे तयार करा, स्वतः रचना करा किंवा AI द्वारे सोडवा व प्रिंट करा.
                    </p>

                    {/* Mode Navigation Bar */}
                    <div className="mt-6 inline-flex flex-wrap p-1.5 bg-slate-200 dark:bg-slate-800 rounded-2xl shadow-inner border border-slate-300 dark:border-slate-700 gap-1">
                        <button
                            type="button"
                            onClick={() => setActiveMode('auto')}
                            className={`px-4 sm:px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm md:text-base flex items-center gap-2 transition-all ${
                                activeMode === 'auto'
                                    ? 'bg-indigo-600 text-white shadow-md'
                                    : 'text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400'
                            }`}
                        >
                            <WandIcon className="w-4 h-4" />
                            <span>🤖 स्वयंचलित / एआय कोडे</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveMode('manual')}
                            className={`px-4 sm:px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm md:text-base flex items-center gap-2 transition-all ${
                                activeMode === 'manual'
                                    ? 'bg-indigo-600 text-white shadow-md'
                                    : 'text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400'
                            }`}
                        >
                            <PencilIcon className="w-4 h-4" />
                            <span>✍️ मानवी रचना स्टुडिओ (थेट टाईप करा)</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveMode('limca')}
                            className={`px-4 sm:px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm md:text-base flex items-center gap-2 transition-all ${
                                activeMode === 'limca'
                                    ? 'bg-gradient-to-r from-amber-600 via-yellow-600 to-amber-700 text-white shadow-md'
                                    : 'text-amber-800 dark:text-amber-300 hover:text-amber-600 dark:hover:text-amber-200 bg-amber-500/10'
                            }`}
                        >
                            <TrophyIcon className="w-4 h-4 text-amber-500" />
                            <span>🏆 १२५x१२५ लिमका विक्रम</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowVocabModal(true)}
                            className="px-4 sm:px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm md:text-base flex items-center gap-2 transition-all bg-emerald-600 hover:bg-emerald-700 text-white shadow-md cursor-pointer"
                            title={`एकत्रित ${toDevanagari(IMPORTED_VOCABULARY_WORDS.length)} शब्दभांडार सूची व निरिक्षक पहा`}
                        >
                            <span>📚 {toDevanagari(IMPORTED_VOCABULARY_WORDS.length)} शब्दभांडार निरिक्षक</span>
                        </button>
                    </div>
                </header>

                {activeMode === 'limca' ? (
                    <div className="no-print mb-8">
                        <LimcaRecordCrosswordStudio
                            onBackToNormal={() => setActiveMode('auto')}
                        />
                    </div>
                ) : activeMode === 'manual' ? (
                    <div className="no-print mb-8">
                        <ManualCrosswordStudio
                            onLoadIntoSolver={handleLoadManualPuzzle}
                            onPrintPuzzle={handlePrintManualPuzzle}
                            initialGridSize={gridSize}
                            currentAutoPuzzle={puzzleData}
                        />
                    </div>
                ) : (
                    <div className="no-print mb-8">
                        <WordInputForm
                            onAiGenerate={handleAiGenerate}
                            onDatabaseGenerate={handleDatabaseGenerate}
                            puzzleSource={puzzleSource}
                            isAiLoading={isGenerating}
                            aiError={aiError}
                            gridSize={gridSize}
                            setGridSize={handleGridSizeChange}
                            blackSquarePercentage={blackSquarePercentage}
                            setBlackSquarePercentage={setBlackSquarePercentage}
                            puzzleLevel={puzzleLevel}
                            setPuzzleLevel={setPuzzleLevel}
                            attemptCount={attemptCount}
                            attemptSuccessMsg={attemptSuccessMsg}
                            onShuffleMask={handleShuffleMask}
                            selectedTheme={selectedTheme}
                            setSelectedTheme={(theme) => {
                                setSelectedTheme(theme);
                                const nextAttempt = attemptCount + 1;
                                setAttemptCount(nextAttempt);
                                const currentWords = new Set<string>(usedWordsHistory);
                                if (puzzleData?.clues?.across) {
                                    puzzleData.clues.across.forEach(c => { if (c.word) currentWords.add(c.word); });
                                }
                                if (puzzleData?.clues?.down) {
                                    puzzleData.clues.down.forEach(c => { if (c.word) currentWords.add(c.word); });
                                }

                                const master = getThemedFreshPuzzle(theme, currentWords, nextAttempt, gridSize, undefined, blackSquarePercentage);
                                const newPuzzle = buildPuzzleFromMaster(master);
                                setPuzzleData(newPuzzle);
                                setPuzzleVersion(v => v + 1);

                                const newWords = new Set<string>();
                                newPuzzle.clues.across.forEach(c => { if (c.word) newWords.add(c.word); });
                                newPuzzle.clues.down.forEach(c => { if (c.word) newWords.add(c.word); });

                                setUsedWordsHistory(prev => {
                                    const updated = new Set(prev);
                                    newWords.forEach(w => updated.add(w));
                                    return updated.size > 300 ? new Set(Array.from(updated).slice(-150)) : updated;
                                });

                                setAttemptSuccessMsg(`थीम बदलली: ${master.theme} (पूर्ण नवीन शब्द लोड झाले)`);
                            }}
                            onOpenLimcaStudio={() => setActiveMode('limca')}
                        />
                    </div>
                )}

                <main>
                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 printable-area">
                        {puzzleData ? (
                            <>
                                {/* --- SCREEN VIEW --- */}
                                <div className="print:hidden">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                                        <div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">तुमचे शब्दकोडे</h2>
                                            </div>
                                            {(() => {
                                                const totalCells = puzzleData.grid.length * puzzleData.grid[0].length;
                                                const blackCells = puzzleData.grid.flat().filter(c => c.isBlack).length;
                                                const whiteCells = totalCells - blackCells;
                                                const actualBlackPercent = Math.round((blackCells / totalCells) * 100);
                                                const totalWords = puzzleData.clues.across.length + puzzleData.clues.down.length;
                                                return (
                                                    <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs">
                                                        <span className="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-300 font-semibold px-2 py-0.5 rounded">
                                                            एकूण शब्द: {totalWords} (आडवे {puzzleData.clues.across.length} + उभे {puzzleData.clues.down.length})
                                                        </span>
                                                        <span className={`font-semibold px-2 py-0.5 rounded ${
                                                            actualBlackPercent <= 20
                                                                ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300'
                                                                : 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300'
                                                        }`}>
                                                            काळे चौकोन: {actualBlackPercent}% ({blackCells}/{totalCells})
                                                        </span>
                                                        <span className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium px-2 py-0.5 rounded">
                                                            अक्षरे: {whiteCells}
                                                        </span>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                        {pdfSuccessMessage && (
                                            <div className="w-full mb-4 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 rounded-lg flex items-center justify-between text-sm shadow-sm transition-all animate-fadeIn">
                                                <div className="flex items-center gap-2.5">
                                                    <CheckIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                                                    <span className="font-semibold">{pdfSuccessMessage}</span>
                                                </div>
                                                <button
                                                    onClick={() => setPdfSuccessMessage(null)}
                                                    className="text-emerald-700 hover:text-emerald-950 dark:text-emerald-300 dark:hover:text-emerald-100 font-bold px-2 py-0.5 rounded text-xs hover:bg-emerald-100 dark:hover:bg-emerald-900/50"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        )}
                                        {/* Real-time Gemini AI Clue Sync Feedback */}
                                        {isAiClueSyncing && (
                                            <div className="w-full mb-3 p-2.5 bg-purple-50 dark:bg-purple-950/60 border border-purple-300 dark:border-purple-700 text-purple-900 dark:text-purple-200 rounded-lg flex items-center gap-2.5 text-xs font-semibold shadow-xs animate-pulse">
                                                <span className="inline-block w-2.5 h-2.5 rounded-full bg-purple-600 animate-ping"></span>
                                                <span>🤖 ग्रिडवरील बदललेल्या शब्दांचे क्लूज Gemini AI द्वारे आपोआप तयार होत आहेत...</span>
                                            </div>
                                        )}
                                        {aiSyncSuccessMsg && (
                                            <div className="w-full mb-3 p-2.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 rounded-lg flex items-center justify-between text-xs font-semibold shadow-xs animate-fadeIn">
                                                <div className="flex items-center gap-2">
                                                    <span>✨</span>
                                                    <span>{aiSyncSuccessMsg}</span>
                                                </div>
                                                <button
                                                    onClick={() => setAiSyncSuccessMsg(null)}
                                                    className="text-emerald-700 hover:text-emerald-900 text-xs font-bold"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        )}

                                        <PuzzleControls
                                            onToggleSolution={() => setShowSolution(!showSolution)}
                                            onPrint={handlePrint}
                                            showSolution={showSolution}
                                            isPrinting={isPrinting}
                                            isEditMode={isEditMode}
                                            isUpdating={isUpdating}
                                            onToggleEditMode={handleToggleEditMode}
                                            onUpdatePuzzle={handleUpdatePuzzleFromGrid}
                                            onOpenInManualStudio={() => setShowTransferToManualModal(true)}
                                        />
                                    </div>

                                    {/* Edit Mode Helper Banner */}
                                    {isEditMode && (
                                        <>
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-amber-50 dark:bg-amber-950/40 p-3.5 rounded-xl border border-amber-300 dark:border-amber-700/60 mb-4 shadow-xs animate-fadeIn">
                                                <div className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold text-amber-950 dark:text-amber-100">
                                                    <span className="p-1.5 bg-amber-200 dark:bg-amber-900 rounded-lg text-amber-900 dark:text-amber-200 text-base">✏️</span>
                                                    <span>थेट संपादन सुरू आहे: चौकोनावर क्लिक करून अक्षर टाईप करा किंवा काळे चौकोन बदला.</span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (puzzleData) {
                                                            const clearedGrid = puzzleData.grid.map(r => r.map(c => ({ ...c, letter: c.isBlack ? null : null })));
                                                            setPuzzleData({ ...puzzleData, grid: clearedGrid });
                                                        }
                                                    }}
                                                    className="px-3 py-1.5 bg-amber-200 dark:bg-amber-900 hover:bg-amber-300 dark:hover:bg-amber-800 text-amber-950 dark:text-amber-100 rounded-lg text-xs font-bold transition-colors shadow-2xs self-start sm:self-auto cursor-pointer"
                                                    title="काळ्या चौकटी जशाच्या तशा ठेवून सर्व अक्षरे साफ करा"
                                                >
                                                    🧹 सर्व अक्षरे पुसा (काळ्या चौकटी ठेवा)
                                                </button>
                                            </div>

                                            {/* Modified Words & Custom Clue Generator Panel */}
                                            <ModifiedWordsCluePanel
                                                placedWords={extractPlacedWordsFromGrid(puzzleData.grid)}
                                                originalWordsSet={originalWordsSet}
                                                currentCluesMap={
                                                    new Map([
                                                        ...(puzzleData.clues?.across || []).map(c => [c.word, c.clue] as [string, string]),
                                                        ...(puzzleData.clues?.down || []).map(c => [c.word, c.clue] as [string, string])
                                                    ])
                                                }
                                                onApplyClues={handleApplyCustomClues}
                                                onUpdatePuzzle={handleUpdatePuzzleFromGrid}
                                                isUpdating={isUpdating}
                                            />
                                        </>
                                    )}

                                    {/* Interactive Crossword Grid */}
                                    <div className="mx-auto mb-8 max-w-lg transition-all duration-200">

                                    <CrosswordGrid
                                        grid={puzzleData.grid}
                                        showSolution={showSolution}
                                        isEditMode={isEditMode}
                                        onGridChange={handleGridChange}
                                    />
                                    </div>

                                    <ClueList
                                        clues={puzzleData.clues}
                                        onCluesChange={handleCluesChange}
                                        showSolution={showSolution}
                                    />
                                </div>

                                {/* --- PRINT VIEW (for lightweight 2-page capture & print) --- */}
                                <div ref={printContentRef} key={puzzleVersion} className="hidden print:block pdf-print-wrapper bg-white">
                                    <PrintableShabdavedhPDF
                                        puzzleData={puzzleData}
                                        page1Ref={page1Ref}
                                        page2Ref={page2Ref}
                                        themeName={selectedTheme !== 'auto' ? THEME_OPTIONS.find(t => t.id === selectedTheme)?.name : undefined}
                                    />
                                </div>
                            </>
                        ) : (
                            <div className="text-center py-20 px-6 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                 {aiError && (
                                    <div className="max-w-md mx-auto bg-red-100 dark:bg-red-900/30 border-l-4 border-red-500 text-red-800 dark:text-red-200 p-4 rounded-md mb-8 text-left" role="alert">
                                        <div className="flex">
                                            <div className="py-1"><AlertTriangleIcon className="h-6 w-6 text-red-500 mr-4" /></div>
                                            <div>
                                                <p className="font-bold">एक त्रुटी आली</p>
                                                <p className="text-sm">{aiError}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <PuzzleIcon className="w-20 h-20 mx-auto text-slate-400 dark:text-slate-500" />
                                <h2 className="mt-4 text-2xl font-bold text-slate-700 dark:text-slate-300">तुमचे शब्दकोडे तयार करा</h2>
                                <p className="mt-2 text-slate-500 dark:text-slate-400">
                                  नवीन कोडे मिळवण्यासाठी वरील 'एआय वापरून कोडे मिळवा' बटणावर क्लिक करा.
                                </p>
                            </div>
                        )}
                    </div>
                </main>
             {/* Modal for transferring auto puzzle structure to Manual Studio */}
             {showTransferToManualModal && puzzleData && (
                 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
                     <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 max-w-lg w-full p-6 space-y-5">
                         <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-700 pb-4">
                             <span className="p-2.5 bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 rounded-2xl text-2xl">
                                 🎨
                             </span>
                             <div>
                                 <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                                     काळ्या चौकटींच्या चौकटीसह मानवी स्टुडिओत उघडा
                                 </h3>
                                 <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                     या स्वयंचलित कोड्याची काळी चौकट (Black Square Layout) जशीच्या तशी मानवी स्टुडिओमध्ये लोड केली जाईल.
                                 </p>
                             </div>
                         </div>

                         <div className="space-y-3">
                             <button
                                 type="button"
                                 onClick={() => handleOpenInManualStudio(true)}
                                 className="w-full text-left p-4 rounded-2xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 border-2 border-amber-400 dark:border-amber-700 transition-all group"
                             >
                                 <div className="flex items-center justify-between">
                                     <span className="font-bold text-amber-950 dark:text-amber-100 text-sm sm:text-base flex items-center gap-2">
                                         <span>✨ १. फक्त काळ्या चौकटी (अक्षरे साफ करून नवीन शब्द भरण्यासाठी)</span>
                                     </span>
                                     <span className="text-xs font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full">शिफारस केलेले</span>
                                 </div>
                                 <p className="text-xs text-amber-900/80 dark:text-amber-200/80 mt-1.5 leading-relaxed">
                                     या कोड्याची काळी चौकट तशीच ठेवून सर्व अक्षरे पुसली जातील. तयार काळ्या चौकटींच्या साच्यामध्ये तुम्ही तुमचे नवीन शब्द सोप्या पद्धतीने भरू शकता!
                                 </p>
                             </button>

                             <button
                                 type="button"
                                 onClick={() => handleOpenInManualStudio(false)}
                                 className="w-full text-left p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-900/60 dark:hover:bg-slate-900 border border-slate-300 dark:border-slate-700 transition-all group"
                             >
                                 <div className="font-bold text-slate-900 dark:text-white text-sm sm:text-base flex items-center gap-2">
                                     <span>📝 २. मूळ अक्षरे व काळ्या चौकटींसह लोड करा</span>
                                 </div>
                                 <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
                                     ह्यातील मूळ शब्द व काळ्या चौकटींसह कोडे मानवी स्टुडिओत उघडेल, तेथे आवश्यकतेनुसार अक्षरे किंवा काळे चौकोन बदलता येतील.
                                 </p>
                             </button>
                         </div>

                         <div className="flex justify-end pt-2">
                             <button
                                 type="button"
                                 onClick={() => setShowTransferToManualModal(false)}
                                 className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-slate-200 text-sm font-semibold rounded-xl transition-colors"
                             >
                                 रद्द करा
                             </button>
                         </div>
                     </div>
                 </div>
             )}

             <ImprovementModal
                isOpen={showEditHelpModal}
                onClose={enterEditMode}
            />

            <VocabularyInspectorModal
                isOpen={showVocabModal}
                onClose={() => setShowVocabModal(false)}
            />
            </div>
        </div>
    );
};

export default App;