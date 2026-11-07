import React from 'react';
import { WandIcon, LoaderIcon } from './Icons';
import { THEME_OPTIONS } from '../services/puzzleBank';

interface PuzzleSettingsFormProps {
    onAiGenerate: () => void;
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

    React.useEffect(() => {
        setTypedSize(String(gridSize));
    }, [gridSize]);

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
                            काळे चौकोन प्रमाण: १५% ते २८% कमाल
                        </span>
                        <span className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200 font-semibold px-2 py-0.5 rounded-full">
                            अस्सल मराठी व्याकरण (वेलांटी/उकार अचूकता)
                        </span>
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        कमीत-कमी काळे चौकोन (२८% कमाल मर्यादा), एका सलग कमाल ३ काळे ब्लॉक, आणि १००% शुद्ध मराठी व्याकरणाने (ऱ्हस्व/दीर्घ अचूकतेने) बनवलेले शब्द.
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

                {/* Black Square Setting */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                            काळे चौकोन प्रमाण:
                        </label>
                        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800">
                            {blackSquarePercentage}%
                        </span>
                    </div>

                    <div className="grid grid-cols-4 gap-1.5 mb-3">
                        {[
                            { value: 15, label: '१५%', desc: 'अत्यंत दाट' },
                            { value: 20, label: '२०%', desc: 'आदर्श' },
                            { value: 25, label: '२५%', desc: 'संतुलित' },
                            { value: 28, label: '२८%', desc: 'कमाल मर्यादा' }
                        ].map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => setBlackSquarePercentage(option.value)}
                                className={`py-2 px-0.5 rounded-lg text-xs font-medium transition-all text-center border ${
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

                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        काळे चौकोन प्रमाण २८% पर्यंत मर्यादित, कमाल ३ काळे ब्लॉक आणि वृत्तपत्र मानक सममिती लागू.
                    </p>
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
                    <div className="flex items-center gap-1.5 font-medium">
                        <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span>प्रत्येक प्रयत्नावेळी पूर्ण नवीन शब्द व काळ्या चौकोनांची जागा बदलणे:</span>
                        <span className="font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                            प्रयत्न #{attemptCount}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                            ✓ स्वयंचलित एआय क्लू प्रणाली
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                        type="button"
                        onClick={onAiGenerate}
                        disabled={isAiLoading}
                        className="sm:col-span-2 py-3 px-6 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold rounded-lg shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3 text-sm sm:text-base"
                    >
                        {isAiLoading ? (
                            <>
                                <LoaderIcon className="w-5 h-5 animate-spin" />
                                <span>नवीन शब्द व नवी रचना तयार होत आहे...</span>
                            </>
                        ) : (
                            <>
                                <WandIcon className="w-5 h-5" />
                                <span>नवीन शब्द व काळ्या चौकोनांची नवी जागा मिळवा</span>
                            </>
                        )}
                    </button>

                    {onShuffleMask && (
                        <button
                            type="button"
                            onClick={onShuffleMask}
                            disabled={isAiLoading}
                            className="py-3 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 font-bold rounded-lg border border-slate-300 dark:border-slate-600 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 transition-all flex items-center justify-center gap-2 text-xs sm:text-sm"
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
