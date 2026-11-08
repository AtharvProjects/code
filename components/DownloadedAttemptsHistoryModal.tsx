import React, { useState, useMemo } from 'react';
import {
    getDownloadedPuzzlesHistory,
    getBlockedWords,
    getFreedWords,
    getDownloadedHistoryStats,
    clearDownloadedPuzzlesHistory,
    DownloadedPuzzleRecord
} from '../services/downloadedHistoryService';
import { toDevanagari } from './PrintableShabdavedhPDF';
import { XIcon, SearchIcon, CheckIcon, BookOpenIcon } from './Icons';

interface DownloadedAttemptsHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const DownloadedAttemptsHistoryModal: React.FC<DownloadedAttemptsHistoryModalProps> = ({
    isOpen,
    onClose
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedAttempt, setExpandedAttempt] = useState<number | null>(null);
    const [confirmReset, setConfirmReset] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const history = useMemo(() => getDownloadedPuzzlesHistory(), [isOpen, refreshTrigger]);
    const stats = useMemo(() => getDownloadedHistoryStats(), [isOpen, refreshTrigger]);
    const blockedWordsSet = useMemo(() => getBlockedWords(), [isOpen, refreshTrigger]);
    const freedWordsSet = useMemo(() => getFreedWords(), [isOpen, refreshTrigger]);

    // Word search query analysis
    const wordSearchResult = useMemo(() => {
        const clean = searchTerm.trim();
        if (!clean) return null;
        
        // Find which attempts contain this word
        const matchingAttempts: { attemptNumber: number; dateFormatted: string; isWithinWindow: boolean }[] = [];
        const total = history.length;
        
        history.forEach((record, index) => {
            if (record.words.includes(clean)) {
                // If index is within the last 100 attempts (total - 100 <= index)
                const isWithinWindow = (total - 100) <= index;
                matchingAttempts.push({
                    attemptNumber: record.attemptNumber,
                    dateFormatted: record.dateFormatted,
                    isWithinWindow
                });
            }
        });

        const isBlocked = blockedWordsSet.has(clean);
        const isFreed = freedWordsSet.has(clean);

        return {
            word: clean,
            isBlocked,
            isFreed,
            matchingAttempts
        };
    }, [searchTerm, history, blockedWordsSet, freedWordsSet]);

    const filteredHistory = useMemo(() => {
        if (!searchTerm.trim()) return history.slice().reverse();
        const q = searchTerm.trim();
        return history.filter(h =>
            String(h.attemptNumber).includes(q) ||
            h.dateFormatted.includes(q) ||
            h.theme.includes(q) ||
            h.words.some(w => w.includes(q))
        ).reverse();
    }, [history, searchTerm]);

    const handleClearHistory = () => {
        clearDownloadedPuzzlesHistory();
        setConfirmReset(false);
        setRefreshTrigger(t => t + 1);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-50/80 dark:bg-slate-900/40">
                    <div className="flex items-center gap-3">
                        <span className="p-2.5 bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 rounded-2xl text-2xl">
                            🛡️
                        </span>
                        <div>
                            <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <span>१०० प्रयत्न शब्द संरक्षण व डाऊनलोड इतिहास</span>
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                नियम: मागील डाऊनलोड केलेल्या कोड्यांतील एकही शब्द १०० नवीन डाऊनलोड प्रयत्नांपर्यंत दुबार वापरला जात नाही.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                        <XIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* Stat Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-5 border-b border-slate-200 dark:border-slate-700 bg-slate-100/40 dark:bg-slate-800/60">
                    <div className="p-3 bg-white dark:bg-slate-700/60 rounded-2xl border border-slate-200 dark:border-slate-600 shadow-xs">
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">एकूण डाऊनलोड</div>
                        <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
                            {toDevanagari(stats.totalDownloadedCount)}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">अधिकृत प्रयत्न</div>
                    </div>
                    <div className="p-3 bg-white dark:bg-slate-700/60 rounded-2xl border border-rose-200 dark:border-rose-900/60 shadow-xs">
                        <div className="text-xs text-rose-600 dark:text-rose-400 font-medium">सुरक्षित शब्द</div>
                        <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-0.5">
                            {toDevanagari(stats.blockedWordsCount)}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">मागील १०० प्रयत्नांतील</div>
                    </div>
                    <div className="p-3 bg-white dark:bg-slate-700/60 rounded-2xl border border-emerald-200 dark:border-emerald-900/60 shadow-xs">
                        <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">मुक्त झालेले शब्द</div>
                        <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                            {toDevanagari(stats.freedWordsCount)}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">१०० प्रयत्नांनंतर उपलब्ध</div>
                    </div>
                    <div className="p-3 bg-white dark:bg-slate-700/60 rounded-2xl border border-purple-200 dark:border-purple-900/60 shadow-xs">
                        <div className="text-xs text-purple-600 dark:text-purple-400 font-medium">चालू प्रयत्न</div>
                        <div className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-0.5">
                            #{toDevanagari(stats.currentAttemptNumber)}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">पुढील डाऊनलोड</div>
                    </div>
                </div>

                {/* Search / Word Inspector */}
                <div className="p-5 border-b border-slate-200 dark:border-slate-700 space-y-3">
                    <div className="relative">
                        <SearchIcon className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="कोणताही शब्द तपासा (उदा. 'शहाजी', 'भारत') किंवा प्रयत्न क्र. शोधा..."
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                        />
                        {searchTerm && (
                            <button
                                type="button"
                                onClick={() => setSearchTerm('')}
                                className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            >
                                साफ करा
                            </button>
                        )}
                    </div>

                    {/* Word status feedback banner */}
                    {wordSearchResult && (
                        <div className={`p-3 rounded-xl border text-xs leading-relaxed flex items-start gap-2.5 ${
                            wordSearchResult.isBlocked
                                ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                                : wordSearchResult.isFreed
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                                : 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800 text-blue-900 dark:text-blue-200'
                        }`}>
                            <span className="text-base">
                                {wordSearchResult.isBlocked ? '🔒' : wordSearchResult.isFreed ? '🔓' : '✨'}
                            </span>
                            <div className="space-y-1">
                                <div className="font-bold">
                                    शब्द: &lsquo;{wordSearchResult.word}&rsquo;
                                    {wordSearchResult.isBlocked && ' — सध्या सुरक्षित व राखीव (मागील १०० डाऊनलोडमध्ये वापरलेला)'}
                                    {wordSearchResult.isFreed && ' — १०० प्रयत्नांनंतर वापरण्यासाठी मुक्त झाला आहे!'}
                                    {!wordSearchResult.isBlocked && !wordSearchResult.isFreed && ' — पूर्णपणे उपलब्ध व नवीन (कधीही वापरलेला नाही)'}
                                </div>
                                {wordSearchResult.matchingAttempts.length > 0 && (
                                    <div className="text-[11px] opacity-90">
                                        वापरलेला प्रयत्न:{' '}
                                        {wordSearchResult.matchingAttempts.map((m, idx) => (
                                            <span key={idx} className="font-semibold mr-2">
                                                प्रयत्न #{toDevanagari(m.attemptNumber)} ({m.dateFormatted})
                                                {m.isWithinWindow ? ' [सध्या राखीव]' : ' [१०० प्रयत्न पूर्ण - मुक्त]'}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* History List */}
                <div className="flex-1 overflow-y-auto p-5 space-y-3">
                    {filteredHistory.length === 0 ? (
                        <div className="text-center py-12 text-slate-400 dark:text-slate-500">
                            <BookOpenIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p className="text-sm font-semibold">अजून एकही कोडे डाऊनलोड केलेले नाही.</p>
                            <p className="text-xs mt-1">
                                जेव्हा तुम्ही &lsquo;डाउनलोड PDF&rsquo; कराल तेव्हा तो अधिकृत &lsquo;प्रयत्न&rsquo; म्हणून येथे नोंदवला जाईल व त्याचे शब्द पुढील १०० प्रयत्नांसाठी सुरक्षित केले जातील.
                            </p>
                        </div>
                    ) : (
                        filteredHistory.map((item) => {
                            const isExpanded = expandedAttempt === item.attemptNumber;
                            const isWithinLast100 = (history.length - 100) <= (item.attemptNumber - 1);

                            return (
                                <div
                                    key={item.id}
                                    className={`rounded-2xl border p-4 transition-all ${
                                        isWithinLast100
                                            ? 'bg-white dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 hover:border-indigo-300'
                                            : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 opacity-80'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <span className={`px-2.5 py-1 rounded-xl text-xs font-bold border ${
                                                isWithinLast100
                                                    ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                                                    : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                                            }`}>
                                                प्रयत्न #{toDevanagari(item.attemptNumber)}
                                            </span>
                                            <div>
                                                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                                    <span>{item.gridSize}x{item.gridSize} {item.theme}</span>
                                                    <span className="text-[10px] font-normal text-slate-400">({toDevanagari(item.wordCount)} शब्द)</span>
                                                </div>
                                                <div className="text-[10px] text-slate-400 mt-0.5">
                                                    डाऊनलोड वेळ: {item.dateFormatted}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                                isWithinLast100
                                                    ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                                                    : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                                            }`}>
                                                {isWithinLast100 ? '🔒 १०० प्रयत्नांत सुरक्षित' : '🔓 वापरण्यास मुक्त'}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => setExpandedAttempt(isExpanded ? null : item.attemptNumber)}
                                                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline px-2 py-1"
                                            >
                                                {isExpanded ? 'कमी करा' : 'शब्द पहा'}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Expandable words list */}
                                    {isExpanded && (
                                        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-600/60">
                                            <div className="text-xs font-bold text-slate-600 dark:text-slate-300 mb-2">
                                                या कोड्यातील वापरलेले शब्द ({toDevanagari(item.words.length)}):
                                            </div>
                                            <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
                                                {item.words.map((w, wIdx) => {
                                                    const isCurrentlyBlocked = blockedWordsSet.has(w);
                                                    return (
                                                        <span
                                                            key={wIdx}
                                                            className={`text-xs px-2 py-0.5 rounded-lg border font-medium ${
                                                                isCurrentlyBlocked
                                                                    ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900/60'
                                                                    : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/60'
                                                            }`}
                                                            title={isCurrentlyBlocked ? 'सध्या १०० प्रयत्नांत सुरक्षित (वापरता येणार नाही)' : '१०० प्रयत्न पूर्ण झाल्याने मुक्त झाला आहे'}
                                                        >
                                                            {w}
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/40 flex items-center justify-between">
                    <div>
                        {confirmReset ? (
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-rose-600">नक्की सर्व इतिहास साफ करायचा?</span>
                                <button
                                    type="button"
                                    onClick={handleClearHistory}
                                    className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition-colors"
                                >
                                    होय, साफ करा
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setConfirmReset(false)}
                                    className="px-2.5 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-lg transition-colors"
                                >
                                    नाही
                                </button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setConfirmReset(true)}
                                className="text-xs text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 font-semibold transition-colors"
                            >
                                इतिहास रीसेट करा
                            </button>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-md transition-colors"
                    >
                        बंद करा
                    </button>
                </div>
            </div>
        </div>
    );
};

