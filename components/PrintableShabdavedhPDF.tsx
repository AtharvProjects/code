import React, { forwardRef } from 'react';
import { PuzzleData } from '../types';
import { sanitizeClue } from '../services/marathiDictionary';

interface PrintableShabdavedhPDFProps {
    puzzleData: PuzzleData;
    page1Ref: React.RefObject<HTMLDivElement | null>;
    page2Ref: React.RefObject<HTMLDivElement | null>;
    fontSizePt?: number;
    gridSizeOption?: 'jumbo' | 'standard';
    themeName?: string;
}

const devanagariDigits = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];

export const toDevanagari = (num: number | null | undefined): string => {
    if (num === null || num === undefined || isNaN(num)) return '';
    return String(num).split('').map(digit => devanagariDigits[parseInt(digit, 10)] ?? digit).join('');
};

export function getGraphemes(word: string): string[] {
    if (!word) return [];
    if (typeof (Intl as any)?.Segmenter !== 'function') {
        return [...word];
    }
    try {
        const segmenter = new (Intl as any).Segmenter('mr', { granularity: 'grapheme' });
        return Array.from(segmenter.segment(word)).map((s: any) => s.segment);
    } catch {
        return [...word];
    }
}

export const PrintableShabdavedhPDF: React.FC<PrintableShabdavedhPDFProps> = ({
    puzzleData,
    page1Ref,
    page2Ref,
    fontSizePt = 18,
    gridSizeOption = 'jumbo',
    themeName,
}) => {
    if (!puzzleData || !puzzleData.grid || puzzleData.grid.length === 0) return null;

    const grid = puzzleData.grid;
    const size = grid.length;

    // Strictly sort clues in ascending numerical order (१, २, ३, ४, ५...) so no numbers appear out of place
    const sortedAcrossClues = [...(puzzleData.clues.across || [])].sort((a, b) => a.number - b.number);
    const sortedDownClues = [...(puzzleData.clues.down || [])].sort((a, b) => a.number - b.number);

    const acrossCount = sortedAcrossClues.length;
    const downCount = sortedDownClues.length;
    const totalClues = acrossCount + downCount;

    // Automatically split into 2 sub-columns if either side has many clues (>= 22)
    // This permanently prevents any clues from running past the page boundary
    const useAcrossMultiCol = acrossCount >= 22;
    const useDownMultiCol = downCount >= 22;
    const effectiveAcrossItems = useAcrossMultiCol ? Math.ceil(acrossCount / 2) : acrossCount;
    const effectiveDownItems = useDownMultiCol ? Math.ceil(downCount / 2) : downCount;
    const effectiveMaxItems = Math.max(effectiveAcrossItems, effectiveDownItems);

    // Dynamic adaptive sizing ensuring 100% of clues and answers are printed completely without any clipping
    let page1GridTargetPx: number;
    let page2GridTargetPx: number;
    let clueFontPt: number;
    let clueLineHeightNum: number;
    let clueMarginBottomPx: number;
    let clueHeaderPt: number;
    let columnGapPx: number;
    let pagePaddingTopPx: number;
    let pagePaddingBottomPx: number;
    let headerPaddingPy: number;
    let headerFontSizePx: number;
    let notePaddingPy: number;
    let noteFontSizePx: number;
    let clueNumberWidth: string;
    let clueNumberMarginRightPx: number;
    let gridMarginYPx: number;
    let clueHeaderMarginBottomPx: number;
    let bannerPaddingPy: number;
    let bannerTitleFontSizePx: number;

    if (effectiveMaxItems <= 12) {
        page1GridTargetPx = size <= 5 ? 320 : size <= 8 ? 340 : 350;
        page2GridTargetPx = size <= 6 ? 250 : 270;
        clueFontPt = 9.2;
        clueLineHeightNum = 1.28;
        clueMarginBottomPx = 2.4;
        clueHeaderPt = 11.5;
        columnGapPx = 18;
        pagePaddingTopPx = 10;
        pagePaddingBottomPx = 8;
        headerPaddingPy = 5;
        headerFontSizePx = 18;
        notePaddingPy = 5;
        noteFontSizePx = 9;
        clueNumberWidth = '20px';
        clueNumberMarginRightPx = 5;
        gridMarginYPx = 5;
        clueHeaderMarginBottomPx = 4;
        bannerPaddingPy = 8;
        bannerTitleFontSizePx = 22;
    } else if (effectiveMaxItems <= 16) {
        page1GridTargetPx = size <= 8 ? 290 : size <= 10 ? 270 : 240;
        page2GridTargetPx = size <= 8 ? 235 : 220;
        clueFontPt = 8.0;
        clueLineHeightNum = 1.20;
        clueMarginBottomPx = 1.6;
        clueHeaderPt = 10.5;
        columnGapPx = 14;
        pagePaddingTopPx = 8;
        pagePaddingBottomPx = 7;
        headerPaddingPy = 4.5;
        headerFontSizePx = 17;
        notePaddingPy = 4;
        noteFontSizePx = 8.5;
        clueNumberWidth = '18px';
        clueNumberMarginRightPx = 4;
        gridMarginYPx = 4;
        clueHeaderMarginBottomPx = 3.5;
        bannerPaddingPy = 6.5;
        bannerTitleFontSizePx = 20;
    } else if (effectiveMaxItems <= 20) {
        page1GridTargetPx = size <= 10 ? 245 : size <= 12 ? 220 : 200;
        page2GridTargetPx = size <= 10 ? 210 : 190;
        clueFontPt = 7.2;
        clueLineHeightNum = 1.16;
        clueMarginBottomPx = 1.2;
        clueHeaderPt = 9.5;
        columnGapPx = 12;
        pagePaddingTopPx = 7;
        pagePaddingBottomPx = 6;
        headerPaddingPy = 3.5;
        headerFontSizePx = 16;
        notePaddingPy = 3.5;
        noteFontSizePx = 8.0;
        clueNumberWidth = '17px';
        clueNumberMarginRightPx = 3.5;
        gridMarginYPx = 3.5;
        clueHeaderMarginBottomPx = 3;
        bannerPaddingPy = 5.5;
        bannerTitleFontSizePx = 18.5;
    } else {
        // effectiveMaxItems > 20 (e.g. 15x15 with 48 across clues => 24 per sub-column)
        page1GridTargetPx = size <= 12 ? 210 : 190;
        page2GridTargetPx = 170;
        clueFontPt = 6.5;
        clueLineHeightNum = 1.13;
        clueMarginBottomPx = 0.8;
        clueHeaderPt = 8.8;
        columnGapPx = 10;
        pagePaddingTopPx = 6;
        pagePaddingBottomPx = 5;
        headerPaddingPy = 3;
        headerFontSizePx = 15;
        notePaddingPy = 3;
        noteFontSizePx = 7.6;
        clueNumberWidth = '15px';
        clueNumberMarginRightPx = 3;
        gridMarginYPx = 2.5;
        clueHeaderMarginBottomPx = 2.5;
        bannerPaddingPy = 4.5;
        bannerTitleFontSizePx = 17;
    }

    // Grid cell & font dimensions computed from adaptive grid targets
    const page1CellSizePx = Math.max(12, Math.floor(page1GridTargetPx / size));
    const page1NumberFontSizePx = Math.max(6, Math.floor(page1CellSizePx * 0.33));

    const page2CellSizePx = Math.max(10, Math.floor(page2GridTargetPx / size));
    const page2LetterFontSizePx = Math.max(7, Math.floor(page2CellSizePx * 0.58));
    const page2NumberFontSizePx = Math.max(4, Math.floor(page2CellSizePx * 0.28));

    const clueFontSize = `${clueFontPt}pt`;
    const clueHeaderSize = `${clueHeaderPt}pt`;
    const clueLineHeight = `${clueLineHeightNum}`;
    const clueMarginBottom = `${clueMarginBottomPx}px`;

    const renderClueItem = (clue: { number: number; word: string; clue: string }, color: string, isAcross: boolean) => {
        const aksharaCount = getGraphemes(clue.word).length;
        return (
            <div
                key={`${isAcross ? 'across' : 'down'}-clue-${clue.number}`}
                style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    fontSize: clueFontSize,
                    lineHeight: clueLineHeight,
                    marginBottom: clueMarginBottom,
                    color: '#0f172a',
                    wordBreak: 'break-word',
                }}
            >
                <span
                    style={{
                        fontWeight: 800,
                        color: color,
                        minWidth: clueNumberWidth,
                        textAlign: 'right',
                        marginRight: `${clueNumberMarginRightPx}px`,
                        flexShrink: 0,
                        fontSize: clueFontSize,
                    }}
                >
                    {toDevanagari(clue.number)}.
                </span>
                <span style={{ flex: 1, fontWeight: 500 }}>
                    {sanitizeClue(clue.word, clue.clue)}{' '}
                    {aksharaCount > 0 && (
                        <span style={{ color: '#475569', fontWeight: 600, whiteSpace: 'nowrap' }}>
                            ({toDevanagari(aksharaCount)})
                        </span>
                    )}
                </span>
            </div>
        );
    };

    const renderCluesColumn = (clueList: typeof sortedAcrossClues, color: string, isAcross: boolean, useMultiCol: boolean) => {
        if (!useMultiCol) {
            return (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {clueList.map(c => renderClueItem(c, color, isAcross))}
                </div>
            );
        }
        const mid = Math.ceil(clueList.length / 2);
        const col1 = clueList.slice(0, mid);
        const col2 = clueList.slice(mid);
        return (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: '8px' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {col1.map(c => renderClueItem(c, color, isAcross))}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {col2.map(c => renderClueItem(c, color, isAcross))}
                </div>
            </div>
        );
    };

    const renderSolutionItem = (clue: { number: number; word: string; clue: string }, color: string, isAcross: boolean) => (
        <div
            key={`${isAcross ? 'across' : 'down'}-sol-${clue.number}`}
            style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                fontSize: clueFontSize,
                lineHeight: clueLineHeight,
                marginBottom: clueMarginBottom,
                borderBottom: '1px solid #f1f5f9',
                paddingBottom: '1px',
                color: '#0f172a',
                wordBreak: 'break-word',
            }}
        >
            <div style={{ flex: 1, paddingRight: '4px', display: 'flex', alignItems: 'baseline' }}>
                <span
                    style={{
                        fontWeight: 800,
                        color: color,
                        minWidth: clueNumberWidth,
                        textAlign: 'right',
                        marginRight: `${clueNumberMarginRightPx}px`,
                        flexShrink: 0,
                        fontSize: clueFontSize,
                    }}
                >
                    {toDevanagari(clue.number)}.
                </span>
                <span style={{ fontWeight: 500 }}>{sanitizeClue(clue.word, clue.clue)}</span>
            </div>
            <span
                style={{
                    fontWeight: 800,
                    color: '#0f172a',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    fontSize: clueFontSize,
                    marginLeft: '4px',
                }}
            >
                {clue.word}
            </span>
        </div>
    );

    const renderSolutionsColumn = (clueList: typeof sortedAcrossClues, color: string, isAcross: boolean, useMultiCol: boolean) => {
        if (!useMultiCol) {
            return (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {clueList.map(c => renderSolutionItem(c, color, isAcross))}
                </div>
            );
        }
        const mid = Math.ceil(clueList.length / 2);
        const col1 = clueList.slice(0, mid);
        const col2 = clueList.slice(mid);
        return (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: '8px' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {col1.map(c => renderSolutionItem(c, color, isAcross))}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {col2.map(c => renderSolutionItem(c, color, isAcross))}
                </div>
            </div>
        );
    };

    return (
        <div className="pdf-print-wrapper">
            {/* ================= PAGE 1: THE PUZZLE (कोडे पान) ================= */}
            <div
                ref={page1Ref}
                id="shabdavedh-pdf-page-1"
                className="bg-white text-slate-900 mx-auto"
                style={{
                    width: '794px',
                    minHeight: '1123px',
                    padding: `${pagePaddingTopPx}px 22px ${pagePaddingBottomPx}px 22px`,
                    boxSizing: 'border-box',
                    fontFamily: "'Noto Sans Devanagari', sans-serif",
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    pageBreakAfter: 'always',
                    backgroundColor: '#ffffff',
                    overflow: 'visible',
                }}
            >
                {/* Top Header Box (बॅकराउंडकलर काढलेला साधा व सुटसुटीत बॉक्स) */}
                <div
                    style={{
                        backgroundColor: '#ffffff',
                        border: '1.5px solid #1e293b',
                        color: '#0f172a',
                        padding: `${headerPaddingPy}px 14px`,
                        borderRadius: '6px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                        <h1
                            style={{
                                fontSize: `${headerFontSizePx}px`,
                                fontWeight: 800,
                                letterSpacing: '0.5px',
                                margin: 0,
                                lineHeight: 1,
                                color: '#0f172a',
                            }}
                        >
                            शब्दवेध
                        </h1>
                        <span
                            style={{
                                fontSize: '9.5px',
                                color: '#475569',
                                fontWeight: 500,
                            }}
                        >
                            {themeName 
                                ? `थीम: ${themeName} | दैनंदिन मराठी शब्दकोडे` 
                                : 'दैनंदिन मराठी शब्दकोडे | मेंदूला चालना देणारा शब्दप्रपंच'}
                        </span>
                    </div>
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '14px',
                            fontSize: '10px',
                            color: '#1e293b',
                            fontWeight: 600,
                        }}
                    >
                        <div>
                            नाव: <span style={{ display: 'inline-block', borderBottom: '1px dotted #475569', width: '100px' }}></span>
                        </div>
                        <div>
                            दिनांक: <span style={{ display: 'inline-block', borderBottom: '1px dotted #475569', width: '65px' }}></span>
                        </div>
                        <div>
                            वेळ: <span style={{ display: 'inline-block', borderBottom: '1px dotted #475569', width: '32px' }}></span> मि.
                        </div>
                    </div>
                </div>

                {/* Crossword Grid (मध्यभागी कोडे - सुसंगत आकाराचे चौकोन व ठळक अंक) */}
                <div style={{ display: 'flex', justifyContent: 'center', margin: `${gridMarginYPx}px 0` }}>
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: `repeat(${size}, ${page1CellSizePx}px)`,
                            gridTemplateRows: `repeat(${size}, ${page1CellSizePx}px)`,
                            border: '2px solid #0f172a',
                            backgroundColor: '#0f172a',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                        }}
                    >
                        {grid.map((row, r) =>
                            row.map((cell, c) => (
                                <div
                                    key={`p1-cell-${r}-${c}`}
                                    style={{
                                        width: `${page1CellSizePx}px`,
                                        height: `${page1CellSizePx}px`,
                                        backgroundColor: cell.isBlack ? '#0f172a' : '#ffffff',
                                        border: cell.isBlack ? '1px solid #0f172a' : '1px solid #334155',
                                        boxSizing: 'border-box',
                                        position: 'relative',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    {cell.number && !cell.isBlack && (
                                        <span
                                            style={{
                                                position: 'absolute',
                                                top: '1px',
                                                left: '2px',
                                                fontSize: `${page1NumberFontSizePx}px`,
                                                fontWeight: 800,
                                                color: '#0f172a',
                                                lineHeight: 1,
                                            }}
                                        >
                                            {toDevanagari(cell.number)}
                                        </span>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Clues Section (दोन स्तंभ: आडवे व उभे - पूर्ण क्लू छापले जातील अशी जागा) */}
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: `${columnGapPx}px`,
                        marginTop: '2px',
                        flex: 1,
                    }}
                >
                    {/* Left Column: आडवे शब्द (Across) */}
                    <div>
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                borderLeft: '4px solid #991b1b',
                                paddingLeft: '8px',
                                marginBottom: `${clueHeaderMarginBottomPx}px`,
                            }}
                        >
                            <span style={{ color: '#991b1b', fontSize: clueHeaderSize, fontWeight: 800 }}>➤</span>
                            <span style={{ color: '#991b1b', fontSize: clueHeaderSize, fontWeight: 800 }}>
                                आडवे शब्द (Across) {acrossCount > 0 ? `(${toDevanagari(acrossCount)})` : ''}
                            </span>
                        </div>
                        {renderCluesColumn(sortedAcrossClues, '#991b1b', true, useAcrossMultiCol)}
                    </div>

                    {/* Right Column: उभे शब्द (Down) */}
                    <div>
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                borderLeft: '4px solid #1d4ed8',
                                paddingLeft: '8px',
                                marginBottom: `${clueHeaderMarginBottomPx}px`,
                            }}
                        >
                            <span style={{ color: '#1d4ed8', fontSize: clueHeaderSize, fontWeight: 800 }}>➤</span>
                            <span style={{ color: '#1d4ed8', fontSize: clueHeaderSize, fontWeight: 800 }}>
                                उभे शब्द (Down) {downCount > 0 ? `(${toDevanagari(downCount)})` : ''}
                            </span>
                        </div>
                        {renderCluesColumn(sortedDownClues, '#1d4ed8', false, useDownMultiCol)}
                    </div>
                </div>

                {/* Bottom Footer Note (Page 1) */}
                <div
                    style={{
                        backgroundColor: '#fffbeb',
                        border: '1px solid #fde68a',
                        color: '#92400e',
                        fontSize: `${noteFontSizePx}px`,
                        padding: `${notePaddingPy}px 12px`,
                        borderRadius: '4px',
                        textAlign: 'center',
                        marginTop: '4px',
                    }}
                >
                    💡 <strong>टीप:</strong> कोडे सोडवण्यासाठी बॉलपेन किंवा पेन्सिलचा वापर करा. रिकाम्या पांढऱ्या चौकटीत योग्य अक्षरे भरा. उत्तर पुढील पानावर उपलब्ध आहे.
                </div>
            </div>

            {/* ================= PAGE 2: SOLUTION SHEET (उत्तरतालिका) ================= */}
            <div
                ref={page2Ref}
                id="shabdavedh-pdf-page-2"
                className="bg-white text-slate-900 mx-auto"
                style={{
                    width: '794px',
                    minHeight: '1123px',
                    padding: `${pagePaddingTopPx}px 22px ${pagePaddingBottomPx}px 22px`,
                    boxSizing: 'border-box',
                    fontFamily: "'Noto Sans Devanagari', sans-serif",
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    pageBreakAfter: 'always',
                    backgroundColor: '#ffffff',
                    overflow: 'visible',
                }}
            >
                {/* Top Banner (हिरवट निळा / Deep Teal Header) */}
                <div
                    style={{
                        backgroundColor: '#0f766e',
                        color: '#ffffff',
                        padding: `${bannerPaddingPy}px 16px`,
                        borderRadius: '6px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                    }}
                >
                    <div>
                        <h1
                            style={{
                                fontSize: `${bannerTitleFontSizePx}px`,
                                fontWeight: 800,
                                letterSpacing: '0.5px',
                                margin: 0,
                                lineHeight: 1.1,
                                color: '#ffffff',
                            }}
                        >
                            शब्दवेध — उत्तरतालिका
                        </h1>
                        <p
                            style={{
                                fontSize: '9.5px',
                                color: '#ccfbf1',
                                margin: '2px 0 0 0',
                                fontWeight: 400,
                            }}
                        >
                            तपासणी व संदर्भासाठी परिपूर्ण उकल (Solution Sheet)
                        </p>
                    </div>
                    <div
                        style={{
                            backgroundColor: '#ffffff',
                            color: '#0f766e',
                            fontSize: '10px',
                            fontWeight: 800,
                            padding: '3px 10px',
                            borderRadius: '9999px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                        }}
                    >
                        <span>✔</span> १००% अचूक उत्तरे
                    </div>
                </div>

                {/* Solved Crossword Grid (पूर्ण भरलेले कोडे - सुसंगत आकार) */}
                <div style={{ display: 'flex', justifyContent: 'center', margin: `${gridMarginYPx}px 0` }}>
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: `repeat(${size}, ${page2CellSizePx}px)`,
                            gridTemplateRows: `repeat(${size}, ${page2CellSizePx}px)`,
                            border: '2px solid #0f172a',
                            backgroundColor: '#0f172a',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                        }}
                    >
                        {grid.map((row, r) =>
                            row.map((cell, c) => (
                                <div
                                    key={`p2-cell-${r}-${c}`}
                                    style={{
                                        width: `${page2CellSizePx}px`,
                                        height: `${page2CellSizePx}px`,
                                        backgroundColor: cell.isBlack ? '#0f172a' : '#ffffff',
                                        border: cell.isBlack ? '1px solid #0f172a' : '1px solid #334155',
                                        boxSizing: 'border-box',
                                        position: 'relative',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    {cell.number && !cell.isBlack && (
                                        <span
                                            style={{
                                                position: 'absolute',
                                                top: '1px',
                                                left: '2px',
                                                fontSize: `${page2NumberFontSizePx}px`,
                                                fontWeight: 700,
                                                color: '#64748b',
                                                lineHeight: 1,
                                            }}
                                        >
                                            {toDevanagari(cell.number)}
                                        </span>
                                    )}
                                    {!cell.isBlack && cell.letter && (
                                        <span
                                            style={{
                                                fontSize: `${page2LetterFontSizePx}px`,
                                                fontWeight: 800,
                                                color: '#000000',
                                                lineHeight: 1,
                                                textAlign: 'center',
                                            }}
                                        >
                                            {cell.letter}
                                        </span>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Solutions Section (दोन स्तंभ: आडवे व उभे उत्तरे - १००% छापले जातील अशी जागा) */}
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: `${columnGapPx}px`,
                        marginTop: '2px',
                        flex: 1,
                    }}
                >
                    {/* Left Column: आडवे शब्द व उत्तरे */}
                    <div>
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                borderLeft: '4px solid #991b1b',
                                paddingLeft: '8px',
                                marginBottom: `${clueHeaderMarginBottomPx}px`,
                            }}
                        >
                            <span style={{ color: '#991b1b', fontSize: clueHeaderSize, fontWeight: 800 }}>✔</span>
                            <span style={{ color: '#991b1b', fontSize: clueHeaderSize, fontWeight: 800 }}>
                                आडवे शब्द व उत्तरे {acrossCount > 0 ? `(${toDevanagari(acrossCount)})` : ''}
                            </span>
                        </div>
                        {renderSolutionsColumn(sortedAcrossClues, '#991b1b', true, useAcrossMultiCol)}
                    </div>

                    {/* Right Column: उभे शब्द व उत्तरे */}
                    <div>
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                borderLeft: '4px solid #1d4ed8',
                                paddingLeft: '8px',
                                marginBottom: `${clueHeaderMarginBottomPx}px`,
                            }}
                        >
                            <span style={{ color: '#1d4ed8', fontSize: clueHeaderSize, fontWeight: 800 }}>✔</span>
                            <span style={{ color: '#1d4ed8', fontSize: clueHeaderSize, fontWeight: 800 }}>
                                उभे शब्द व उत्तरे {downCount > 0 ? `(${toDevanagari(downCount)})` : ''}
                            </span>
                        </div>
                        {renderSolutionsColumn(sortedDownClues, '#1d4ed8', false, useDownMultiCol)}
                    </div>
                </div>

                {/* Bottom Footer (Page 2) */}
                <div
                    style={{
                        fontSize: '9px',
                        color: '#64748b',
                        textAlign: 'center',
                        marginTop: '4px',
                        paddingTop: '4px',
                        borderTop: '1px solid #e2e8f0',
                    }}
                >
                    शब्दवेध मराठी शब्दकोडे © सर्व हक्क सुरक्षित.
                </div>
            </div>
        </div>
    );
};
