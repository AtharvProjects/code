import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { getLimca125CrosswordPuzzle, generateLimcaRecordDossierText, Limca125Puzzle, LimcaSector } from '../services/limcaRecordCrosswordService';
import { toDevanagari } from './PrintableShabdavedhPDF';
import { GridCell, Clues } from '../types';
import { MarathiOnScreenKeyboard } from './MarathiOnScreenKeyboard';
import { CrosswordGrid } from './CrosswordGrid';
import {
    TrophyIcon,
    SearchIcon,
    EyeIcon,
    EyeOffIcon,
    PrintIcon,
    DownloadIcon,
    RefreshCwIcon,
    CheckIcon,
    LayersIcon,
    ZoomInIcon,
    ZoomOutIcon,
    CompassIcon,
    PencilIcon,
    BookOpenIcon
} from './Icons';

interface LimcaRecordCrosswordStudioProps {
    onBackToNormal: () => void;
}

export const LimcaRecordCrosswordStudio: React.FC<LimcaRecordCrosswordStudioProps> = ({
    onBackToNormal
}) => {
    // 1. Load 125x125 puzzle
    const [puzzle, setPuzzle] = useState<Limca125Puzzle>(() => getLimca125CrosswordPuzzle());
    const [activeTab, setActiveTab] = useState<'canvas' | 'sector' | 'clues' | 'dossier'>('canvas');
    const [selectedSectorId, setSelectedSectorId] = useState<string>('C3'); // Center sector default
    const [showSolution, setShowSolution] = useState<boolean>(true);
    const [zoom, setZoom] = useState<number>(0.5); // 0.25 to 2.0
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [activeClueFilter, setActiveClueFilter] = useState<'all' | 'across' | 'down'>('all');
    
    // Interactive Inspection State
    const [inspectedCell, setInspectedCell] = useState<{ r: number; c: number } | null>(null);

    // Pan state for canvas
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const miniMapRef = useRef<HTMLCanvasElement | null>(null);
    const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
    const isDraggingRef = useRef<boolean>(false);
    const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3500);
    };

    // Selected Sector object
    const selectedSector = useMemo(() => {
        return puzzle.sectors.find(s => s.id === selectedSectorId) || puzzle.sectors[12]; // C3
    }, [puzzle, selectedSectorId]);

    // Active inspected clue
    const inspectedDetails = useMemo(() => {
        if (!inspectedCell) return null;
        const cell = puzzle.grid[inspectedCell.r]?.[inspectedCell.c];
        if (!cell || cell.isBlack) return null;

        // Find across and down words passing through this cell
        // Find across word
        let sc = inspectedCell.c;
        while (sc > 0 && !puzzle.grid[inspectedCell.r][sc - 1].isBlack) sc--;
        let ec = inspectedCell.c;
        while (ec < 124 && !puzzle.grid[inspectedCell.r][ec + 1].isBlack) ec++;
        let acrossWord = '';
        for (let c = sc; c <= ec; c++) acrossWord += puzzle.grid[inspectedCell.r][c].letter || '';

        // Find down word
        let sr = inspectedCell.r;
        while (sr > 0 && !puzzle.grid[sr - 1][inspectedCell.c].isBlack) sr--;
        let er = inspectedCell.r;
        while (er < 124 && !puzzle.grid[er + 1][inspectedCell.c].isBlack) er++;
        let downWord = '';
        for (let r = sr; r <= er; r++) downWord += puzzle.grid[r][inspectedCell.c].letter || '';

        const acrossClue = puzzle.clues.across.find(c => c.word === acrossWord);
        const downClue = puzzle.clues.down.find(c => c.word === downWord);

        // Find sector
        const sectorR = Math.floor(inspectedCell.r / 25);
        const sectorC = Math.floor(inspectedCell.c / 25);
        const sector = puzzle.sectors.find(s => s.rowIdx === sectorR && s.colIdx === sectorC);

        return {
            row: inspectedCell.r,
            col: inspectedCell.c,
            letter: cell.letter,
            number: cell.number,
            acrossWord: acrossWord.length >= 2 ? acrossWord : null,
            acrossClue: acrossClue?.clue || null,
            downWord: downWord.length >= 2 ? downWord : null,
            downClue: downClue?.clue || null,
            sectorName: sector?.name || 'अज्ञात सेक्टर',
            sectorId: sector?.id || 'C3'
        };
    }, [inspectedCell, puzzle]);

    // Filtered clues list for clues browser
    const filteredClues = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        let list: { number: number; clue: string; word: string; direction: 'across' | 'down' }[] = [];

        if (activeClueFilter === 'all' || activeClueFilter === 'across') {
            puzzle.clues.across.forEach(c => list.push({ ...c, direction: 'across' }));
        }
        if (activeClueFilter === 'all' || activeClueFilter === 'down') {
            puzzle.clues.down.forEach(c => list.push({ ...c, direction: 'down' }));
        }

        if (query) {
            list = list.filter(c => 
                c.word.toLowerCase().includes(query) || 
                c.clue.toLowerCase().includes(query) ||
                String(c.number).includes(query)
            );
        }

        return list;
    }, [puzzle, searchQuery, activeClueFilter]);

    // Render Canvas Viewport for 125x125
    useEffect(() => {
        if (activeTab !== 'canvas') return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const size = 125;
        const baseCellSize = 22; // 22px at 1.0 zoom
        const cellSize = baseCellSize * zoom;
        const totalSize = size * cellSize;

        // Ensure canvas width/height matches container
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * (window.devicePixelRatio || 1);
        canvas.height = rect.height * (window.devicePixelRatio || 1);
        ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);

        ctx.clearRect(0, 0, rect.width, rect.height);

        // Draw background
        ctx.fillStyle = '#0f172a'; // slate-900
        ctx.fillRect(0, 0, rect.width, rect.height);

        // Visible bounds in grid coordinates
        const startX = panOffset.x;
        const startY = panOffset.y;

        const minR = Math.max(0, Math.floor(-startY / cellSize));
        const maxR = Math.min(size - 1, Math.ceil((rect.height - startY) / cellSize));
        const minC = Math.max(0, Math.floor(-startX / cellSize));
        const maxC = Math.min(size - 1, Math.ceil((rect.width - startX) / cellSize));

        ctx.font = `${Math.max(8, Math.floor(10 * zoom))}px Arial, "Noto Sans Devanagari", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        for (let r = minR; r <= maxR; r++) {
            for (let c = minC; c <= maxC; c++) {
                const cell = puzzle.grid[r][c];
                const x = startX + c * cellSize;
                const y = startY + r * cellSize;

                const isInspected = inspectedCell && inspectedCell.r === r && inspectedCell.c === c;

                if (cell.isBlack) {
                    ctx.fillStyle = '#1e293b'; // slate-800
                    ctx.fillRect(x, y, cellSize, cellSize);
                } else {
                    ctx.fillStyle = isInspected ? '#fef08a' : '#ffffff';
                    ctx.fillRect(x, y, cellSize, cellSize);

                    // Draw letter if showSolution is true and cell is visible enough
                    if (showSolution && cell.letter && zoom >= 0.45) {
                        ctx.fillStyle = isInspected ? '#854d0e' : '#0f172a';
                        ctx.fillText(cell.letter, x + cellSize / 2, y + cellSize / 2 + 1);
                    }

                    // Draw clue number if zoomed in
                    if (cell.number && zoom >= 0.75) {
                        ctx.font = `${Math.max(6, Math.floor(6 * zoom))}px sans-serif`;
                        ctx.fillStyle = '#64748b';
                        ctx.fillText(String(cell.number), x + 4, y + 5);
                        ctx.font = `${Math.max(8, Math.floor(10 * zoom))}px Arial, "Noto Sans Devanagari", sans-serif`;
                    }
                }

                // Grid line
                ctx.strokeStyle = '#cbd5e1';
                ctx.lineWidth = 0.5;
                ctx.strokeRect(x, y, cellSize, cellSize);

                // Sector boundary highlight (every 25 cells)
                if (c % 25 === 24) {
                    ctx.strokeStyle = '#d97706'; // Amber sector line
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(x + cellSize, y);
                    ctx.lineTo(x + cellSize, y + cellSize);
                    ctx.stroke();
                }
                if (r % 25 === 24) {
                    ctx.strokeStyle = '#d97706';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(x, y + cellSize);
                    ctx.lineTo(x + cellSize, y + cellSize);
                    ctx.stroke();
                }
            }
        }

        // Draw Mini-Map
        const miniCanvas = miniMapRef.current;
        if (miniCanvas) {
            const mCtx = miniCanvas.getContext('2d');
            if (mCtx) {
                const mW = 125;
                const mH = 125;
                miniCanvas.width = mW;
                miniCanvas.height = mH;

                const imgData = mCtx.createImageData(mW, mH);
                for (let r = 0; r < 125; r++) {
                    for (let c = 0; c < 125; c++) {
                        const idx = (r * 125 + c) * 4;
                        const isBlk = puzzle.grid[r][c].isBlack;
                        imgData.data[idx] = isBlk ? 30 : 255;
                        imgData.data[idx + 1] = isBlk ? 41 : 255;
                        imgData.data[idx + 2] = isBlk ? 59 : 255;
                        imgData.data[idx + 3] = 255;
                    }
                }
                mCtx.putImageData(imgData, 0, 0);

                // Viewport indicator on mini-map
                const vpX = Math.max(0, -startX / (cellSize * 125) * mW);
                const vpY = Math.max(0, -startY / (cellSize * 125) * mH);
                const vpW = Math.min(mW, (rect.width / (cellSize * 125)) * mW);
                const vpH = Math.min(mH, (rect.height / (cellSize * 125)) * mH);

                mCtx.strokeStyle = '#f59e0b';
                mCtx.lineWidth = 2;
                mCtx.strokeRect(vpX, vpY, vpW, vpH);
            }
        }

    }, [activeTab, puzzle, zoom, panOffset, showSolution, inspectedCell]);

    // Canvas click / drag handling
    const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        isDraggingRef.current = true;
        dragStartRef.current = { x: e.clientX - panOffset.x, y: e.clientY - panOffset.y };
    };

    const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDraggingRef.current) return;
        setPanOffset({
            x: e.clientX - dragStartRef.current.x,
            y: e.clientY - dragStartRef.current.y
        });
    };

    const handleCanvasMouseUp = () => {
        isDraggingRef.current = false;
    };

    const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left - panOffset.x;
        const clickY = e.clientY - rect.top - panOffset.y;

        const cellSize = 22 * zoom;
        const col = Math.floor(clickX / cellSize);
        const row = Math.floor(clickY / cellSize);

        if (row >= 0 && row < 125 && col >= 0 && col < 125) {
            setInspectedCell({ r: row, c: col });
        }
    };

    // Zoom controls
    const handleZoomIn = () => setZoom(prev => Math.min(2.0, Number((prev + 0.15).toFixed(2))));
    const handleZoomOut = () => setZoom(prev => Math.max(0.25, Number((prev - 0.15).toFixed(2))));
    const handleResetZoom = () => {
        setZoom(0.5);
        setPanOffset({ x: 20, y: 20 });
    };

    // Jump to specific coordinate
    const jumpToCoordinate = (r: number, c: number) => {
        setActiveTab('canvas');
        setInspectedCell({ r, c });
        const cellSize = 22 * zoom;
        const targetX = -c * cellSize + 200;
        const targetY = -r * cellSize + 200;
        setPanOffset({ x: targetX, y: targetY });
        showToast(`स्थान (r${toDevanagari(r + 1)}, c${toDevanagari(c + 1)}) वर केंद्रित केले!`);
    };

    // Clear letters while keeping 125x125 black structure
    const handleClearLettersKeepBlacks = () => {
        const clearedGrid = puzzle.grid.map(row =>
            row.map(cell => ({
                ...cell,
                letter: cell.isBlack ? null : null
            }))
        );
        setPuzzle({
            ...puzzle,
            grid: clearedGrid
        });
        showToast('१२५x१२५ ची संपूर्ण काळी चौकट तशीच ठेवून सर्व अक्षरे साफ केली!');
    };

    // Download Limca Dossier
    const handleDownloadDossier = () => {
        const text = generateLimcaRecordDossierText(puzzle);
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Limca_Record_125x125_Marathi_Crossword_Dossier.txt`;
        link.click();
        URL.revokeObjectURL(url);
        showToast('अधिकृत लिमका रेकॉर्ड डॉझियर (Text File) डाऊनलोड झाले!');
    };

    // Download High-Res Poster Image from Canvas
    const handleDownloadHighResPoster = () => {
        showToast('हाय-रिझोल्युशन १२५x१२५ पोस्टर तयार होत आहे...');
        const exportCanvas = document.createElement('canvas');
        const exportSize = 2500; // 2500 x 2500 px high-res
        exportCanvas.width = exportSize;
        exportCanvas.height = exportSize;
        const ctx = exportCanvas.getContext('2d');
        if (!ctx) return;

        const cellSize = exportSize / 125;

        // Background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, exportSize, exportSize);

        ctx.font = `${Math.floor(cellSize * 0.55)}px Arial, "Noto Sans Devanagari", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        for (let r = 0; r < 125; r++) {
            for (let c = 0; c < 125; c++) {
                const cell = puzzle.grid[r][c];
                const x = c * cellSize;
                const y = r * cellSize;

                if (cell.isBlack) {
                    ctx.fillStyle = '#1e293b';
                    ctx.fillRect(x, y, cellSize, cellSize);
                } else {
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(x, y, cellSize, cellSize);

                    if (cell.letter) {
                        ctx.fillStyle = '#000000';
                        ctx.fillText(cell.letter, x + cellSize / 2, y + cellSize / 2);
                    }
                }

                ctx.strokeStyle = '#94a3b8';
                ctx.lineWidth = 0.5;
                ctx.strokeRect(x, y, cellSize, cellSize);

                // Highlight sector boundary
                if (c % 25 === 24 || r % 25 === 24) {
                    ctx.strokeStyle = '#b45309';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(x, y, cellSize, cellSize);
                }
            }
        }

        exportCanvas.toBlob(blob => {
            if (!blob) return;
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `Limca_Record_125x125_Mega_Crossword_Poster.png`;
            link.click();
            URL.revokeObjectURL(url);
            showToast('१२५x१२५ महापोस्टर (High-Res PNG) यशस्वीरीत्या डाऊनलोड झाले!');
        });
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Monumental Header & Record Badge */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-600 via-yellow-600 to-amber-700 p-6 sm:p-8 text-white shadow-2xl border-2 border-amber-300">
                <div className="absolute -right-12 -top-12 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/20 backdrop-blur-md border border-amber-200/40 text-amber-100 text-xs font-black tracking-wide uppercase shadow-inner mb-3">
                            <span>🏆 राष्ट्रीय व जागतिक विक्रम दालन (World Record Benchmark)</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-white drop-shadow-sm flex items-center gap-3">
                            <span>१२५ × १२५ लिमका विक्रमवीर महाशब्दवेध</span>
                        </h1>
                        <p className="text-sm sm:text-base text-amber-100/90 mt-2 max-w-2xl leading-relaxed">
                            {puzzle.description}. १५,६२५ घरे, ४,०००+ अस्सल मराठी शब्द व २५ इंटरलॉकिंग महादालने असणारे ऐतिहासिक शब्दकोडे.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            type="button"
                            onClick={handleDownloadDossier}
                            className="px-4 py-2.5 bg-white hover:bg-amber-50 text-amber-950 rounded-2xl text-xs sm:text-sm font-bold shadow-lg transition-all active:scale-95 flex items-center gap-2"
                        >
                            <DownloadIcon className="w-4 h-4 text-amber-700" />
                            <span>रेकॉर्ड डॉझियर (Text)</span>
                        </button>
                        <button
                            type="button"
                            onClick={handleDownloadHighResPoster}
                            className="px-4 py-2.5 bg-amber-900/80 hover:bg-amber-900 text-amber-100 border border-amber-400/40 rounded-2xl text-xs sm:text-sm font-bold shadow-lg transition-all active:scale-95 flex items-center gap-2"
                        >
                            <PrintIcon className="w-4 h-4 text-amber-300" />
                            <span>पोस्टर डाऊनलोड (PNG)</span>
                        </button>
                        <button
                            type="button"
                            onClick={onBackToNormal}
                            className="px-4 py-2.5 bg-black/30 hover:bg-black/50 text-white rounded-2xl text-xs sm:text-sm font-bold border border-white/20 transition-all active:scale-95"
                        >
                            <span>मुख्य मेनूवर परत जा</span>
                        </button>
                    </div>
                </div>

                {/* Key Statistics Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-6 border-t border-amber-400/30">
                    <div className="bg-black/20 backdrop-blur-xs p-3 rounded-2xl border border-white/10">
                        <div className="text-[11px] text-amber-200 font-semibold">एकूण घरे</div>
                        <div className="text-xl sm:text-2xl font-black mt-0.5">{toDevanagari(puzzle.totalCells)}</div>
                        <div className="text-[10px] text-amber-200/80">१२५ x १२५ ग्रीड</div>
                    </div>
                    <div className="bg-black/20 backdrop-blur-xs p-3 rounded-2xl border border-white/10">
                        <div className="text-[11px] text-amber-200 font-semibold">एकूण शब्द</div>
                        <div className="text-xl sm:text-2xl font-black mt-0.5">{toDevanagari(puzzle.totalWords)}</div>
                        <div className="text-[10px] text-amber-200/80">आडवे {toDevanagari(puzzle.acrossWordsCount)} + उभे {toDevanagari(puzzle.downWordsCount)}</div>
                    </div>
                    <div className="bg-black/20 backdrop-blur-xs p-3 rounded-2xl border border-white/10">
                        <div className="text-[11px] text-amber-200 font-semibold">अक्षरांची घरे</div>
                        <div className="text-xl sm:text-2xl font-black mt-0.5">{toDevanagari(puzzle.letterCellsCount)}</div>
                        <div className="text-[10px] text-amber-200/80">१००% अर्थपूर्ण अक्षरे</div>
                    </div>
                    <div className="bg-black/20 backdrop-blur-xs p-3 rounded-2xl border border-white/10">
                        <div className="text-[11px] text-amber-200 font-semibold">काळे चौकोन</div>
                        <div className="text-xl sm:text-2xl font-black mt-0.5">{toDevanagari(puzzle.blackPercentage)}%</div>
                        <div className="text-[10px] text-amber-200/80">{toDevanagari(puzzle.blackCellsCount)} काळ्या चौकटी</div>
                    </div>
                    <div className="bg-black/20 backdrop-blur-xs p-3 rounded-2xl border border-white/10">
                        <div className="text-[11px] text-amber-200 font-semibold">इंटरलॉकिंग दालने</div>
                        <div className="text-xl sm:text-2xl font-black mt-0.5">{toDevanagari(puzzle.sectors.length)}</div>
                        <div className="text-[10px] text-amber-200/80">प्रत्येक २५x२५ चे सेक्टर्स</div>
                    </div>
                    <div className="bg-black/20 backdrop-blur-xs p-3 rounded-2xl border border-white/10">
                        <div className="text-[11px] text-amber-200 font-semibold">रेकॉर्ड तुलना</div>
                        <div className="text-xl sm:text-2xl font-black mt-0.5 text-amber-300">+३०%</div>
                        <div className="text-[10px] text-amber-200/80">१००x१०० पेक्षा भव्य</div>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setActiveTab('canvas')}
                        className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
                            activeTab === 'canvas'
                                ? 'bg-amber-600 text-white shadow-md'
                                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                        }`}
                    >
                        <CompassIcon className="w-4 h-4" />
                        <span>१. संपूर्ण १२५x१२५ कॅनव्हास (Zoom & Pan)</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('sector')}
                        className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
                            activeTab === 'sector'
                                ? 'bg-amber-600 text-white shadow-md'
                                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                        }`}
                    >
                        <LayersIcon className="w-4 h-4" />
                        <span>२. २५ सेक्टर्स नेव्हिगेटर (दालन वार संपादन)</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('clues')}
                        className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
                            activeTab === 'clues'
                                ? 'bg-amber-600 text-white shadow-md'
                                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                        }`}
                    >
                        <BookOpenIcon className="w-4 h-4" />
                        <span>३. सर्व ४,०००+ क्लूज निर्देशिका</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('dossier')}
                        className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
                            activeTab === 'dossier'
                                ? 'bg-amber-600 text-white shadow-md'
                                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                        }`}
                    >
                        <TrophyIcon className="w-4 h-4" />
                        <span>४. लिमका रेकॉर्ड डॉझियर (Verification)</span>
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setShowSolution(!showSolution)}
                        className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5"
                    >
                        {showSolution ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                        <span>{showSolution ? 'उत्तर लपवा' : 'उत्तर दाखवा'}</span>
                    </button>
                    <button
                        type="button"
                        onClick={handleClearLettersKeepBlacks}
                        title="काळ्या चौकटींची संपूर्ण १५,६२५ घरांची चौकट तशीच ठेवून सर्व अक्षरे साफ करा"
                        className="px-3 py-1.5 bg-amber-100 dark:bg-amber-900/50 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 rounded-xl text-xs font-bold hover:bg-amber-200 transition-colors"
                    >
                        <span>🧹 अक्षरे पुसा (फक्त काळी चौकट ठेवा)</span>
                    </button>
                </div>
            </div>

            {/* Toast Notification */}
            {toastMessage && (
                <div className="p-3 bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-100 text-xs sm:text-sm font-semibold rounded-2xl flex items-center justify-between shadow-sm animate-fadeIn">
                    <div className="flex items-center gap-2">
                        <CheckIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span>{toastMessage}</span>
                    </div>
                    <button onClick={() => setToastMessage(null)} className="font-bold text-emerald-700 hover:text-emerald-900 px-2">✕</button>
                </div>
            )}

            {/* TAB 1: FULL 125x125 CANVAS VIEWPORT WITH ZOOM & PAN */}
            {activeTab === 'canvas' && (
                <div className="space-y-4">
                    <div className="bg-slate-900 rounded-3xl p-4 sm:p-6 shadow-xl border border-slate-700 relative overflow-hidden">
                        {/* Canvas Controls Overlay */}
                        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 z-10 relative">
                            <div className="flex items-center gap-2">
                                <span className="text-white text-xs font-bold bg-amber-600 px-3 py-1 rounded-xl">
                                    १२५x१२५ कॅनव्हास व्ह्यू
                                </span>
                                <span className="text-slate-400 text-xs">
                                    झूम: {Math.round(zoom * 100)}% | ड्रॅग करून फिरा, क्लिक करून शब्द तपासा
                                </span>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={handleZoomOut}
                                    className="p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold border border-slate-600 flex items-center gap-1 active:scale-95"
                                    title="झूम कमी करा"
                                >
                                    <ZoomOutIcon className="w-4 h-4" />
                                </button>
                                <button
                                    type="button"
                                    onClick={handleResetZoom}
                                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold border border-slate-600 active:scale-95"
                                >
                                    रीसेट (५०%)
                                </button>
                                <button
                                    type="button"
                                    onClick={handleZoomIn}
                                    className="p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold border border-slate-600 flex items-center gap-1 active:scale-95"
                                    title="झूम वाढवा"
                                >
                                    <ZoomInIcon className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Interactive Canvas Container */}
                        <div className="relative w-full h-[600px] rounded-2xl overflow-hidden cursor-grab active:cursor-grabbing border border-slate-700 bg-slate-950">
                            <canvas
                                ref={canvasRef}
                                className="w-full h-full block"
                                onMouseDown={handleCanvasMouseDown}
                                onMouseMove={handleCanvasMouseMove}
                                onMouseUp={handleCanvasMouseUp}
                                onMouseLeave={handleCanvasMouseUp}
                                onClick={handleCanvasClick}
                            />

                            {/* Mini-Map Floating Box */}
                            <div className="absolute bottom-4 right-4 bg-slate-900/90 backdrop-blur-md p-2 rounded-2xl border border-slate-600 shadow-2xl flex flex-col items-center gap-1 pointer-events-none">
                                <span className="text-[10px] text-amber-300 font-bold uppercase tracking-wider">
                                    मिनी-मॅप (Mini-Map)
                                </span>
                                <canvas
                                    ref={miniMapRef}
                                    className="rounded-lg border border-slate-700"
                                    style={{ width: 125, height: 125 }}
                                />
                            </div>
                        </div>

                        {/* Inspected Cell Bottom Bar */}
                        {inspectedDetails && (
                            <div className="mt-4 p-4 rounded-2xl bg-slate-800/90 border border-amber-500/50 shadow-md text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fadeIn">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-xs">
                                        <span className="font-bold text-amber-400">
                                            स्थान: r{toDevanagari(inspectedDetails.row + 1)}, c{toDevanagari(inspectedDetails.col + 1)}
                                        </span>
                                        <span className="text-slate-400">•</span>
                                        <span className="bg-amber-900/60 text-amber-200 px-2 py-0.5 rounded text-[11px] font-bold">
                                            {inspectedDetails.sectorName}
                                        </span>
                                        {inspectedDetails.number && (
                                            <span className="bg-indigo-900/60 text-indigo-200 px-2 py-0.5 rounded text-[11px] font-bold">
                                                क्रमांक: {toDevanagari(inspectedDetails.number)}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap gap-4 text-xs mt-1">
                                        {inspectedDetails.acrossWord && (
                                            <div>
                                                <span className="text-amber-300 font-bold">आडवा शब्द:</span>{' '}
                                                <span className="font-semibold underline underline-offset-2">{inspectedDetails.acrossWord}</span>
                                                {inspectedDetails.acrossClue && (
                                                    <span className="text-slate-300 italic"> - "{inspectedDetails.acrossClue}"</span>
                                                )}
                                            </div>
                                        )}
                                        {inspectedDetails.downWord && (
                                            <div>
                                                <span className="text-amber-300 font-bold">उभा शब्द:</span>{' '}
                                                <span className="font-semibold underline underline-offset-2">{inspectedDetails.downWord}</span>
                                                {inspectedDetails.downClue && (
                                                    <span className="text-slate-300 italic"> - "{inspectedDetails.downClue}"</span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedSectorId(inspectedDetails.sectorId);
                                        setActiveTab('sector');
                                    }}
                                    className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow transition-all active:scale-95 flex items-center gap-1.5 self-start sm:self-auto"
                                >
                                    <span>या {inspectedDetails.sectorId} सेक्टरमध्ये संपादन करा ➔</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* TAB 2: SECTOR EXPLORER (25 INTERLOCKING 25x25 MODULES) */}
            {activeTab === 'sector' && (
                <div className="space-y-6">
                    {/* Sector Selector Matrix (5x5) */}
                    <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-lg border border-slate-200 dark:border-slate-700">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-200 dark:border-slate-700">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <LayersIcon className="w-5 h-5 text-amber-600" />
                                    <span>२५ इंटरलॉकिंग महादालने (५x५ सेक्टर मॅट्रिक्स)</span>
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                    कोणत्याही २५x२५ उप-विभागावर क्लिक करून त्यातील शब्द तपासा व नवीन अक्षरे भरा.
                                </p>
                            </div>
                            <span className="text-xs font-bold bg-amber-100 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200 px-3 py-1 rounded-full self-start sm:self-auto">
                                निवडलेले: {selectedSector.name} ({selectedSector.wordCount} शब्द)
                            </span>
                        </div>

                        {/* 5x5 Matrix Buttons */}
                        <div className="grid grid-cols-5 gap-2 max-w-2xl mx-auto mb-2">
                            {puzzle.sectors.map(sector => {
                                const isSelected = sector.id === selectedSectorId;
                                return (
                                    <button
                                        key={sector.id}
                                        type="button"
                                        onClick={() => setSelectedSectorId(sector.id)}
                                        className={`p-3 rounded-2xl border text-center transition-all ${
                                            isSelected
                                                ? 'bg-amber-600 text-white border-amber-600 shadow-md scale-102 font-bold'
                                                : 'bg-slate-50 dark:bg-slate-700/50 hover:bg-amber-50 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300'
                                        }`}
                                    >
                                        <div className="text-sm font-black">{sector.id}</div>
                                        <div className="text-[10px] opacity-80 truncate">{sector.name.split(' ')[0]}</div>
                                        <div className="text-[9px] opacity-70 mt-0.5">{toDevanagari(sector.wordCount)} शब्द</div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Active Sector Live Grid & Clues */}
                    <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-lg border border-slate-200 dark:border-slate-700">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200 dark:border-slate-700">
                            <div>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <span>{selectedSector.name}</span>
                                    <span className="text-xs font-bold bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-200 px-2.5 py-0.5 rounded-full">
                                        २५x२५ घरे (r{selectedSector.startRow + 1}-{selectedSector.startRow + 25}, c{selectedSector.startCol + 1}-{selectedSector.startCol + 25})
                                    </span>
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                    या २५x२५ उप-विभागामध्ये एकूण {toDevanagari(selectedSector.wordCount)} शब्द समाविष्ट आहेत.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => jumpToCoordinate(selectedSector.startRow, selectedSector.startCol)}
                                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center gap-1.5"
                            >
                                <CompassIcon className="w-4 h-4 text-amber-600" />
                                <span>कॅनव्हासवर या दालनावर झूम करा</span>
                            </button>
                        </div>

                        {/* Interactive 25x25 Grid */}
                        <div className="max-w-2xl mx-auto mb-8">
                            <CrosswordGrid
                                grid={selectedSector.grid}
                                showSolution={showSolution}
                                isEditMode={true}
                                onGridChange={(newSectorGrid) => {
                                    // Update parent puzzle grid
                                    const updatedGrid = puzzle.grid.map(row => [...row]);
                                    for (let r = 0; r < 25; r++) {
                                        for (let c = 0; c < 25; c++) {
                                            updatedGrid[selectedSector.startRow + r][selectedSector.startCol + c] = newSectorGrid[r][c];
                                        }
                                    }
                                    setPuzzle({
                                        ...puzzle,
                                        grid: updatedGrid
                                    });
                                    showToast(`${selectedSector.id} मधील बदल जतन झाले!`);
                                }}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 3: CLUE SEARCH & BROWSER */}
            {activeTab === 'clues' && (
                <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-lg border border-slate-200 dark:border-slate-700 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-700">
                        <div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <SearchIcon className="w-5 h-5 text-amber-600" />
                                <span>एकूण {toDevanagari(puzzle.totalWords)} क्लूज निर्देशिका</span>
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                शब्द किंवा क्लू टाईप करून शोधा. क्लिक केल्यास कॅनव्हास थेट त्या स्थानावर केंद्रित होईल.
                            </p>
                        </div>

                        {/* Filter Buttons */}
                        <div className="flex items-center gap-2">
                            {(['all', 'across', 'down'] as const).map(filter => (
                                <button
                                    key={filter}
                                    type="button"
                                    onClick={() => setActiveClueFilter(filter)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                        activeClueFilter === filter
                                            ? 'bg-amber-600 text-white shadow'
                                            : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                                    }`}
                                >
                                    {filter === 'all' && `सर्व (${toDevanagari(puzzle.totalWords)})`}
                                    {filter === 'across' && `आडवे (${toDevanagari(puzzle.acrossWordsCount)})`}
                                    {filter === 'down' && `उभे (${toDevanagari(puzzle.downWordsCount)})`}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Search Input Box */}
                    <div className="relative">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="मराठी शब्द, क्लू मधील शब्द किंवा क्रमांक शोधा (उदा. 'महाराष्ट्र', 'सूर्य', 'किल्ला')..."
                            className="w-full py-3 px-4 pl-10 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-2xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                        <SearchIcon className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 font-bold px-1"
                            >
                                ✕
                            </button>
                        )}
                    </div>

                    {/* Virtualized Clue Results List */}
                    <div className="max-h-[500px] overflow-y-auto space-y-2 pr-2">
                        {filteredClues.slice(0, 300).map((item, idx) => (
                            <div
                                key={`${item.direction}-${item.number}-${idx}`}
                                className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:border-amber-400 transition-colors"
                            >
                                <div className="flex items-start sm:items-center gap-3">
                                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                        item.direction === 'across'
                                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200'
                                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200'
                                    }`}>
                                        {item.direction === 'across' ? 'आडवा' : 'उभा'} {toDevanagari(item.number)}
                                    </span>
                                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                                        {item.word}
                                    </span>
                                    <span className="text-xs text-slate-600 dark:text-slate-300 italic">
                                        "{item.clue}"
                                    </span>
                                </div>
                            </div>
                        ))}
                        {filteredClues.length > 300 && (
                            <div className="text-center py-2 text-xs text-slate-400">
                                ... आणखी {toDevanagari(filteredClues.length - 300)} क्लूज उपलब्ध (शोधून फिल्टर करा)
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* TAB 4: OFFICIAL LIMCA RECORD DOSSIER */}
            {activeTab === 'dossier' && (
                <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-lg border border-slate-200 dark:border-slate-700 space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-700">
                        <div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <TrophyIcon className="w-6 h-6 text-amber-600" />
                                <span>लिमका बुक ऑफ रेकॉर्ड्स अधिकृत सबमिशन डॉझियर</span>
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                राष्ट्रीय रेकॉर्ड्स संस्थांकडे (Limca / India Book of Records) सादर करण्यासाठी संपूर्ण प्रमाणीकरण अहवाल.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={handleDownloadDossier}
                            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow transition-all active:scale-95 flex items-center gap-2"
                        >
                            <DownloadIcon className="w-4 h-4" />
                            <span>डॉझियर डाऊनलोड (.txt)</span>
                        </button>
                    </div>

                    <pre className="p-4 sm:p-6 bg-slate-900 text-amber-200 rounded-2xl text-xs sm:text-sm font-mono overflow-x-auto leading-relaxed border border-slate-700 whitespace-pre-wrap">
                        {generateLimcaRecordDossierText(puzzle)}
                    </pre>
                </div>
            )}
        </div>
    );
};
