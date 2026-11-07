import React, { useState } from 'react';

interface MarathiOnScreenKeyboardProps {
    onInsertChar: (char: string) => void;
    onApplyMatra: (matra: string) => void;
    onBackspace: () => void;
    onToggleDirection: () => void;
    onToggleBlack: () => void;
    onNavigate: (dir: 'left' | 'right' | 'up' | 'down') => void;
    direction: 'across' | 'down';
    activeCellLetter: string | null;
    isCurrentCellBlack?: boolean;
}

const SWAR_LIST = ['अ', 'आ', 'इ', 'ई', 'उ', 'ऊ', 'ऋ', 'ए', 'ऐ', 'ओ', 'औ', 'अं', 'अः', 'ॲ', 'ऑ'];

const VYANJAN_ROWS = [
    ['क', 'ख', 'ग', 'घ', 'ङ'],
    ['च', 'छ', 'ज', 'झ', 'ञ'],
    ['ट', 'ठ', 'ड', 'ढ', 'ण'],
    ['त', 'थ', 'द', 'ध', 'न'],
    ['प', 'फ', 'ब', 'भ', 'म'],
    ['य', 'र', 'ल', 'व', 'श'],
    ['ष', 'स', 'ह', 'ळ', 'क्ष', 'ज्ञ']
];

const MATRAS_LIST = [
    { label: 'ा (काना)', char: 'ा' },
    { label: 'ि (पहिली वेलांटी)', char: 'ि' },
    { label: 'ी (दुसरी वेलांटी)', char: 'ी' },
    { label: 'ु (पहिला उकार)', char: 'ु' },
    { label: 'ू (दुसरा उकार)', char: 'ू' },
    { label: 'े (एक मात्रा)', char: 'े' },
    { label: 'ै (दोन मात्रे)', char: 'ै' },
    { label: 'ो (काना एक मात्रा)', char: 'ो' },
    { label: 'ौ (काना दोन मात्रे)', char: 'ौ' },
    { label: 'ं (अनुस्वार)', char: 'ं' },
    { label: 'ः (विसर्ग)', char: 'ः' },
    { label: 'ृ (ऋकार)', char: 'ृ' },
    { label: 'ॅ (कॅ)', char: 'ॅ' },
    { label: 'ॉ (कॉ)', char: 'ॉ' },
    { label: '् (हलंत/जोडाक्षर)', char: '्' },
];

export const MarathiOnScreenKeyboard: React.FC<MarathiOnScreenKeyboardProps> = ({
    onInsertChar,
    onApplyMatra,
    onBackspace,
    onToggleDirection,
    onToggleBlack,
    onNavigate,
    direction,
    activeCellLetter,
    isCurrentCellBlack = false
}) => {
    const [activeTab, setActiveTab] = useState<'vyanjan' | 'swar' | 'matra'>('vyanjan');

    return (
        <div className="bg-slate-900 text-white rounded-2xl shadow-xl border border-slate-700 p-3 sm:p-4 select-none">
            {/* Header / Active Character & Category Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-700">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-300">⌨️ मराठी कीबोर्ड:</span>
                    <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl border border-slate-700">
                        <button
                            type="button"
                            onClick={() => setActiveTab('vyanjan')}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                                activeTab === 'vyanjan'
                                    ? 'bg-indigo-600 text-white shadow-xs'
                                    : 'text-slate-300 hover:text-white'
                            }`}
                        >
                            क-ख-ग (व्यंजन)
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('swar')}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                                activeTab === 'swar'
                                    ? 'bg-indigo-600 text-white shadow-xs'
                                    : 'text-slate-300 hover:text-white'
                            }`}
                        >
                            अ-आ-इ (स्वर)
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('matra')}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                                activeTab === 'matra'
                                    ? 'bg-indigo-600 text-white shadow-xs'
                                    : 'text-slate-300 hover:text-white'
                            }`}
                        >
                            मात्रा / काना-वेलांटी
                        </button>
                    </div>
                </div>

                {/* Current Active Character Status */}
                <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">सध्याचा चौकोन:</span>
                    <span className={`w-8 h-8 rounded-lg font-bold flex items-center justify-center text-base border ${
                        isCurrentCellBlack 
                            ? 'bg-black border-slate-600 text-slate-400'
                            : activeCellLetter 
                            ? 'bg-indigo-950 border-indigo-500 text-amber-300' 
                            : 'bg-slate-800 border-slate-600 text-slate-400'
                    }`}>
                        {isCurrentCellBlack ? '⬛' : activeCellLetter || '•'}
                    </span>
                </div>
            </div>

            {/* Quick Matra Toolbar (Always visible for instantaneous ka, ki, ke, ko typing) */}
            <div className="mb-3 bg-slate-800/90 p-2 rounded-xl border border-slate-700 flex flex-wrap items-center gap-1.5 overflow-x-auto custom-scrollbar">
                <span className="text-[11px] font-bold text-amber-400 whitespace-nowrap pl-1 pr-1.5">
                    मात्रा जोडा:
                </span>
                {MATRAS_LIST.slice(0, 11).map(m => (
                    <button
                        key={`quick-matra-${m.char}`}
                        type="button"
                        onClick={() => onApplyMatra(m.char)}
                        className="px-2.5 py-1 bg-slate-700 hover:bg-indigo-600 active:scale-95 text-amber-200 hover:text-white rounded-lg text-sm font-bold border border-slate-600 transition-all"
                        title={m.label}
                    >
                        {activeCellLetter ? `${activeCellLetter}${m.char}` : `क${m.char}`}
                    </button>
                ))}
            </div>

            {/* Main Keypad Sections */}
            <div className="min-h-[140px] flex flex-col justify-center">
                {/* 1. Vyanjan Tab */}
                {activeTab === 'vyanjan' && (
                    <div className="space-y-1.5">
                        {VYANJAN_ROWS.map((row, rIdx) => (
                            <div key={`v-row-${rIdx}`} className="flex items-center justify-center gap-1 sm:gap-1.5">
                                {row.map(char => (
                                    <button
                                        key={`char-${char}`}
                                        type="button"
                                        onClick={() => onInsertChar(char)}
                                        className="flex-1 max-w-[56px] h-10 sm:h-11 bg-slate-800 hover:bg-indigo-600 active:bg-indigo-700 text-white font-bold text-base sm:text-lg rounded-xl border border-slate-700 hover:border-indigo-400 transition-all active:scale-95 shadow-xs flex items-center justify-center"
                                    >
                                        {char}
                                    </button>
                                ))}
                            </div>
                        ))}
                    </div>
                )}

                {/* 2. Swar Tab */}
                {activeTab === 'swar' && (
                    <div className="grid grid-cols-5 sm:grid-cols-8 gap-1.5 sm:gap-2">
                        {SWAR_LIST.map(char => (
                            <button
                                key={`swar-${char}`}
                                type="button"
                                onClick={() => onInsertChar(char)}
                                className="h-11 bg-slate-800 hover:bg-indigo-600 active:bg-indigo-700 text-white font-bold text-base sm:text-lg rounded-xl border border-slate-700 hover:border-indigo-400 transition-all active:scale-95 shadow-xs flex items-center justify-center"
                            >
                                {char}
                            </button>
                        ))}
                    </div>
                )}

                {/* 3. Detailed Matras Tab */}
                {activeTab === 'matra' && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {MATRAS_LIST.map(m => (
                            <button
                                key={`matra-${m.char}`}
                                type="button"
                                onClick={() => onApplyMatra(m.char)}
                                className="p-2 bg-slate-800 hover:bg-indigo-600 active:bg-indigo-700 text-white rounded-xl border border-slate-700 hover:border-indigo-400 transition-all active:scale-95 flex items-center justify-between text-xs sm:text-sm font-semibold"
                            >
                                <span className="text-amber-300 font-bold text-base">
                                    {activeCellLetter ? `${activeCellLetter}${m.char}` : `क${m.char}`}
                                </span>
                                <span className="text-slate-300 text-[11px] truncate ml-2">
                                    {m.label}
                                </span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Bottom Controls Row: Direction, Backspace, Navigation, Black Square */}
            <div className="mt-3 pt-3 border-t border-slate-700 flex flex-wrap items-center justify-between gap-2">
                {/* Navigation Arrows */}
                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        onClick={() => onNavigate('left')}
                        className="w-9 h-9 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 rounded-xl border border-slate-600 flex items-center justify-center font-bold text-sm"
                        title="डावीकडे"
                    >
                        ⬅
                    </button>
                    <button
                        type="button"
                        onClick={() => onNavigate('right')}
                        className="w-9 h-9 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 rounded-xl border border-slate-600 flex items-center justify-center font-bold text-sm"
                        title="उजवीकडे"
                    >
                        ➔
                    </button>
                    <button
                        type="button"
                        onClick={() => onNavigate('up')}
                        className="w-9 h-9 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 rounded-xl border border-slate-600 flex items-center justify-center font-bold text-sm"
                        title="वर"
                    >
                        ⬆
                    </button>
                    <button
                        type="button"
                        onClick={() => onNavigate('down')}
                        className="w-9 h-9 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 rounded-xl border border-slate-600 flex items-center justify-center font-bold text-sm"
                        title="खाली"
                    >
                        ⬇
                    </button>
                </div>

                {/* Function Keys: Direction Toggle, Black Toggle, Backspace */}
                <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                        type="button"
                        onClick={onToggleDirection}
                        className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all active:scale-95 flex items-center gap-1 ${
                            direction === 'across'
                                ? 'bg-red-900/60 border-red-500 text-red-200'
                                : 'bg-blue-900/60 border-blue-500 text-blue-200'
                        }`}
                        title="आडवे / उभे टाईपिंग बदला"
                    >
                        <span>{direction === 'across' ? '➔ आडवे' : '⬇ उभे'}</span>
                    </button>

                    <button
                        type="button"
                        onClick={onToggleBlack}
                        className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 active:scale-95 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1"
                        title="चौकोन काळा/पांढरा करा"
                    >
                        <span>⬛</span>
                        <span>{isCurrentCellBlack ? 'पांढरा करा' : 'काळा करा'}</span>
                    </button>

                    <button
                        type="button"
                        onClick={onBackspace}
                        className="px-4 py-2 bg-rose-700 hover:bg-rose-600 active:scale-95 text-white rounded-xl text-xs sm:text-sm font-bold border border-rose-500 shadow-xs flex items-center gap-1.5"
                        title="अक्षर पुसा आणि मागे जा"
                    >
                        <span>⌫</span>
                        <span>पुसा (Backspace)</span>
                    </button>
                </div>
            </div>
        </div>
    );
};
