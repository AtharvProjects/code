import React, { useState } from 'react';
import { Clues, Clue } from '../types';
import { getGraphemes } from '../services/crosswordService';
import { sanitizeClue, MARATHI_DICTIONARY, SMART_WORD_CLUES } from '../services/marathiDictionary';
import { getCluesForWords } from '../services/geminiService';
import { saveWordToInfiniteLexicon } from '../services/infiniteLexiconService';

interface ClueListProps {
    clues: Clues;
    className?: string;
    fontSizePt?: number;
    onCluesChange?: (newClues: Clues) => void;
    showSolution?: boolean;
}

const devanagariDigits = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];
export const toDevanagari = (num: number | null | undefined): string => {
    if (num === null || num === undefined || isNaN(num)) return '';
    return String(num).split('').map(digit => devanagariDigits[parseInt(digit, 10)] ?? digit).join('');
};

export const ClueList: React.FC<ClueListProps> = ({ 
    clues, 
    className, 
    fontSizePt,
    onCluesChange,
    showSolution = false 
}) => {
    // Clue font size mode: 'small' (13px), 'normal' (15px - user requested default), 'large' (17px)
    const [fontSizeMode, setFontSizeMode] = useState<'small' | 'normal' | 'large'>('normal');
    
    // Global edit mode toggle or single-clue inline editing
    const [isGlobalEditMode, setIsGlobalEditMode] = useState(false);
    const [editingClueId, setEditingClueId] = useState<string | null>(null); // e.g. 'across-1' or 'down-2'
    const [editText, setEditText] = useState('');
    const [saveToast, setSaveToast] = useState<string | null>(null);
    const [isGeneratingAiForWord, setIsGeneratingAiForWord] = useState<string | null>(null);
    const [isBatchAiUpdating, setIsBatchAiUpdating] = useState(false);

    // Track original clues backup for reset capability
    const [originalCluesBackup, setOriginalCluesBackup] = useState<Clues | null>(null);

    const fontStyles = {
        small: {
            itemSize: 'text-xs sm:text-sm',
            itemStyle: { fontSize: '13px', lineHeight: '1.45' },
            numberWidth: '22px',
            headerSize: 'text-sm font-bold',
        },
        normal: {
            itemSize: 'text-sm sm:text-base',
            itemStyle: { fontSize: '15px', lineHeight: '1.5' },
            numberWidth: '26px',
            headerSize: 'text-base font-bold',
        },
        large: {
            itemSize: 'text-base sm:text-lg',
            itemStyle: { fontSize: '17px', lineHeight: '1.55' },
            numberWidth: '30px',
            headerSize: 'text-lg font-bold',
        }
    };

    const currentFont = fontStyles[fontSizeMode];

    const startEditingClue = (direction: 'across' | 'down', clue: Clue) => {
        if (!originalCluesBackup) {
            setOriginalCluesBackup(JSON.parse(JSON.stringify(clues)));
        }
        setEditingClueId(`${direction}-${clue.number}`);
        setEditText(clue.clue || '');
    };

    const cancelEditing = () => {
        setEditingClueId(null);
        setEditText('');
    };

    const saveClueEdit = (direction: 'across' | 'down', clueNumber: number) => {
        if (!onCluesChange) return;
        const clean = editText.trim();
        if (!clean) return;

        // Find the target clue being edited
        const targetList = direction === 'across' ? clues.across : clues.down;
        const targetClueItem = targetList.find(c => c.number === clueNumber);
        if (targetClueItem && targetClueItem.word) {
            const cleanWord = targetClueItem.word.trim();
            // 1. Instantly update active runtime dictionaries
            MARATHI_DICTIONARY[cleanWord] = clean;
            SMART_WORD_CLUES[cleanWord] = clean;
            // 2. Persist to infinite learned lexicon storage
            saveWordToInfiniteLexicon(cleanWord, clean, 'user_clue_edit');
        }

        const updatedAcross = clues.across.map(c => 
            direction === 'across' && c.number === clueNumber ? { ...c, clue: clean } : c
        );
        const updatedDown = clues.down.map(c => 
            direction === 'down' && c.number === clueNumber ? { ...c, clue: clean } : c
        );

        const newClues: Clues = {
            across: updatedAcross,
            down: updatedDown,
        };

        onCluesChange(newClues);
        setEditingClueId(null);
        setEditText('');
        setSaveToast(`क्लू #${toDevanagari(clueNumber)} यशस्वीरीत्या जतन झाला!`);
        setTimeout(() => setSaveToast(null), 3000);
    };

    const handleFetchAiClueForSingleWord = async (word: string) => {
        if (!word) return;
        setIsGeneratingAiForWord(word);
        try {
            const fetched = await getCluesForWords([word], true); // forceAi: true
            if (fetched && fetched[0] && fetched[0].clue) {
                setEditText(sanitizeClue(word, fetched[0].clue));
                setSaveToast(`'${word}' साठी एआय क्लू तयार झाला!`);
            }
        } catch (e) {
            console.warn('Single word AI clue error:', e);
        } finally {
            setIsGeneratingAiForWord(null);
        }
    };

    const handleBatchAiUpdateAllClues = async () => {
        if (!onCluesChange) return;
        const allWords = [...clues.across, ...clues.down].map(c => c.word).filter(Boolean);
        if (allWords.length === 0) return;

        setIsBatchAiUpdating(true);
        try {
            const fetched = await getCluesForWords(allWords, true); // forceAi: true
            const aiCluesMap = new Map<string, string>();
            fetched.forEach(f => {
                if (f.word && f.clue) aiCluesMap.set(f.word, sanitizeClue(f.word, f.clue));
            });

            const updatedAcross = clues.across.map(c => ({
                ...c,
                clue: aiCluesMap.get(c.word) || c.clue
            }));
            const updatedDown = clues.down.map(c => ({
                ...c,
                clue: aiCluesMap.get(c.word) || c.clue
            }));

            onCluesChange({ across: updatedAcross, down: updatedDown });
            setSaveToast(`सर्व ${toDevanagari(allWords.length)} शब्दांचे एआय क्लूज अद्यतनित झाले!`);
        } catch (e) {
            console.warn('Batch AI update error:', e);
        } finally {
            setIsBatchAiUpdating(false);
        }
    };

    const handleResetAllClues = () => {
        if (originalCluesBackup && onCluesChange) {
            onCluesChange(JSON.parse(JSON.stringify(originalCluesBackup)));
            setSaveToast('मूळ क्लू पूर्ववत करण्यात आले!');
            setTimeout(() => setSaveToast(null), 3000);
        }
    };

    const handleBatchClueChange = (direction: 'across' | 'down', clueNumber: number, val: string) => {
        if (!onCluesChange) return;
        if (!originalCluesBackup) {
            setOriginalCluesBackup(JSON.parse(JSON.stringify(clues)));
        }

        const targetList = direction === 'across' ? clues.across : clues.down;
        const targetClueItem = targetList.find(c => c.number === clueNumber);
        if (targetClueItem && targetClueItem.word && val.trim().length >= 2) {
            const cleanWord = targetClueItem.word.trim();
            MARATHI_DICTIONARY[cleanWord] = val.trim();
            SMART_WORD_CLUES[cleanWord] = val.trim();
            saveWordToInfiniteLexicon(cleanWord, val.trim(), 'user_batch_clue_edit');
        }

        const updatedAcross = clues.across.map(c => 
            direction === 'across' && c.number === clueNumber ? { ...c, clue: val } : c
        );
        const updatedDown = clues.down.map(c => 
            direction === 'down' && c.number === clueNumber ? { ...c, clue: val } : c
        );
        onCluesChange({ across: updatedAcross, down: updatedDown });
    };

    const sortedAcrossClues = [...clues.across].sort((a, b) => a.number - b.number);
    const sortedDownClues = [...clues.down].sort((a, b) => a.number - b.number);

    return (
        <div className={`space-y-4 ${className || ''}`}>
            {/* Top Toolbar for Clues: Font Size Control & Editing Actions */}
            <div className="bg-slate-100 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3 shadow-xs">
                {/* Clue Section Label */}
                <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-1.5">
                        <span>📋</span>
                        <span>कोड्याच्या सूचना (Clues)</span>
                    </span>
                    <span className="text-xs bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-200 font-semibold px-2 py-0.5 rounded-full">
                        एकूण {toDevanagari(clues.across.length + clues.down.length)} शब्द
                    </span>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Font Size Selector */}
                    <div className="flex items-center gap-1.5">
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">फाँट आकार:</span>
                        <div className="inline-flex rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 p-0.5 text-xs">
                            <button
                                type="button"
                                onClick={() => setFontSizeMode('small')}
                                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                                    fontSizeMode === 'small'
                                        ? 'bg-indigo-600 text-white shadow-xs font-bold'
                                        : 'text-slate-700 dark:text-slate-200 hover:text-indigo-600'
                                }`}
                            >
                                लहान
                            </button>
                            <button
                                type="button"
                                onClick={() => setFontSizeMode('normal')}
                                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                                    fontSizeMode === 'normal'
                                        ? 'bg-indigo-600 text-white shadow-xs font-bold'
                                        : 'text-slate-700 dark:text-slate-200 hover:text-indigo-600'
                                }`}
                            >
                                सामान्य (Normal)
                            </button>
                            <button
                                type="button"
                                onClick={() => setFontSizeMode('large')}
                                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                                    fontSizeMode === 'large'
                                        ? 'bg-indigo-600 text-white shadow-xs font-bold'
                                        : 'text-slate-700 dark:text-slate-200 hover:text-indigo-600'
                                }`}
                            >
                                मोठा
                            </button>
                        </div>
                    </div>

                    {/* Clue Editing Actions */}
                    <div className="flex items-center gap-2">
                        {onCluesChange && (
                            <>
                                <button
                                    type="button"
                                    onClick={handleBatchAiUpdateAllClues}
                                    disabled={isBatchAiUpdating}
                                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 shadow-xs transition-all disabled:opacity-50"
                                    title="सर्व शब्दांचे एआयद्वारे नवीन क्लू तयार करा"
                                >
                                    <span>{isBatchAiUpdating ? '⌛' : '✨'}</span>
                                    <span>{isBatchAiUpdating ? 'एआय क्लू बनवत आहे...' : 'एआय क्लू अद्यतन करा'}</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setIsGlobalEditMode(!isGlobalEditMode)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs ${
                                        isGlobalEditMode
                                            ? 'bg-emerald-600 text-white ring-2 ring-emerald-400'
                                            : 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-600 hover:bg-slate-50'
                                    }`}
                                    title="क्लू संपादित करण्याची सुविधा"
                                >
                                    <span>{isGlobalEditMode ? '✓' : '✏️'}</span>
                                    <span>{isGlobalEditMode ? 'संपादन पूर्ण' : 'क्लू संपादन मोड'}</span>
                                </button>
                            </>
                        )}

                        {originalCluesBackup && onCluesChange && (
                            <button
                                type="button"
                                onClick={handleResetAllClues}
                                className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                title="मूळ सूचना पूर्ववत करा"
                            >
                                ↩️ मूळ क्लू
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Notification Toast */}
            {saveToast && (
                <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900/60 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-100 text-xs font-semibold rounded-lg flex items-center justify-between animate-fadeIn">
                    <span>✓ {saveToast}</span>
                    <button onClick={() => setSaveToast(null)} className="text-emerald-700 hover:text-emerald-950 font-bold px-1">✕</button>
                </div>
            )}

            {/* Layout: Two Columns Matching Newspaper Format (आडवे व उभे शब्द) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                
                {/* 1. Across Clues (आडवे शब्द) */}
                <div className="bg-white dark:bg-slate-800/90 p-4 sm:p-5 rounded-xl border border-red-200 dark:border-red-950/60 shadow-xs">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b-2 border-red-600 pb-2.5 mb-3.5">
                        <h3 className={`text-red-700 dark:text-red-400 flex items-center gap-2 ${currentFont.headerSize}`}>
                            <span className="text-red-600">➤</span>
                            <span>आडवे शब्द (Across)</span>
                        </h3>
                        <span className="text-xs bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300 font-bold px-2.5 py-0.5 rounded-full border border-red-200 dark:border-red-800">
                            {toDevanagari(clues.across.length)} शब्द
                        </span>
                    </div>

                    {/* Across Clue List */}
                    <ul className="space-y-2.5">
                        {sortedAcrossClues.length === 0 ? (
                            <li className="text-slate-400 italic py-2 text-sm">कोणतेही आडवे शब्द नाहीत</li>
                        ) : (
                            sortedAcrossClues.map((clue) => {
                                const aksharaCount = getGraphemes(clue.word || '').length;
                                const isEditingThis = editingClueId === `across-${clue.number}`;

                                return (
                                    <li 
                                        key={`across-${clue.number}`} 
                                        className={`group rounded-lg p-1.5 transition-colors border ${
                                            isEditingThis 
                                                ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700' 
                                                : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:border-slate-200 dark:hover:border-slate-700'
                                        }`}
                                    >
                                        {isEditingThis ? (
                                            /* Inline Single Clue Editor */
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-red-700 dark:text-red-400 text-sm">
                                                        ({toDevanagari(clue.number)})
                                                    </span>
                                                    {clue.word && (
                                                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">
                                                            उत्तर शब्द: <strong className="text-slate-800 dark:text-slate-200">{clue.word}</strong> ({toDevanagari(aksharaCount)} अक्षरे)
                                                        </span>
                                                    )}
                                                </div>
                                                <textarea
                                                    value={typeof editText === 'string' ? editText : ''}
                                                    onChange={(e) => setEditText(e.target.value)}
                                                    rows={2}
                                                    className="w-full p-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                                    autoFocus
                                                />
                                                <div className="flex items-center gap-2 justify-end">
                                                    {clue.word && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleFetchAiClueForSingleWord(clue.word)}
                                                            disabled={isGeneratingAiForWord === clue.word}
                                                            className="px-2.5 py-1 text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800 font-semibold rounded-md flex items-center gap-1 transition-all disabled:opacity-50"
                                                            title="या विशिष्ट शब्दासाठी एआय द्वारे नवीन क्लू शोधा"
                                                        >
                                                            <span>{isGeneratingAiForWord === clue.word ? '⌛' : '✨'}</span>
                                                            <span>{isGeneratingAiForWord === clue.word ? 'शोधत आहे...' : 'एआय क्लू मिळवा'}</span>
                                                        </button>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={cancelEditing}
                                                        className="px-2.5 py-1 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md"
                                                    >
                                                        रद्द करा
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => saveClueEdit('across', clue.number)}
                                                        className="px-3 py-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-md shadow-xs"
                                                    >
                                                        जतन करा
                                                    </button>
                                                </div>
                                            </div>
                                        ) : isGlobalEditMode ? (
                                            /* Batch / Quick Edit Input */
                                            <div className="flex items-start gap-2">
                                                <span className="font-bold text-red-700 dark:text-red-400 text-sm pt-1.5" style={{ minWidth: currentFont.numberWidth }}>
                                                    ({toDevanagari(clue.number)})
                                                </span>
                                                <div className="flex-1 space-y-1">
                                                    <input
                                                        type="text"
                                                        value={typeof clue.clue === 'string' ? clue.clue : ''}
                                                        onChange={(e) => handleBatchClueChange('across', clue.number, e.target.value)}
                                                        className="w-full px-2 py-1 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded focus:ring-1 focus:ring-indigo-500 focus:outline-none font-medium"
                                                    />
                                                    {clue.word && (
                                                        <span className="text-[11px] text-slate-400 dark:text-slate-500 block">
                                                            शब्द: {clue.word} ({toDevanagari(aksharaCount)})
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            /* Standard Newspaper Clue Display */
                                            <div 
                                                onClick={() => onCluesChange && startEditingClue('across', clue)}
                                                className="flex items-start justify-between gap-2 cursor-pointer hover:bg-amber-50/50 dark:hover:bg-slate-700/60 p-1 rounded-md transition-all"
                                                title="हा क्लू संपादित करण्यासाठी येथे दाबा"
                                            >
                                                <div className="flex items-start gap-2 flex-1">
                                                    {/* Clue Number */}
                                                    <span 
                                                        className="font-bold text-red-700 dark:text-red-400 flex-shrink-0 select-none text-right"
                                                        style={{ minWidth: currentFont.numberWidth }}
                                                    >
                                                        ({toDevanagari(clue.number)})
                                                    </span>

                                                    {/* Clue Text & Parentheses */}
                                                    <div className="text-slate-800 dark:text-slate-200 flex-1" style={currentFont.itemStyle}>
                                                        <span className="font-normal">{sanitizeClue(clue.word, clue.clue)}</span>
                                                        {aksharaCount > 0 && (
                                                            <span className="text-slate-500 dark:text-slate-400 font-medium ml-1.5 text-xs whitespace-nowrap">
                                                                ({toDevanagari(aksharaCount)})
                                                            </span>
                                                        )}
                                                        {showSolution && clue.word && (
                                                            <span className="ml-2 font-bold text-emerald-600 dark:text-emerald-400 text-xs bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                                                                [{clue.word}]
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Permanent Edit Button for Touch & Desktop */}
                                                {onCluesChange && (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            startEditingClue('across', clue);
                                                        }}
                                                        className="px-2 py-1 text-xs font-bold text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 border border-indigo-200 dark:border-indigo-800 rounded-md transition-all shrink-0 cursor-pointer"
                                                        title="हा क्लू संपादित करा"
                                                    >
                                                        ✏️ बदलावा
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </li>
                                );
                            })
                        )}
                    </ul>
                </div>

                {/* 2. Down Clues (उभे शब्द) */}
                <div className="bg-white dark:bg-slate-800/90 p-4 sm:p-5 rounded-xl border border-blue-200 dark:border-blue-950/60 shadow-xs">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b-2 border-blue-600 pb-2.5 mb-3.5">
                        <h3 className={`text-blue-700 dark:text-blue-400 flex items-center gap-2 ${currentFont.headerSize}`}>
                            <span className="text-blue-600">▼</span>
                            <span>उभे शब्द (Down)</span>
                        </h3>
                        <span className="text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 font-bold px-2.5 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
                            {toDevanagari(clues.down.length)} शब्द
                        </span>
                    </div>

                    {/* Down Clue List */}
                    <ul className="space-y-2.5">
                        {sortedDownClues.length === 0 ? (
                            <li className="text-slate-400 italic py-2 text-sm">कोणतेही उभे शब्द नाहीत</li>
                        ) : (
                            sortedDownClues.map((clue) => {
                                const aksharaCount = getGraphemes(clue.word || '').length;
                                const isEditingThis = editingClueId === `down-${clue.number}`;

                                return (
                                    <li 
                                        key={`down-${clue.number}`} 
                                        className={`group rounded-lg p-1.5 transition-colors border ${
                                            isEditingThis 
                                                ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700' 
                                                : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:border-slate-200 dark:hover:border-slate-700'
                                        }`}
                                    >
                                        {isEditingThis ? (
                                            /* Inline Single Clue Editor */
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-blue-700 dark:text-blue-400 text-sm">
                                                        ({toDevanagari(clue.number)})
                                                    </span>
                                                    {clue.word && (
                                                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">
                                                            उत्तर शब्द: <strong className="text-slate-800 dark:text-slate-200">{clue.word}</strong> ({toDevanagari(aksharaCount)} अक्षरे)
                                                        </span>
                                                    )}
                                                </div>
                                                <textarea
                                                    value={typeof editText === 'string' ? editText : ''}
                                                    onChange={(e) => setEditText(e.target.value)}
                                                    rows={2}
                                                    className="w-full p-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                                    autoFocus
                                                />
                                                <div className="flex items-center gap-2 justify-end">
                                                    {clue.word && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleFetchAiClueForSingleWord(clue.word)}
                                                            disabled={isGeneratingAiForWord === clue.word}
                                                            className="px-2.5 py-1 text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800 font-semibold rounded-md flex items-center gap-1 transition-all disabled:opacity-50"
                                                            title="या विशिष्ट शब्दासाठी एआय द्वारे नवीन क्लू शोधा"
                                                        >
                                                            <span>{isGeneratingAiForWord === clue.word ? '⌛' : '✨'}</span>
                                                            <span>{isGeneratingAiForWord === clue.word ? 'शोधत आहे...' : 'एआय क्लू मिळवा'}</span>
                                                        </button>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={cancelEditing}
                                                        className="px-2.5 py-1 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md"
                                                    >
                                                        रद्द करा
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => saveClueEdit('down', clue.number)}
                                                        className="px-3 py-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-md shadow-xs"
                                                    >
                                                        जतन करा
                                                    </button>
                                                </div>
                                            </div>
                                        ) : isGlobalEditMode ? (
                                            /* Batch / Quick Edit Input */
                                            <div className="flex items-start gap-2">
                                                <span className="font-bold text-blue-700 dark:text-blue-400 text-sm pt-1.5" style={{ minWidth: currentFont.numberWidth }}>
                                                    ({toDevanagari(clue.number)})
                                                </span>
                                                <div className="flex-1 space-y-1">
                                                    <input
                                                        type="text"
                                                        value={typeof clue.clue === 'string' ? clue.clue : ''}
                                                        onChange={(e) => handleBatchClueChange('down', clue.number, e.target.value)}
                                                        className="w-full px-2 py-1 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded focus:ring-1 focus:ring-indigo-500 focus:outline-none font-medium"
                                                    />
                                                    {clue.word && (
                                                        <span className="text-[11px] text-slate-400 dark:text-slate-500 block">
                                                            शब्द: {clue.word} ({toDevanagari(aksharaCount)})
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            /* Standard Newspaper Clue Display */
                                            <div 
                                                onClick={() => onCluesChange && startEditingClue('down', clue)}
                                                className="flex items-start justify-between gap-2 cursor-pointer hover:bg-amber-50/50 dark:hover:bg-slate-700/60 p-1 rounded-md transition-all"
                                                title="हा क्लू संपादित करण्यासाठी येथे दाबा"
                                            >
                                                <div className="flex items-start gap-2 flex-1">
                                                    {/* Clue Number */}
                                                    <span 
                                                        className="font-bold text-blue-700 dark:text-blue-400 flex-shrink-0 select-none text-right"
                                                        style={{ minWidth: currentFont.numberWidth }}>
                                                        ({toDevanagari(clue.number)})
                                                    </span>

                                                    {/* Clue Text & Parentheses */}
                                                    <div className="text-slate-800 dark:text-slate-200 flex-1" style={currentFont.itemStyle}>
                                                        <span className="font-normal">{sanitizeClue(clue.word, clue.clue)}</span>
                                                        {aksharaCount > 0 && (
                                                            <span className="text-slate-500 dark:text-slate-400 font-medium ml-1.5 text-xs whitespace-nowrap">
                                                                ({toDevanagari(aksharaCount)})
                                                            </span>
                                                        )}
                                                        {showSolution && clue.word && (
                                                            <span className="ml-2 font-bold text-emerald-600 dark:text-emerald-400 text-xs bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                                                                [{clue.word}]
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Permanent Edit Button for Touch & Desktop */}
                                                {onCluesChange && (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            startEditingClue('down', clue);
                                                        }}
                                                        className="px-2 py-1 text-xs font-bold text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 border border-indigo-200 dark:border-indigo-800 rounded-md transition-all shrink-0 cursor-pointer"
                                                        title="हा क्लू संपादित करा"
                                                    >
                                                        ✏️ बदलावा
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </li>
                                );
                            })
                        )}
                    </ul>
                </div>

            </div>
        </div>
    );
};
