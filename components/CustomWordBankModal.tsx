import React, { useState, useEffect, useRef } from 'react';
import {
    CustomWordItem,
    CustomLexiconStats,
    parseRawTextToWords,
    parseDocxFile,
    getSavedCustomWordBank,
    saveCustomWordBank,
    isStrictCustomWordsMode,
    setStrictCustomWordsMode,
    computeLexiconStats,
    getDefaultCorpusWordItems
} from '../services/customLexiconService';
import { CloseIcon, LoaderIcon } from './Icons';

interface CustomWordBankModalProps {
    isOpen: boolean;
    onClose: () => void;
    onWordsUpdated: (newWordCount: number) => void;
}

export const CustomWordBankModal: React.FC<CustomWordBankModalProps> = ({
    isOpen,
    onClose,
    onWordsUpdated
}) => {
    const [activeTab, setActiveTab] = useState<'paste' | 'upload' | 'view'>('paste');
    const [pastedText, setPastedText] = useState<string>('');
    const [appendMode, setAppendMode] = useState<boolean>(true);
    const [isStrictOnly, setIsStrictOnly] = useState<boolean>(isStrictCustomWordsMode());
    const [wordsList, setWordsList] = useState<CustomWordItem[]>([]);
    const [stats, setStats] = useState<CustomLexiconStats>({ totalWords: 0, len2: 0, len3: 0, len4: 0, len5: 0, len6Plus: 0 });
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [lengthFilter, setLengthFilter] = useState<number | 'all'>('all');
    const [isLoadingFile, setIsLoadingFile] = useState<boolean>(false);
    const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            const currentWords = getSavedCustomWordBank();
            setWordsList(currentWords);
            setStats(computeLexiconStats(currentWords));
            setIsStrictOnly(isStrictCustomWordsMode());
            setNotification(null);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const showNotify = (type: 'success' | 'error' | 'info', message: string) => {
        setNotification({ type, message });
        setTimeout(() => {
            setNotification(prev => (prev?.message === message ? null : prev));
        }, 5000);
    };

    const handleSaveWords = (newItems: CustomWordItem[], isAppend: boolean) => {
        if (newItems.length === 0) {
            showNotify('error', 'कोणतेही वैध मराठी शब्द सापडले नाहीत. कृपया शब्द तपासा.');
            return;
        }

        const currentSavedWords = getSavedCustomWordBank();
        const previousCount = currentSavedWords.length;
        let updated: CustomWordItem[];
        let newlyAddedCount = 0;
        let updatedCount = 0;

        if (isAppend) {
            const map = new Map<string, CustomWordItem>();
            currentSavedWords.forEach(w => map.set(w.word, w));
            newItems.forEach(w => {
                if (!map.has(w.word)) {
                    newlyAddedCount++;
                } else {
                    updatedCount++;
                }
                map.set(w.word, w);
            });
            updated = Array.from(map.values());
        } else {
            updated = newItems;
            newlyAddedCount = newItems.length;
        }

        saveCustomWordBank(updated);
        setWordsList(updated);
        setStats(computeLexiconStats(updated));
        onWordsUpdated(updated.length);

        if (isAppend) {
            if (newlyAddedCount > 0 && updatedCount > 0) {
                showNotify('success', `यशस्वी! ${newlyAddedCount} नवीन शब्द जोडले आणि ${updatedCount} जुने शब्द अद्यतनित झाले. शब्दभांडारात आता एकूण ${updated.length} शब्द आहेत (पूर्वीचे ${previousCount} + नवीन ${newlyAddedCount} = ${updated.length}).`);
            } else if (newlyAddedCount > 0) {
                showNotify('success', `यशस्वी! ${newlyAddedCount} नवीन शब्द यशस्वीरीत्या जोडले गेले. शब्दभांडारात आता एकूण ${updated.length} शब्द साठवले आहेत (पूर्वीचे ${previousCount} + नवीन ${newlyAddedCount} = ${updated.length}).`);
            } else {
                showNotify('info', `दिलेले सर्व ${newItems.length} शब्द आधीच शब्दभांडारात उपस्थित आहेत. त्यांची माहिती अद्यतनित केली (एकूण: ${updated.length} शब्द).`);
            }
        } else {
            showNotify('success', `शब्दभांडार यशस्वीरीत्या बदलले. आता एकूण ${updated.length} शब्द उपलब्ध आहेत.`);
        }
    };

    const handleProcessPastedText = () => {
        if (!pastedText.trim()) {
            showNotify('error', 'कृपया शब्दांची यादी किंवा मजकूर पेस्ट करा.');
            return;
        }

        const parsed = parseRawTextToWords(pastedText, 'user_pasted');
        if (parsed.length === 0) {
            showNotify('error', 'पेस्ट केलेल्या मजकुरात २ किंवा अधिक अक्षरी मराठी शब्द सापडले नाहीत.');
            return;
        }

        handleSaveWords(parsed, appendMode);
        setPastedText('');
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsLoadingFile(true);
        setNotification(null);

        try {
            let parsedWords: CustomWordItem[] = [];
            const fileName = file.name.toLowerCase();

            if (fileName.endsWith('.docx')) {
                parsedWords = await parseDocxFile(file);
            } else if (fileName.endsWith('.json')) {
                const text = await file.text();
                try {
                    const json = JSON.parse(text);
                    if (Array.isArray(json)) {
                        if (typeof json[0] === 'string') {
                            parsedWords = parseRawTextToWords(json.join('\n'), 'file_upload');
                        } else if (typeof json[0] === 'object') {
                            const raw = json.map((item: any) => `${item.word || item.name || ''} : ${item.clue || item.meaning || ''}`).join('\n');
                            parsedWords = parseRawTextToWords(raw, 'file_upload');
                        }
                    } else if (typeof json === 'object') {
                        const raw = Object.entries(json).map(([w, c]) => `${w} : ${c}`).join('\n');
                        parsedWords = parseRawTextToWords(raw, 'file_upload');
                    }
                } catch {
                    parsedWords = parseRawTextToWords(text, 'file_upload');
                }
            } else {
                // .txt or .csv
                const text = await file.text();
                parsedWords = parseRawTextToWords(text, 'file_upload');
            }

            if (parsedWords.length > 0) {
                handleSaveWords(parsedWords, appendMode);
                showNotify('success', `"${file.name}" फाईलमधून ${parsedWords.length} शब्द यशस्वीरीत्या आयात (Import) झाले!`);
            } else {
                showNotify('error', `"${file.name}" फाईलमध्ये कोणतेही वैध मराठी शब्द आढळले नाहीत.`);
            }
        } catch (err) {
            console.error('File parsing error:', err);
            showNotify('error', 'फाईल वाचताना त्रुटी आली. कृपया फाईल तपासा.');
        } finally {
            setIsLoadingFile(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleToggleStrictMode = (val: boolean) => {
        setIsStrictOnly(val);
        setStrictCustomWordsMode(val);
        showNotify('info', val ? '🔒 सक्तीचा मोड चालू: आता कोडे तयार करताना फक्त आपले शब्दभांडार वापरले जाईल.' : '🔓 मिश्रित मोड: आपले शब्द + मूळ शब्दभांडार एकत्र वापरले जाईल.');
    };

    const handleRestoreDefaultCorpus = () => {
        if (window.confirm('तुम्हाला मूळ १,००० अस्सल शब्दभांडार पूर्ववत (Restore) करायचे आहे का?')) {
            const defaults = getDefaultCorpusWordItems();
            saveCustomWordBank(defaults);
            setWordsList(defaults);
            setStats(computeLexiconStats(defaults));
            onWordsUpdated(defaults.length);
            showNotify('success', `मूळ १,००० अस्सल शब्दभांडार यशस्वीरीत्या पुनर्संचयित केले गेले!`);
        }
    };

    const handleClearAll = () => {
        if (window.confirm('सावधान: तुमचे सर्व साठवलेले शब्द हटवायचे आहेत का?')) {
            saveCustomWordBank([]);
            setWordsList([]);
            setStats(computeLexiconStats([]));
            onWordsUpdated(0);
            showNotify('info', 'सर्व शब्द हटवले गेले आहेत. कृपया नवीन शब्द जोडा.');
        }
    };

    const handleDeleteSingleWord = (wordToDelete: string) => {
        const filtered = wordsList.filter(w => w.word !== wordToDelete);
        saveCustomWordBank(filtered);
        setWordsList(filtered);
        setStats(computeLexiconStats(filtered));
        onWordsUpdated(filtered.length);
    };

    const handleExportJson = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(wordsList, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", `marathi_shabdavedh_lexicon_${Date.now()}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
    };

    // Filter words for view tab
    const filteredWords = wordsList.filter(item => {
        if (lengthFilter !== 'all' && item.length !== lengthFilter) return false;
        if (searchQuery.trim() && !item.word.includes(searchQuery.trim()) && !item.clue.includes(searchQuery.trim())) {
            return false;
        }
        return true;
    });

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/70 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
                
                {/* Modal Header */}
                <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-indigo-50 via-purple-50 to-white dark:from-indigo-950/50 dark:via-slate-900 dark:to-slate-900 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-xl shadow-md">
                            📚
                        </div>
                        <div>
                            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <span>शब्दभांडार व्यवस्थापक</span>
                                <span className="text-xs bg-indigo-600 text-white font-semibold px-2 py-0.5 rounded-full shadow-sm">
                                    {stats.totalWords} शब्द उपलब्ध
                                </span>
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                हजारो शब्द येथे पेस्ट करा किंवा Word फाईल अपलोड करा. ॲप हेच शब्द डेटाबेस म्हणून सक्तीने वापरेल.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                        aria-label="Close"
                    >
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </div>

                {/* Word Length Stats Bar */}
                <div className="bg-slate-100/80 dark:bg-slate-800/80 px-4 py-2.5 border-b border-slate-200 dark:border-slate-700/60 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">शब्द वर्गीकरण:</span>
                        <span className="bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-medium">
                            २ अक्षरी: <strong>{stats.len2}</strong>
                        </span>
                        <span className="bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-medium">
                            ३ अक्षरी: <strong>{stats.len3}</strong>
                        </span>
                        <span className="bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-medium">
                            ४ अक्षरी: <strong>{stats.len4}</strong>
                        </span>
                        <span className="bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-medium">
                            ५+ अक्षरी: <strong>{stats.len5 + stats.len6Plus}</strong>
                        </span>
                    </div>

                    {/* Strict Mode Toggle in Header */}
                    <label className="flex items-center gap-2 cursor-pointer select-none bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-md border border-indigo-200 dark:border-indigo-800">
                        <input
                            type="checkbox"
                            checked={Boolean(isStrictOnly)}
                            onChange={(e) => handleToggleStrictMode(e.target.checked)}
                            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                        />
                        <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200">
                            🔒 सक्तीने फक्त माझे शब्दभांडार वापरा (Strict Mode)
                        </span>
                    </label>
                </div>

                {/* Notifications */}
                {notification && (
                    <div className={`mx-4 mt-3 p-3 rounded-lg text-xs sm:text-sm font-medium flex items-center justify-between gap-2 border ${
                        notification.type === 'success' 
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800' 
                            : notification.type === 'error'
                            ? 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-200 border-red-300 dark:border-red-800'
                            : 'bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-800'
                    }`}>
                        <span>{notification.message}</span>
                        <button onClick={() => setNotification(null)} className="text-xs font-bold opacity-70 hover:opacity-100">✕</button>
                    </div>
                )}

                {/* Tabs Navigation */}
                <div className="flex border-b border-slate-200 dark:border-slate-800 px-4 pt-2">
                    <button
                        onClick={() => setActiveTab('paste')}
                        className={`py-2 px-4 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
                            activeTab === 'paste'
                                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                        }`}
                    >
                        <span>✍️</span>
                        <span>नवीन शब्द पेस्ट करा (Paste Text)</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('upload')}
                        className={`py-2 px-4 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
                            activeTab === 'upload'
                                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                        }`}
                    >
                        <span>📁</span>
                        <span>वर्ड / टेक्स्ट फाईल अपलोड (Upload Word/TXT)</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('view')}
                        className={`py-2 px-4 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
                            activeTab === 'view'
                                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                        }`}
                    >
                        <span>🔍</span>
                        <span>शब्द यादी पहा ({wordsList.length})</span>
                    </button>
                </div>

                {/* Tab Content Body */}
                <div className="p-4 sm:p-5 flex-1 overflow-y-auto">
                    {/* TAB 1: PASTE */}
                    {activeTab === 'paste' && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                                    येथे शब्द किंवा (शब्द : अर्थ) पेस्ट करा:
                                </label>
                                <textarea
                                    value={typeof pastedText === 'string' ? pastedText : ''}
                                    onChange={(e) => setPastedText(e.target.value)}
                                    rows={8}
                                    placeholder={`येथे हजारो शब्द पेस्ट करू शकता.\nउदा. १: थेट शब्दांची यादी:\nसागर, आकाश, कमळ, पुस्तक, शेतकरी, वाचन, संस्कार, पराक्रम...\n\nउदा. २: शब्द आणि संकेत:\nसागर : अथांग पसरलेला समुद्र\nवाचन : पुस्तकांचे अध्ययन\nकमळ : पवित्र राष्ट्रीय फूल`}
                                    className="w-full p-3 text-sm font-devanagari border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                />
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                                <div className="flex items-center gap-4 text-xs sm:text-sm">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="saveMode"
                                            checked={Boolean(appendMode)}
                                            onChange={() => setAppendMode(true)}
                                            className="text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <span className="font-medium text-slate-700 dark:text-slate-300">
                                            आधीचे शब्द ठेवून नवीन जोडा (Append)
                                        </span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="saveMode"
                                            checked={!appendMode}
                                            onChange={() => setAppendMode(false)}
                                            className="text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <span className="font-medium text-slate-700 dark:text-slate-300">
                                            आधीचे बदलून नवीन ठेवा (Replace)
                                        </span>
                                    </label>
                                </div>

                                <button
                                    onClick={handleProcessPastedText}
                                    className="py-2.5 px-6 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-2"
                                >
                                    <span>➕</span>
                                    <span>शब्दभांडारात जोडा</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* TAB 2: UPLOAD */}
                    {activeTab === 'upload' && (
                        <div className="space-y-4">
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed border-indigo-300 dark:border-indigo-700 hover:border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-2xl p-8 text-center cursor-pointer transition-all"
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".docx,.txt,.csv,.json"
                                    onChange={handleFileUpload}
                                    className="hidden"
                                />
                                <div className="text-4xl mb-3">📄</div>
                                <h3 className="text-base font-bold text-indigo-900 dark:text-indigo-200 mb-1">
                                    येथे फाईल निवडा किंवा ड्रॅग & ड्रॉप करा
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                                    सपोर्टेड फॉरमॅट्स: Microsoft Word (.docx), Plain Text (.txt), CSV (.csv), JSON (.json)
                                </p>
                                <button
                                    type="button"
                                    disabled={isLoadingFile}
                                    className="py-2 px-5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm rounded-lg shadow-md transition-all inline-flex items-center gap-2"
                                >
                                    {isLoadingFile ? (
                                        <>
                                            <LoaderIcon className="w-4 h-4 animate-spin" />
                                            <span>फाईल वाचत आहे...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>📂</span>
                                            <span>फाईल सिलेक्ट करा</span>
                                        </>
                                    )}
                                </button>
                            </div>

                            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3.5 rounded-xl text-xs text-amber-900 dark:text-amber-200 space-y-1">
                                <div className="font-bold flex items-center gap-1.5">
                                    <span>💡</span>
                                    <span>फाईल फॉरमॅट टिप्स:</span>
                                </div>
                                <p>• Word (.docx) किंवा Text (.txt) फाईलमध्ये शब्द एकाखाली एक किंवा स्वल्पविरामाने (,) वेगळे केलेले असावेत.</p>
                                <p>• जर शब्दासोबत अर्थ/संकेत द्यायचा असेल तर <code>शब्द : अर्थ</code> किंवा <code>शब्द - अर्थ</code> या स्वरूपात लिहावे.</p>
                            </div>
                        </div>
                    )}

                    {/* TAB 3: VIEW & MANAGE */}
                    {activeTab === 'view' && (
                        <div className="space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                {/* Search */}
                                <div className="relative flex-1 min-w-[200px]">
                                    <input
                                        type="text"
                                        value={typeof searchQuery === 'string' ? searchQuery : ''}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="शब्द किंवा संकेत शोधा..."
                                        className="w-full pl-8 pr-3 py-1.5 text-xs sm:text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    />
                                    <span className="absolute left-2.5 top-2 text-slate-400 text-xs">🔍</span>
                                </div>

                                {/* Length Filters */}
                                <div className="flex items-center gap-1">
                                    {(['all', 2, 3, 4, 5] as const).map(len => (
                                        <button
                                            key={len}
                                            onClick={() => setLengthFilter(len)}
                                            className={`px-2.5 py-1 text-xs font-semibold rounded-md border transition-all ${
                                                lengthFilter === len
                                                    ? 'bg-indigo-600 text-white border-indigo-600'
                                                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                                            }`}
                                        >
                                            {len === 'all' ? 'सर्व' : `${len} अक्षरी`}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Words Table */}
                            <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden max-h-[300px] overflow-y-auto">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 sticky top-0 font-bold border-b border-slate-200 dark:border-slate-700">
                                        <tr>
                                            <th className="p-2.5 w-12 text-center">#</th>
                                            <th className="p-2.5 w-28">शब्द</th>
                                            <th className="p-2.5 w-20 text-center">अक्षरे</th>
                                            <th className="p-2.5">संकेत / अर्थ</th>
                                            <th className="p-2.5 w-12 text-center">हटवा</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                        {filteredWords.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="p-6 text-center text-slate-400">
                                                    कोणतेही शब्द सापडले नाहीत.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredWords.map((item, idx) => (
                                                <tr key={item.word + idx} className="hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20">
                                                    <td className="p-2 text-center text-slate-400 font-mono">{idx + 1}</td>
                                                    <td className="p-2 font-bold text-slate-900 dark:text-white font-devanagari text-sm">
                                                        {item.word}
                                                    </td>
                                                    <td className="p-2 text-center">
                                                        <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded font-mono text-[11px] border border-slate-200 dark:border-slate-700">
                                                            {item.length}
                                                        </span>
                                                    </td>
                                                    <td className="p-2 text-slate-600 dark:text-slate-300 font-devanagari">
                                                        {item.clue}
                                                    </td>
                                                    <td className="p-2 text-center">
                                                        <button
                                                            onClick={() => handleDeleteSingleWord(item.word)}
                                                            className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 dark:hover:bg-red-950/40 rounded"
                                                            title="हटवा"
                                                        >
                                                            🗑️
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Batch Actions */}
                            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={handleExportJson}
                                        className="text-xs text-slate-700 dark:text-slate-300 hover:text-indigo-600 font-medium flex items-center gap-1 px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
                                    >
                                        <span>💾</span>
                                        <span>शब्द फाईल डाऊनलोड करा (JSON)</span>
                                    </button>
                                    <button
                                        onClick={handleRestoreDefaultCorpus}
                                        className="text-xs text-indigo-700 dark:text-indigo-300 hover:underline font-medium px-2 py-1"
                                    >
                                        मूळ १,००० शब्द पुनर्संचयित करा
                                    </button>
                                </div>
                                <button
                                    onClick={handleClearAll}
                                    className="text-xs text-red-600 dark:text-red-400 hover:underline font-medium px-2 py-1"
                                >
                                    सर्व शब्द हटवा (Clear All)
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Modal Footer */}
                <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex flex-wrap items-center justify-between gap-3">
                    <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span>सक्रिय शब्द: <strong>{wordsList.length}</strong> {isStrictOnly ? '(फक्त हेच शब्द सक्तीने वापरले जातील)' : '(मिश्रित मोड)'}</span>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={onClose}
                            className="py-2 px-5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs sm:text-sm rounded-lg transition-all"
                        >
                            बंद करा
                        </button>
                        <button
                            onClick={() => {
                                onClose();
                            }}
                            className="py-2 px-6 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold text-xs sm:text-sm rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-2"
                        >
                            <span>✓</span>
                            <span>सेव्ह करा व कोडे तयार करा</span>
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};
