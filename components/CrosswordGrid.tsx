import React, { useState, useEffect, useMemo } from 'react';
import { GridCell } from '../types';
import { validateConsecutiveBlackBlocks } from '../services/crosswordService';

interface CrosswordGridProps {
    grid: GridCell[][];
    showSolution: boolean;
    isEditMode?: boolean;
    onGridChange?: (newGrid: GridCell[][]) => void;
    fontClass?: string;
}

const devanagariDigits = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];
const toDevanagari = (num: number | null): string => {
    if (num === null || num === undefined) return '';
    return String(num).split('').map(digit => devanagariDigits[parseInt(digit, 10)]).join('');
};

function getGraphemes(word: string): string[] {
    if (typeof (Intl as any)?.Segmenter !== 'function') {
        return [...word];
    }
    try {
        const segmenter = new (Intl as any).Segmenter('mr', { granularity: 'grapheme' });
        return Array.from(segmenter.segment(word)).map((s: any) => s.segment);
    } catch (e) {
        return [...word];
    }
}

const EditableCell: React.FC<{
    cell: GridCell;
    r: number;
    c: number;
    grid: GridCell[][];
    onGridChange: (newGrid: GridCell[][]) => void;
}> = ({ cell, r, c, grid, onGridChange }) => {
    
    const [inputValue, setInputValue] = useState<string>(() => (cell.isBlack || !cell.letter ? '' : cell.letter));

    useEffect(() => {
        setInputValue(cell.isBlack || !cell.letter ? '' : cell.letter);
    }, [cell.letter, cell.isBlack]);

    const commitChange = (value: string) => {
        const newGrid = grid.map(row => row.map(cell => ({ ...cell })));
        const currentCell = newGrid[r][c];
        
        const cleanValue = (value || '').trim();
        const graphemes = getGraphemes(cleanValue);

        if (cleanValue === '' || cleanValue === ' ') {
            currentCell.isBlack = true;
            currentCell.letter = null;
        } else {
            currentCell.isBlack = false;
            currentCell.letter = graphemes[graphemes.length - 1];
        }
        onGridChange(newGrid);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputValue(e.target.value ?? '');
        commitChange(e.target.value ?? '');
    };
    
    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        commitChange(e.target.value ?? '');
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            commitChange(e.currentTarget.value ?? '');
            e.currentTarget.blur();
        }
    };

    return (
        <div
            className={`relative flex items-center justify-center font-bold uppercase text-slate-900 dark:text-white text-base sm:text-lg md:text-xl lg:text-2xl border border-slate-300 dark:border-slate-600 print:border-gray-600 ${
                cell.isBlack ? 'bg-slate-800 dark:bg-black print:bg-black' : 'bg-white dark:bg-slate-300 print:bg-white'
            }`}
            style={{ aspectRatio: '1 / 1' }}
        >
             {cell.number && (
                <span className="absolute top-0 left-0.5 text-xs text-slate-500 dark:text-slate-800 print:text-black font-mono" style={{ fontSize: 'min(2vw, 0.9rem)' }}>
                    {toDevanagari(cell.number)}
                </span>
            )}
            <input
                type="text"
                value={typeof inputValue === 'string' ? inputValue : ''}
                onChange={handleChange}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                className="w-full h-full p-0 m-0 bg-transparent border-0 text-center focus:ring-2 focus:ring-indigo-500 dark:focus:ring-offset-slate-800 rounded-none text-inherit"
                autoComplete="off"
            />
        </div>
    );
};


export const CrosswordGrid: React.FC<CrosswordGridProps> = ({ grid, showSolution, isEditMode = false, onGridChange, fontClass }) => {
    if (!grid || grid.length === 0) return null;

    const validation = useMemo(() => validateConsecutiveBlackBlocks(grid), [grid]);

    const dynamicFontClass = useMemo(() => {
        if (fontClass) return fontClass;
        const size = grid.length;
        if (size <= 6) return 'text-xl sm:text-2xl md:text-3xl font-extrabold';
        if (size <= 10) return 'text-base sm:text-lg md:text-xl font-bold';
        if (size <= 15) return 'text-xs sm:text-sm md:text-base font-semibold';
        return 'text-[10px] sm:text-xs font-semibold';
    }, [grid.length, fontClass]);

    const dynamicNumberStyle = useMemo(() => {
        const size = grid.length;
        if (size <= 6) return { fontSize: 'min(3vw, 1.1rem)' };
        if (size <= 10) return { fontSize: 'min(2vw, 0.85rem)' };
        if (size <= 15) return { fontSize: 'min(1.6vw, 0.7rem)' };
        return { fontSize: 'min(1.2vw, 0.55rem)' };
    }, [grid.length]);

    return (
        <div className="flex flex-col gap-2">
            {!validation.isValid && isEditMode && (
                <div className="bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs px-3 py-2 rounded-lg flex items-center justify-between">
                    <span className="font-semibold">
                        ⚠️ सक्तीचा नियम उल्लंघन: एका सलग तीनपेक्षा जास्त ({Math.max(validation.maxHorizontal, validation.maxVertical)}) काळे ब्लॉक नकोत.
                    </span>
                    <span className="text-[11px] opacity-80">
                        {validation.violations.length} उल्लंघन आढळले
                    </span>
                </div>
            )}
            <div
                className="grid border-2 border-slate-700 dark:border-slate-500 print:border-black shadow-md"
                style={{
                    gridTemplateColumns: `repeat(${grid[0].length}, minmax(0, 1fr))`,
                    aspectRatio: `${grid[0].length} / ${grid.length}`,
                }}
            >
                {grid.map((row, r) =>
                    row.map((cell, c) => {
                        const key = `${r}-${c}`;
                        const isViolating = validation.violatingCellKeys.has(key);

                        if (onGridChange) {
                            return (
                                <div key={key} className={isViolating ? 'ring-2 ring-rose-500 z-10' : ''}>
                                    <EditableCell
                                        cell={cell}
                                        r={r}
                                        c={c}
                                        grid={grid}
                                        onGridChange={onGridChange}
                                    />
                                </div>
                            );
                        }

                        return (
                            <div
                                key={key}
                                className={`relative flex items-center justify-center font-bold uppercase text-slate-900 dark:text-white border border-slate-300 dark:border-slate-600 print:border-gray-600 ${
                                    cell.isBlack ? 'bg-slate-800 dark:bg-black print:bg-black' : 'bg-white dark:bg-slate-300 print:bg-white'
                                } ${isViolating ? 'ring-2 ring-rose-500 z-10' : ''} ${dynamicFontClass}`}
                                style={{ aspectRatio: '1 / 1' }}
                            >
                                {cell.number && (
                                    <span className="absolute top-0 left-0.5 text-xs text-slate-500 dark:text-slate-800 print:text-black font-mono leading-none" style={dynamicNumberStyle}>
                                        {toDevanagari(cell.number)}
                                    </span>
                                )}
                                {showSolution && !cell.isBlack && cell.letter}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};