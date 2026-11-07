import React, { useState } from 'react';
import { PlacedWord, WordClue } from '../types';
import { toDevanagari } from './PrintableShabdavedhPDF';
import { MARATHI_DICTIONARY, getMarathiWordClue, isGenericClue, sanitizeClue } from '../services/marathiDictionary';
import { getCluesForWords } from '../services/geminiService';
import { WandIcon, CheckIcon, LoaderIcon, BookOpenIcon, AlertTriangleIcon, RefreshCwIcon, PencilIcon } from './Icons';

interface ModifiedWordsCluePanelProps {
    placedWords: PlacedWord[];
    originalWordsSet: Set<string>;
    currentCluesMap: Map<string, string>;
    onApplyClues: (newClues: WordClue[]) => void;
    onUpdatePuzzle: () => void;
    isUpdating: boolean;
}

export const ModifiedWordsCluePanel: React.FC<ModifiedWordsCluePanelProps> = ({
    placedWords,
    originalWordsSet,
    currentCluesMap,
    onApplyClues,
    onUpdatePuzzle,
    isUpdating
}) => {
    const [isGenerating, setIsGenerating] = useState(false);
    const [singleWordLoading, setSingleWordLoading] = useState<string | null>(null);
    const [showAllWordsList, setShowAllWordsList] = useState(false);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);
    const [customWordInput, setCustomWordInput] = useState('');

    // 1. Extract unique active words from current grid
    const currentWordsList: string[] = Array.from(new Set<string>(placedWords.map(pw => pw.word.trim()))).filter((w: string) => w.length >= 2);

    // 2. Identify words that were edited/changed or are missing in standard dictionary
    const modifiedOrCustomWords: string[] = currentWordsList.filter((w: string) => {
        const isNewOrChanged = !originalWordsSet.has(w);
        const isNotInDict = !MARATHI_DICTIONARY[w];
        const currentClue = currentCluesMap.get(w);
        const hasMissingClue = !currentClue || isGenericClue(currentClue);
        return isNewOrChanged || isNotInDict || hasMissingClue;
    });

    // Handle single word AI clue request
    const handleGenerateClueForSingleWord = async (wordToFetch: string) => {
        const cleanWord = (wordToFetch || '').trim();
        if (!cleanWord || cleanWord.length < 2) return;

        setSingleWordLoading(cleanWord);
        setStatusMessage(`'${cleanWord}' या शब्दासाठी AI कडून स्वतंत्रपणे क्लू जनरेट केला जात आहे...`);

        try {
            const fetched = await getCluesForWords([cleanWord], true); // forceAi: true
            if (fetched && fetched.length > 0 && fetched[0].clue) {
                const sanitized = sanitizeClue(cleanWord, fetched[0].clue);
                if (sanitized) {
                    MARATHI_DICTIONARY[cleanWord] = sanitized;
                }
                onApplyClues(fetched);
                setStatusMessage(`✓ '${cleanWord}' साठी एआय क्लू यशस्वीरीत्या जनरेट होऊन लागू झाला: "${sanitized || fetched[0].clue}"`);
            } else {
                setStatusMessage(`'${cleanWord}' साठी क्लू स्थानिक शब्दकोशातून लागू केला.`);
            }
        } catch (_err) {
            setStatusMessage(`'${cleanWord}' चा क्लू मिळवताना त्रुटी आली. स्थानिक फॉलबॅक वापरला.`);
        } finally {
            setSingleWordLoading(null);
            setTimeout(() => setStatusMessage(null), 6000);
        }
    };

    // Handle "याचा अचूक क्लू बनवा व लागू करा" batch button click
    const handleGenerateCluesForModified = async () => {
        const targetWords = modifiedOrCustomWords.length > 0 ? modifiedOrCustomWords : currentWordsList;
        if (targetWords.length === 0) return;

        setIsGenerating(true);
        setStatusMessage(`एआय द्वारे ${toDevanagari(targetWords.length)} बदलांचे / नवीन शब्दांचे स्वतंत्र क्लूज बनवले जात आहेत...`);

        try {
            // Force AI generation for these specific words
            const generatedClues = await getCluesForWords(targetWords, true);

            if (generatedClues && generatedClues.length > 0) {
                // Also update runtime MARATHI_DICTIONARY so these custom words persist
                generatedClues.forEach(gc => {
                    if (gc.word && gc.clue) {
                        const cleanWord = gc.word.trim();
                        const sanitized = sanitizeClue(cleanWord, gc.clue);
                        if (sanitized) {
                            MARATHI_DICTIONARY[cleanWord] = sanitized;
                        }
                    }
                });

                onApplyClues(generatedClues);
                setStatusMessage(`✓ ${toDevanagari(targetWords.length)} बदलेल्या शब्दांचे अचूक क्लूज AI द्वारे यशस्वीरीत्या तयार होऊन लागू झाले!`);
            } else {
                setStatusMessage('स्थानिक शब्दकोशातील क्लूज लागू करण्यात आले.');
            }
        } catch (_err) {
            setStatusMessage('क्लूज तयार करताना त्रुटी आली. स्थानिक शब्दकोशातील क्लूज वापरले.');
        } finally {
            setIsGenerating(false);
            setTimeout(() => setStatusMessage(null), 6000);
        }
    };

    // Handle submitting custom word search
    const handleCustomWordSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (customWordInput.trim()) {
            handleGenerateClueForSingleWord(customWordInput.trim());
            setCustomWordInput('');
        }
    };

    return (
        <div className="bg-amber-50/90 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-700/80 rounded-xl p-4 my-4 shadow-md transition-all">
            {/* Header & Primary Batch AI Button */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-amber-200 dark:border-amber-800">
                <div className="flex items-center gap-2">
                    <span className="p-2 bg-amber-500 text-white rounded-lg shadow-xs">
                        <PencilIcon className="w-5 h-5" />
                    </span>
                    <div>
                        <h3 className="text-base font-bold text-amber-950 dark:text-amber-100 flex items-center gap-2">
                            <span>बदललेले व नवीन शब्द निरिक्षक (AI क्लू जनरेटर)</span>
                            <span className="px-2 py-0.5 text-xs font-bold bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100 rounded-full">
                                {toDevanagari(modifiedOrCustomWords.length)} शब्द बदलले/नवीन
                            </span>
                        </h3>
                        <p className="text-xs text-amber-800 dark:text-amber-300">
                            शब्दकोशात नसलेल्या वा बदललेल्या शब्दांचे मागणीनुसार स्वतंत्र एआय (Gemini AI) क्लूज बनवा
                        </p>
                    </div>
                </div>

                {/* Primary Action Button: "याचा अचूक क्लू बनवा व लागू करा" */}
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={handleGenerateCluesForModified}
                        disabled={isGenerating || isUpdating || currentWordsList.length === 0}
                        title="बदललेल्या सर्व शब्दांसाठी एआय द्वारे नवीन अचूक क्लूज तयार करून लागू करा"
                        className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-amber-600 hover:from-purple-700 hover:to-amber-700 text-white font-bold text-sm rounded-lg shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 transition-all transform active:scale-95 cursor-pointer"
                    >
                        {isGenerating ? (
                            <LoaderIcon className="w-5 h-5 animate-spin" />
                        ) : (
                            <WandIcon className="w-5 h-5 text-amber-200 animate-pulse" />
                        )}
                        <span>
                            {isGenerating
                                ? 'एआय क्लू तयार होत आहेत...'
                                : modifiedOrCustomWords.length > 0
                                    ? `या ${toDevanagari(modifiedOrCustomWords.length)} बदललेल्या शब्दांचे AI क्लू बनवा व लागू करा`
                                    : 'याचा अचूक AI क्लू बनवा व लागू करा'}
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={onUpdatePuzzle}
                        disabled={isUpdating || isGenerating}
                        className="flex items-center gap-1.5 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold text-sm rounded-lg shadow-md transition-colors disabled:opacity-50 cursor-pointer"
                    >
                        {isUpdating ? <LoaderIcon className="w-5 h-5 animate-spin" /> : <CheckIcon className="w-5 h-5" />}
                        <span>कोडे अद्यतन करा</span>
                    </button>
                </div>
            </div>

            {/* Direct AI Word Search / Definition Box */}
            <div className="mt-3 bg-white/80 dark:bg-slate-800/80 p-2.5 rounded-lg border border-amber-200 dark:border-amber-800/80">
                <form onSubmit={handleCustomWordSearchSubmit} className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1 shrink-0">
                        <WandIcon className="w-4 h-4 text-purple-600" />
                        <span>कोणत्याही शब्दाचा स्वतंत्र AI क्लू शोधा:</span>
                    </span>
                    <input
                        type="text"
                        value={customWordInput}
                        onChange={(e) => setCustomWordInput(e.target.value)}
                        placeholder="उदा. करामत, काजवा, संप, आंदोलन..."
                        className="flex-1 min-w-[180px] px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    />
                    <button
                        type="submit"
                        disabled={!customWordInput.trim() || !!singleWordLoading}
                        className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-md shadow-xs disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                    >
                        {singleWordLoading === customWordInput.trim() ? <LoaderIcon className="w-3.5 h-3.5 animate-spin" /> : '✨'}
                        <span>AI द्वारे क्लू जनरेट करा</span>
                    </button>
                </form>
            </div>

            {/* Notification / Toast feedback banner */}
            {statusMessage && (
                <div className="mt-3 p-2.5 bg-indigo-100 dark:bg-indigo-900/60 border border-indigo-300 dark:border-indigo-700 text-indigo-900 dark:text-indigo-100 text-xs font-semibold rounded-lg flex items-center justify-between animate-fadeIn">
                    <span className="flex items-center gap-2">
                        <WandIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                        <span>{statusMessage}</span>
                    </span>
                </div>
            )}

            {/* List of Modified / Custom Words */}
            <div className="mt-3">
                <div className="text-xs font-bold text-amber-900 dark:text-amber-200 mb-2 flex items-center justify-between">
                    <span>स्वतंत्ररित्या दर्शवलेले बदललेले शब्द:</span>
                    <button
                        type="button"
                        onClick={() => setShowAllWordsList(prev => !prev)}
                        className="text-indigo-700 dark:text-indigo-300 hover:underline flex items-center gap-1 text-xs font-medium cursor-pointer"
                    >
                        <BookOpenIcon className="w-4 h-4" />
                        <span>{showAllWordsList ? 'बदललेले शब्दच दाखवा' : `वापरल्या जाणाऱ्या सर्व (${toDevanagari(currentWordsList.length)}) शब्दांची यादी`}</span>
                    </button>
                </div>

                {/* Display Chips/Cards of Modified Words */}
                {!showAllWordsList ? (
                    modifiedOrCustomWords.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                            {modifiedOrCustomWords.map((word) => {
                                const isNew = !originalWordsSet.has(word);
                                const isNotInDict = !MARATHI_DICTIONARY[word];
                                const currentClue = currentCluesMap.get(word);
                                const hasClue = currentClue && !isGenericClue(currentClue);
                                const isLoadingThis = singleWordLoading === word;

                                return (
                                    <div
                                        key={word}
                                        className="bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-800/60 rounded-lg p-2.5 shadow-xs flex flex-col justify-between gap-2"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-black text-amber-950 dark:text-amber-100">
                                                [{word}]
                                            </span>
                                            <span
                                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                                    isNew
                                                        ? 'bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200 border border-purple-300'
                                                        : isNotInDict
                                                        ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 border border-amber-300'
                                                        : 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200 border border-indigo-300'
                                                }`}
                                            >
                                                {isNew ? 'नवीन बदललेला शब्द' : isNotInDict ? 'शब्दकोशात नाही' : 'क्लू अद्यतन आवश्यक'}
                                            </span>
                                        </div>

                                        <p className="text-xs text-slate-600 dark:text-slate-300 italic truncate" title={currentClue || 'क्लू प्रतिक्षेत आहे'}>
                                            {hasClue ? `क्लू: ${currentClue}` : '⚡ क्लू मिळवण्यासाठी खालील बटण दाबा'}
                                        </p>

                                        {/* Per-word AI Call Button */}
                                        <div className="flex items-center justify-end border-t border-slate-100 dark:border-slate-700/60 pt-1.5">
                                            <button
                                                type="button"
                                                onClick={() => handleGenerateClueForSingleWord(word)}
                                                disabled={isLoadingThis || isGenerating}
                                                className="px-2.5 py-1 text-[11px] font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800 rounded flex items-center gap-1 transition-all disabled:opacity-50 cursor-pointer"
                                                title={`'${word}' साठी Gemini AI द्वारे स्वतंत्र क्लू जनरेट करा`}
                                            >
                                                {isLoadingThis ? <LoaderIcon className="w-3 h-3 animate-spin" /> : <WandIcon className="w-3 h-3 text-purple-600" />}
                                                <span>{isLoadingThis ? 'जनरेट होत आहे...' : '✨ AI क्लू जनरेट करा'}</span>
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="p-3 bg-green-100/70 dark:bg-green-950/40 border border-green-300 dark:border-green-800 rounded-lg text-xs font-medium text-green-900 dark:text-green-200 flex items-center gap-2">
                            <CheckIcon className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" />
                            <span>ग्रिडवरील सर्व शब्दांचे अचूक क्लूज उपलब्ध व जुळलेले आहेत! नवीन शब्द बदलल्यास येथे स्वतंत्रपणे दिसतील.</span>
                        </div>
                    )
                ) : (
                    /* Full List of Words Used in Crossword */
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700/60">
                        <div className="pb-2 mb-2 font-bold text-xs text-slate-700 dark:text-slate-300 flex justify-between">
                            <span>वापरल्या जाणाऱ्या सर्व शब्दांची संपूर्ण यादी</span>
                            <span>एकूण: {toDevanagari(currentWordsList.length)} शब्द</span>
                        </div>
                        {placedWords.map((pw, idx) => {
                            const word = pw.word.trim();
                            const rawClue = currentCluesMap.get(word) || getMarathiWordClue(word) || 'क्लू उपलब्ध नाही';
                            const clue = sanitizeClue(word, rawClue) || rawClue;
                            const isModified = modifiedOrCustomWords.includes(word);
                            const isLoadingThis = singleWordLoading === word;

                            return (
                                <div key={`${pw.direction}-${pw.number}-${word}-${idx}`} className="py-1.5 flex items-center justify-between text-xs gap-2">
                                    <div className="flex items-center gap-2 shrink-0">
                                        <span className="font-bold text-slate-500 dark:text-slate-400 w-12">
                                            ({toDevanagari(pw.number)}) {pw.direction === 'across' ? 'आडवा' : 'उभा'}
                                        </span>
                                        <span className={`font-black px-1.5 py-0.5 rounded ${isModified ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-100' : 'text-indigo-900 dark:text-indigo-200'}`}>
                                            {word}
                                        </span>
                                    </div>
                                    <span className="text-slate-600 dark:text-slate-300 truncate flex-1 text-right">
                                        {clue}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => handleGenerateClueForSingleWord(word)}
                                        disabled={isLoadingThis}
                                        className="px-2 py-0.5 text-[10px] font-bold bg-purple-50 hover:bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-200 border border-purple-200 dark:border-purple-800 rounded shrink-0 cursor-pointer disabled:opacity-50"
                                        title={`'${word}' साठी स्वतंत्र AI कॉल करा`}
                                    >
                                        {isLoadingThis ? '⌛' : '✨ AI'}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};
