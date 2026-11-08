import React from 'react';
import { WandIcon, LoaderIcon } from './Icons';
import { THEME_OPTIONS } from '../services/puzzleBank';
import { toDevanagari } from './PrintableShabdavedhPDF';

interface PuzzleSettingsFormProps {
    onAiGenerate: () => void;
    onDatabaseGenerate?: () => void;
    puzzleSource?: 'ai' | 'database';
    isAiLoading: boolean;
    aiError: string | null;
    gridSize: number;
    setGridSize: (size: number) => void;
    blackSquarePercentage: number;
    setBlackSquarePercentage: (percentage: number) => void;
    puzzleLevel: 'सोपे' | 'माध्यम' | 'कठीण';
    setPuzzleLevel: (level: 'सोपे' | 'माध्यम' | 'कठीण') => void;
    attemptCount?: number;
    attemptSuccessMsg?: string | null;
    onShuffleMask?: () => void;
    selectedTheme?: string;
    setSelectedTheme?: (theme: string) => void;
    onOpenLimcaStudio?: () => void;
}

export const WordInputForm: React.FC<PuzzleSettingsFormProps> = ({
    onAiGenerate,
    onDatabaseGenerate,
    puzzleSource = 'ai',
    isAiLoading,
    aiError,
    gridSize,
    setGridSize,
    blackSquarePercentage,
    setBlackSquarePercentage,
    puzzleLevel,
    setPuzzleLevel,
    attemptCount = 1,
    attemptSuccessMsg = null,
    onShuffleMask,
    selectedTheme = 'auto',
    setSelectedTheme,
    onOpenLimcaStudio,
}) => {

    const [typedSize, setTypedSize] = React.useState<string>(String(gridSize));
    const totalCells = gridSize * gridSize;
    const currentTargetBlocks = Math.round(totalCells * (blackSquarePercentage / 100));
    const [typedBlackPct, setTypedBlackPct] = React.useState<string>(String(blackSquarePercentage));
    const [typedBlackBlocks, setTypedBlackBlocks] = React.useState<string>(String(currentTargetBlocks));

    React.useEffect(() => {
        setTypedSize(String(gridSize));
    }, [gridSize]);

    React.useEffect(() => {
        setTypedBlackPct(String(blackSquarePercentage));
        setTypedBlackBlocks(String(Math.round(totalCells * (blackSquarePercentage / 100))));
    }, [blackSquarePercentage, totalCells]);

    const handleBlackPctChange = (valStr: string) => {
        setTypedBlackPct(valStr);
        if (valStr === '') return;
        const num = parseInt(valStr, 10);
        if (!isNaN(num)) {
            const clamped = Math.min(45, Math.max(5, num));
            setBlackSquarePercentage(clamped);
        }
    };

    const handleBlackBlocksChange = (valStr: string) => {
        setTypedBlackBlocks(valStr);
        if (valStr === '') return;
        const blocks = parseInt(valStr, 10);
        if (!isNaN(blocks)) {
            const maxBlocks = Math.floor(totalCells * 0.45);
            const clampedBlocks = Math.min(maxBlocks, Math.max(1, blocks));
            const calculatedPct = Math.round((clampedBlocks / totalCells) * 100);
            setBlackSquarePercentage(Math.min(45, Math.max(5, calculatedPct)));
        }
    };

    const handleGridSizeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setTypedSize(value);
        if (value === '') return;
        const newSize = parseInt(value, 10);
        if (!isNaN(newSize) && newSize >= 5 && newSize <= 25) {
            setGridSize(newSize);
        }
    };

    const handleGridSizeBlur = () => {
        const newSize = parseInt(typedSize, 10);
        if (isNaN(newSize) || newSize < 5) {
            setGridSize(5);
            setTypedSize('5');
        } else if (newSize > 25) {
            setGridSize(25);
            setTypedSize('25');
        } else {
            setGridSize(newSize);
            setTypedSize(String(newSize));
        }
    };

    const adjustSize = (delta: number) => {
        const next = Math.max(5, Math.min(25, gridSize + delta));
        setGridSize(next);
        setTypedSize(String(next));
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-700 pb-3">
                <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white flex flex-wrap items-center gap-2">
                        <span>शब्दवेध कोडे सेटिंग्ज</span>
                        <span className="text-xs bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 font-semibold px-2 py-0.5 rounded-full">
                            दाट रचना (Dense Layout)
                        </span>
                        <span className="text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200 font-semibold px-2 py-0.5 rounded-full">
                            १००% अर्थपूर्ण शब्द • वृत्तपत्र मानक रचना (२५% ते ३५%)
                        </span>
                        <span className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200 font-semibold px-2 py-0.5 rounded-full">
                            एका चौकटीत एकच अक्षर • अस्सल मराठी व्याकरण
                        </span>
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        प्रत्येक शब्द १००% अर्थपूर्ण असण्याला सर्वोच्च प्राधान्य (अर्थ नसलेले शब्द पूर्णतः वर्ज्य), एका चौकटीत एकच अक्षर, आणि अस्सल वृत्तपत्रीय शब्दवेध रचना.
                    </p>
                </div>
            </div>



            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {/* Theme Selector */}
                <div className="lg:col-span-1">
                    <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                            विषय / थीम (Theme):
                        </label>
                        <span className="text-[11px] bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                            {THEME_OPTIONS.find(t => t.id === selectedTheme)?.icon || '✨'} {selectedTheme === 'auto' ? 'आपोआप' : 'निवडलेले'}
                        </span>
                    </div>

                    <select
                        value={selectedTheme || 'auto'}
                        onChange={(e) => setSelectedTheme && setSelectedTheme(e.target.value)}
                        className="w-full py-2.5 px-3 bg-slate-50 dark:bg-slate-700/60 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all shadow-sm"
                    >
                        {THEME_OPTIONS.map((theme) => (
                            <option key={theme.id} value={theme.id}>
                                {theme.icon} {theme.name}
                            </option>
                        ))}
                    </select>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                        {THEME_OPTIONS.find(t => t.id === selectedTheme)?.description || 'प्रत्येक प्रयत्नात आपोआप नवी थीम व नवे दर्जेदार शब्द'}
                    </p>

                    <div className="mt-2.5">
                        <button
                            type="button"
                            onClick={() => setSelectedTheme && setSelectedTheme('newspaper_mask')}
                            className={`w-full py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-between border ${
                                selectedTheme === 'newspaper_mask'
                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                    : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/60'
                            }`}
                        >
                            <span className="flex items-center gap-1.5">
                                <span>📰</span>
                                <span>वृत्तपत्र क्लासिक मास्क लावा</span>
                            </span>
                            <span className="text-[10px] font-semibold opacity-90">
                                {selectedTheme === 'newspaper_mask' ? '✓ सक्रिय' : 'निवडा ➔'}
                            </span>
                        </button>
                    </div>
                </div>
                {/* Grid Size Setting */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                            आकार (Grid Size):
                        </label>
                        <div className="flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800">
                            <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">
                                {gridSize} × {gridSize}
                            </span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400">
                                ({gridSize * gridSize} घरे)
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 mb-3">
                        <button
                            type="button"
                            onClick={() => adjustSize(-1)}
                            disabled={gridSize <= 5}
                            className="w-9 h-9 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 disabled:opacity-40 font-bold text-base flex items-center justify-center text-slate-700 dark:text-slate-200 transition-colors"
                        >
                            -
                        </button>
                        <div className="relative flex-1">
                            <input
                                type="number"
                                min={5}
                                max={25}
                                value={typeof typedSize === 'string' ? typedSize : String(gridSize || 10)}
                                onChange={handleGridSizeInputChange}
                                onBlur={handleGridSizeBlur}
                                className="w-full text-center font-bold text-lg py-1.5 px-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            />
                        </div>
                        <button
                            type="button"
                            onClick={() => adjustSize(1)}
                            disabled={gridSize >= 25}
                            className="w-9 h-9 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 disabled:opacity-40 font-bold text-base flex items-center justify-center text-slate-700 dark:text-slate-200 transition-colors"
                        >
                            +
                        </button>
                    </div>

                    {/* Quick Preset Size Buttons */}
                    <div className="grid grid-cols-4 gap-1.5">
                        {[
                            { size: 5, label: '५x५', sub: 'मिनी कोडे', highlight: true },
                            { size: 6, label: '६x६', sub: 'सुलभ', highlight: false },
                            { size: 7, label: '७x७', sub: 'सुलभ+', highlight: false },
                            { size: 8, label: '८x८', sub: 'मध्यम', highlight: false },
                            { size: 9, label: '९x९', sub: 'मध्यम+', highlight: false },
                            { size: 10, label: '१०x१०', sub: 'शब्दवेध', highlight: true },
                            { size: 12, label: '१२x१२', sub: 'विस्तृत', highlight: false },
                            { size: 15, label: '१५x१५', sub: 'महाकोडे', highlight: true },
                            { size: 20, label: '२०x२०', sub: 'भव्य', highlight: false },
                            { size: 25, label: '२५x२५', sub: 'अतिभव्य', highlight: true },
                        ].map(preset => (
                            <button
                                key={preset.size}
                                type="button"
                                onClick={() => {
                                    setGridSize(preset.size);
                                    setTypedSize(String(preset.size));
                                }}
                                className={`py-1.5 px-1 rounded-md text-xs font-medium transition-all text-center border ${
                                    gridSize === preset.size
                                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm font-bold'
                                        : preset.highlight
                                            ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100'
                                            : 'bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700'
                                }`}
                            >
                                <div className="font-bold text-[11px] leading-tight">{preset.label}</div>
                                <div className="text-[9px] opacity-80 leading-tight">{preset.sub}</div>
                            </button>
                        ))}
                    </div>

                    {/* Special Limca World Record 125x125 Mega Button */}
                    {onOpenLimcaStudio && (
                        <div className="mt-2.5">
                            <button
                                type="button"
                                onClick={onOpenLimcaStudio}
                                className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-600 hover:to-yellow-600 text-amber-950 font-black text-xs shadow-md border border-amber-300 dark:border-amber-400 flex items-center justify-between transition-all active:scale-95 group"
                            >
                                <span className="flex items-center gap-1.5">
                                    <span>🏆</span>
                                    <span>१२५×१२५ लिमका विक्रम कोडे</span>
                                </span>
                                <span className="text-[10px] bg-black/15 px-2 py-0.5 rounded-full font-bold">
                                    १५,६२५ घरे ➔
                                </span>
                            </button>
                        </div>
                    )}
                </div>

                {/* Black Square Setting with Editable Custom Blocks */}
                <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                            काळे चौकोन प्रमाण व संख्या:
                        </label>
                        <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/70 px-2.5 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800 flex items-center gap-1.5 shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                            <span>{toDevanagari(blackSquarePercentage)}% ({toDevanagari(currentTargetBlocks)}/{toDevanagari(totalCells)} घरे)</span>
                        </span>
                    </div>

                    {/* Quick Preset Density Buttons */}
                    <div className="grid grid-cols-5 gap-1.5">
                        {[
                            { value: 20, label: '२०%', desc: 'अत्यंत दाट' },
                            { value: 25, label: '२५%', desc: 'संतुलित' },
                            { value: 30, label: '३०%', desc: 'मानक वृत्तपत्र' },
                            { value: 33, label: '३३%', desc: 'शब्दवेध आदर्श' },
                            { value: 36, label: '३६%', desc: 'विस्तृत' }
                        ].map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => setBlackSquarePercentage(option.value)}
                                className={`py-1.5 px-0.5 rounded-lg text-xs font-medium transition-all text-center border ${
                                    blackSquarePercentage === option.value
                                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm font-bold'
                                        : 'bg-slate-50 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700'
                                }`}
                            >
                                <div className="font-bold text-xs">{option.label}</div>
                                <div className="text-[9px] opacity-80 leading-tight">{option.desc}</div>
                            </button>
                        ))}
                    </div>

                    {/* Editable Custom Black Blocks & Percentage Controls */}
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/80 space-y-2">
                        <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 flex items-center justify-between">
                            <span>✏️ थेट सानुकूल (Custom) संख्या प्रविष्ट करा:</span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500">कमाल मर्यादा: ४५%</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {/* Percentage Input */}
                            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 p-1.5 rounded-lg border border-slate-300 dark:border-slate-600 shadow-2xs">
                                <span className="text-xs font-bold text-slate-600 dark:text-slate-300 px-1 whitespace-nowrap">टक्केवारी:</span>
                                <button
                                    type="button"
                                    onClick={() => setBlackSquarePercentage(Math.max(5, blackSquarePercentage - 1))}
                                    className="w-6 h-6 rounded bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center transition-all"
                                    title="१% कमी करा"
                                >
                                    -
                                </button>
                                <input
                                    type="number"
                                    min="5"
                                    max="45"
                                    value={typedBlackPct}
                                    onChange={(e) => handleBlackPctChange(e.target.value)}
                                    className="w-full text-center text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-transparent focus:outline-hidden"
                                    title="काळे चौकोन टक्केवारी (५ ते ४५%)"
                                />
                                <span className="text-xs font-bold text-slate-500 px-1">%</span>
                                <button
                                    type="button"
                                    onClick={() => setBlackSquarePercentage(Math.min(45, blackSquarePercentage + 1))}
                                    className="w-6 h-6 rounded bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center transition-all"
                                    title="१% वाढवा"
                                >
                                    +
                                </button>
                            </div>

                            {/* Exact Blocks Count Input */}
                            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 p-1.5 rounded-lg border border-slate-300 dark:border-slate-600 shadow-2xs">
                                <span className="text-xs font-bold text-slate-600 dark:text-slate-300 px-1 whitespace-nowrap">काळे ब्लॉक्स:</span>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const nextBlocks = Math.max(1, currentTargetBlocks - 1);
                                        const calculatedPct = Math.round((nextBlocks / totalCells) * 100);
                                        setBlackSquarePercentage(Math.min(45, Math.max(5, calculatedPct)));
                                    }}
                                    className="w-6 h-6 rounded bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center transition-all"
                                    title="१ काळा ब्लॉक कमी करा"
                                >
                                    -
                                </button>
                                <input
                                    type="number"
                                    min="1"
                                    max={Math.floor(totalCells * 0.45)}
                                    value={typedBlackBlocks}
                                    onChange={(e) => handleBlackBlocksChange(e.target.value)}
                                    className="w-full text-center text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-transparent focus:outline-hidden"
                                    title={`काळ्या चौकटींची थेट संख्या (१ ते ${Math.floor(totalCells * 0.45)} घरे)`}
                                />
                                <span className="text-[11px] font-bold text-slate-500 px-1">घरे</span>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const maxBlocks = Math.floor(totalCells * 0.45);
                                        const nextBlocks = Math.min(maxBlocks, currentTargetBlocks + 1);
                                        const calculatedPct = Math.round((nextBlocks / totalCells) * 100);
                                        setBlackSquarePercentage(Math.min(45, Math.max(5, calculatedPct)));
                                    }}
                                    className="w-6 h-6 rounded bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center transition-all"
                                    title="१ काळा ब्लॉक वाढवा"
                                >
                                    +
                                </button>
                            </div>
                        </div>

                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                            कोडे तुमच्या इनपुटनुसार (Database व Gemini AI दोन्ही) काळ्या चौकटींचे प्रमाण व रचना आपोआप रूपांतरित करेल.
                        </p>
                    </div>
                </div>

                {/* Puzzle Level Setting */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                            काठिण्य पातळी (Level):
                        </label>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                        {(['सोपे', 'माध्यम', 'कठीण'] as const).map((level) => (
                            <button
                                key={level}
                                type="button"
                                onClick={() => setPuzzleLevel(level)}
                                className={`py-2.5 px-3 rounded-lg text-xs font-bold transition-all text-center ${
                                    puzzleLevel === level
                                        ? level === 'सोपे'
                                            ? 'bg-emerald-600 text-white shadow-md'
                                            : level === 'माध्यम'
                                                ? 'bg-amber-600 text-white shadow-md'
                                                : 'bg-rose-600 text-white shadow-md'
                                        : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600'
                                }`}
                            >
                                {level}
                            </button>
                        ))}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                        {puzzleLevel === 'सोपे' && 'दैनंदिन सोपे शब्द व सुलभ रचना.'}
                        {puzzleLevel === 'माध्यम' && 'समृद्ध शब्दसंग्रह व विचार करायला लावणारी रचना.'}
                        {puzzleLevel === 'कठीण' && 'साहित्यिक व आव्हानात्मक शब्दसंग्रह.'}
                    </p>
                </div>
            </div>

            <div className="border-t border-slate-200 dark:border-slate-700 pt-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-400">
                    <div className="flex items-center gap-2 font-medium">
                        <span className="text-slate-500 dark:text-slate-400">सध्याचे कोडे स्त्रोत:</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
                            puzzleSource === 'ai'
                                ? 'bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700'
                                : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                        }`}>
                            <span>{puzzleSource === 'ai' ? '🤖' : '📚'}</span>
                            <span>{puzzleSource === 'ai' ? 'Gemini AI जनरेटर (AI Clues)' : '८,०००+ शब्दभांडार डेटाबेस'}</span>
                        </span>
                        <span className="font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                            प्रयत्न #{attemptCount}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                            ✓ स्वयंचलित Gemini AI क्लू सिंक
                        </span>
                    </div>
                </div>

                {/* Dual Generation Options */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    <button
                        type="button"
                        onClick={onAiGenerate}
                        disabled={isAiLoading}
                        className="py-3 px-4 bg-gradient-to-r from-purple-600 via-indigo-600 to-indigo-700 hover:from-purple-700 hover:to-indigo-800 text-white font-bold rounded-xl shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 transition-all flex items-center justify-center gap-2.5 text-xs sm:text-sm active:scale-[0.99]"
                    >
                        {isAiLoading ? (
                            <>
                                <LoaderIcon className="w-4 h-4 animate-spin" />
                                <span>Gemini AI कोडे तयार होत आहे...</span>
                            </>
                        ) : (
                            <>
                                <WandIcon className="w-4 h-4" />
                                <span>🤖 Gemini AI कोडे व क्लूज बनवा</span>
                            </>
                        )}
                    </button>

                    {onDatabaseGenerate && (
                        <button
                            type="button"
                            onClick={onDatabaseGenerate}
                            disabled={isAiLoading}
                            className="py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold rounded-xl shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 transition-all flex items-center justify-center gap-2.5 text-xs sm:text-sm active:scale-[0.99]"
                            title="८,०००+ अधिकृत मराठी शब्दभांडारातून तयार केलेले वृत्तपत्र दर्जाचे कोडे लोड करा"
                        >
                            <span className="text-base">📚</span>
                            <span>शब्दभांडार डेटाबेसमधून कोडे मिळवा</span>
                        </button>
                    )}

                    {onShuffleMask && (
                        <button
                            type="button"
                            onClick={onShuffleMask}
                            disabled={isAiLoading}
                            className="py-3 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 font-bold rounded-xl border border-slate-300 dark:border-slate-600 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 transition-all flex items-center justify-center gap-2 text-xs sm:text-sm"
                            title="काळ्या चौकोनांची जागा बदलून नवा आकृतीबंध पहा"
                        >
                            <span>🎲</span>
                            <span>काळ्या चौकोनांची जागा बदला</span>
                        </button>
                    )}
                </div>

                {attemptSuccessMsg && (
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-lg text-emerald-800 dark:text-emerald-200 text-sm flex items-center gap-2">
                        <span className="text-emerald-600 dark:text-emerald-400 text-base">✓</span>
                        <span className="font-medium">{attemptSuccessMsg}</span>
                    </div>
                )}
                {aiError && (
                    <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
                        {aiError}
                    </div>
                )}
            </div>
        </div>
    );
};
