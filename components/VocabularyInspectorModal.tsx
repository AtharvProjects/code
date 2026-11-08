import React, { useState, useMemo } from 'react';
import { IMPORTED_VOCABULARY_MAP, IMPORTED_VOCABULARY_WORDS } from '../services/importedVocabularyDatabase';
import { getLearnedLexiconStats, exportInfiniteLexiconJSON, getTotalAuthenticWordsCount } from '../services/infiniteLexiconService';
import { MARATHI_14_CATEGORIES, get14CategoryBreakdownStats } from '../services/marathiCategoriesDatabase';
import { toDevanagari } from './PrintableShabdavedhPDF';
import { BookOpenIcon, CheckIcon, SearchIcon, WandIcon } from './Icons';

interface VocabularyInspectorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectWord?: (word: string, clue: string) => void;
}

export const VocabularyInspectorModal: React.FC<VocabularyInspectorModalProps> = ({
    isOpen,
    onClose,
    onSelectWord
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [lengthFilter, setLengthFilter] = useState<'all' | '2' | '3' | '4' | '5+'>('all');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [isStrictEnabled, setIsStrictEnabled] = useState<boolean>(() => {
        try {
            return localStorage.getItem('strict8kLexiconMode') !== 'false';
        } catch (_e) {
            return true;
        }
    });
    const [copiedWord, setCopiedWord] = useState<string | null>(null);

    const toggleStrict = () => {
        const next = !isStrictEnabled;
        setIsStrictEnabled(next);
        try {
            localStorage.setItem('strict8kLexiconMode', String(next));
        } catch (_e) {
            console.warn('Failed to save strict mode setting');
        }
    };

    const categoryStats = useMemo(() => get14CategoryBreakdownStats(), []);

    // Filter the full 8227 words + 14 categories based on selected category, length, and search term
    const filteredWords = useMemo(() => {
        if (selectedCategory !== 'all' && MARATHI_14_CATEGORIES[selectedCategory]) {
            const catEntries = MARATHI_14_CATEGORIES[selectedCategory];
            return catEntries.filter(item => {
                const clean = item.word.trim();
                const len = clean.length;

                if (lengthFilter === '2' && len !== 2) return false;
                if (lengthFilter === '3' && len !== 3) return false;
                if (lengthFilter === '4' && len !== 4) return false;
                if (lengthFilter === '5+' && len < 5) return false;

                if (searchTerm.trim()) {
                    const term = searchTerm.trim();
                    return clean.includes(term) || item.clue.includes(term);
                }
                return true;
            }).map(item => item.word);
        }

        return IMPORTED_VOCABULARY_WORDS.filter(w => {
            const clean = w.trim();
            const len = clean.length;

            if (lengthFilter === '2' && len !== 2) return false;
            if (lengthFilter === '3' && len !== 3) return false;
            if (lengthFilter === '4' && len !== 4) return false;
            if (lengthFilter === '5+' && len < 5) return false;

            if (searchTerm.trim()) {
                const term = searchTerm.trim();
                const meaning = IMPORTED_VOCABULARY_MAP[clean] || '';
                return clean.includes(term) || meaning.includes(term);
            }

            return true;
        });
    }, [searchTerm, lengthFilter, selectedCategory]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/80 backdrop-blur-xs animate-fadeIn">
            <div className="bg-white dark:bg-slate-900 border-2 border-indigo-500/80 dark:border-indigo-600 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
                {/* Modal Header */}
                <div className="bg-gradient-to-r from-indigo-700 via-purple-700 to-amber-600 p-4 text-white flex items-center justify-between shadow-md">
                    <div className="flex items-center gap-2.5">
                        <span className="p-2 bg-white/20 rounded-xl">
                            <BookOpenIcon className="w-6 h-6 text-amber-200" />
                        </span>
                        <div>
                            <h2 className="text-lg font-black tracking-wide flex items-center gap-2">
                                <span>{toDevanagari(getTotalAuthenticWordsCount())} अधिकृत मराठी शब्दभांडार निरिक्षक</span>
                                <span className="text-xs bg-amber-400 text-slate-950 font-bold px-2 py-0.5 rounded-full shadow-xs">
                                    १४ घटक समाविष्ट
                                </span>
                            </h2>
                            <p className="text-xs text-indigo-100 font-medium">
                                साहित्य, शास्त्र, फळे, भाज्या, म्हणी, वार, महिने, प्राणी व समानार्थी शब्दसंग्रह
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-indigo-200 hover:text-white bg-white/10 hover:bg-white/20 w-8 h-8 rounded-full flex items-center justify-center font-bold text-base transition-colors cursor-pointer"
                    >
                        ✕
                    </button>
                </div>

                {/* Control Panel: Strict Mode Toggle & Stats */}
                <div className="p-4 bg-indigo-50 dark:bg-slate-800/80 border-b border-indigo-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3 text-xs">
                    {/* Strict Mode Toggle */}
                    <div className="flex items-center gap-3">
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={isStrictEnabled}
                                onChange={toggleStrict}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-600"></div>
                        </label>
                        <div>
                            <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1">
                                {isStrictEnabled ? <CheckIcon className="w-4 h-4 text-emerald-600" /> : null}
                                <span>{toDevanagari(IMPORTED_VOCABULARY_WORDS.length)} शब्दभांडार सक्तीने लागू करा (Strict Lexicon Mode)</span>
                            </span>
                            <p className="text-[11px] text-slate-600 dark:text-slate-400">
                                {isStrictEnabled
                                    ? `चालू: केवळ अधिकृत ${toDevanagari(IMPORTED_VOCABULARY_WORDS.length)} डेटाबेसमधील शब्दच कोड्यात वापरले जातील`
                                    : 'बंद: सामान्य शब्दकोश चालू'}
                            </p>
                        </div>
                    </div>

                    {/* Repository Counts & Export */}
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 font-bold text-indigo-900 dark:text-indigo-200 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-indigo-200 dark:border-slate-700 shadow-xs">
                            <span>मूल संग्रह:</span>
                            <span className="text-amber-600 dark:text-amber-400 font-black text-sm">
                                {toDevanagari(IMPORTED_VOCABULARY_WORDS.length)} शब्द
                            </span>
                            <span className="mx-1 text-slate-300">|</span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-black text-sm">
                                +{toDevanagari(getLearnedLexiconStats().learnedCount)} ऑटो-सेव्हड (अनंत)
                            </span>
                        </div>

                        <button
                            type="button"
                            onClick={exportInfiniteLexiconJSON}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg shadow-xs cursor-pointer flex items-center gap-1 transition-colors"
                            title="नव्याने ऑटो-सेव्ह झालेले शब्द व क्लूज JSON फाईल म्हणून डाऊनलोड करा"
                        >
                            <span>💾 बॅकअप डाऊनलोड</span>
                        </button>
                    </div>
                </div>

                {/* Filters & Search */}
                <div className="p-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                    {/* Length Tabs */}
                    <div className="flex items-center gap-1">
                        {[
                            { id: 'all', label: 'सर्व शब्द' },
                            { id: '2', label: '२ अक्षरी' },
                            { id: '3', label: '३ अक्षरी' },
                            { id: '4', label: '४ अक्षरी' },
                            { id: '5+', label: '५+ अक्षरी' },
                        ].map(tab => (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setLengthFilter(tab.id as any)}
                                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                                    lengthFilter === tab.id
                                        ? 'bg-indigo-600 text-white shadow-xs'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Search Field */}
                    <div className="relative flex-1 min-w-[200px]">
                        <SearchIcon className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="डेटाबेस मधील कोणताही शब्द वा अर्थ शोधा..."
                            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                    </div>
                </div>

                {/* 14 Categories Filter Pills */}
                <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap mr-1">
                        १४ मुख्य घटक:
                    </span>
                    <button
                        type="button"
                        onClick={() => setSelectedCategory('all')}
                        className={`px-2.5 py-1 text-[11px] font-bold rounded-md whitespace-nowrap cursor-pointer transition-colors ${
                            selectedCategory === 'all'
                                ? 'bg-amber-600 text-white shadow-xs'
                                : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 hover:bg-slate-100'
                        }`}
                    >
                        सर्व घटकांचे शब्द ({toDevanagari(IMPORTED_VOCABULARY_WORDS.length)})
                    </button>
                    {categoryStats.categories.map(cat => (
                        <button
                            key={cat.name}
                            type="button"
                            onClick={() => setSelectedCategory(cat.name)}
                            className={`px-2.5 py-1 text-[11px] font-bold rounded-md whitespace-nowrap cursor-pointer transition-colors ${
                                selectedCategory === cat.name
                                    ? 'bg-amber-600 text-white shadow-xs'
                                    : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 hover:bg-slate-100'
                            }`}
                        >
                            {cat.name} ({toDevanagari(cat.count)})
                        </button>
                    ))}
                </div>

                {/* Word List Table / Grid */}
                <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-2 flex justify-between">
                        <span>दर्शवलेले शब्द: {toDevanagari(filteredWords.length)} {selectedCategory !== 'all' ? `(${selectedCategory})` : ''}</span>
                        <span>अक्षरांच्या क्रमाने सूची</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                        {filteredWords.slice(0, 300).map(word => {
                            const meaning = IMPORTED_VOCABULARY_MAP[word] || 'अर्थ उपलब्ध';
                            const isJustCopied = copiedWord === word;

                            return (
                                <div
                                    key={word}
                                    className="bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700/80 shadow-xs hover:border-indigo-400 dark:hover:border-indigo-600 transition-all flex flex-col justify-between"
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm font-black text-indigo-950 dark:text-indigo-100">
                                            [{word}]
                                        </span>
                                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                                            {toDevanagari(word.length)} अक्षरी
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-600 dark:text-slate-300 truncate" title={meaning}>
                                        क्लू: {meaning}
                                    </p>

                                    {onSelectWord && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                onSelectWord(word, meaning);
                                                setCopiedWord(word);
                                                setTimeout(() => setCopiedWord(null), 2000);
                                            }}
                                            className="mt-2 text-[11px] font-bold text-indigo-700 dark:text-indigo-300 hover:text-indigo-900 dark:hover:text-indigo-100 flex items-center justify-end gap-1 cursor-pointer"
                                        >
                                            <span>{isJustCopied ? '✓ वापरला!' : '+ कोड्यात जोडा'}</span>
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {filteredWords.length > 300 && (
                        <div className="p-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 italic">
                            ...आणखी {toDevanagari(filteredWords.length - 300)} शब्द आहेत. विशिष्ट शब्द शोधण्यासाठी वर टाईप करा.
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-xs font-medium text-slate-600 dark:text-slate-300">
                    <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-bold">
                        <CheckIcon className="w-4 h-4" />
                        <span>{toDevanagari(IMPORTED_VOCABULARY_WORDS.length)}+ शब्द मुख्य डेटाबेसमध्ये कायमस्वरूपी सुरक्षित आहेत</span>
                    </span>
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg cursor-pointer transition-colors"
                    >
                        बंद करा
                    </button>
                </div>
            </div>
        </div>
    );
};
