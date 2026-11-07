import React from 'react';
import { EyeIcon, EyeOffIcon, PrintIcon, LoaderIcon, PencilIcon, XIcon, CheckIcon } from './Icons';

interface PuzzleControlsProps {
    onToggleSolution: () => void;
    onPrint: () => void;
    showSolution: boolean;
    isPrinting: boolean;
    isEditMode: boolean;
    isUpdating: boolean;
    onToggleEditMode: () => void;
    onUpdatePuzzle: () => void;
    onOpenInManualStudio?: () => void;
}

export const PuzzleControls: React.FC<PuzzleControlsProps> = ({ 
    onToggleSolution, 
    onPrint, 
    showSolution, 
    isPrinting,
    isEditMode,
    isUpdating,
    onToggleEditMode,
    onUpdatePuzzle,
    onOpenInManualStudio,
}) => {
    return (
        <div className="flex flex-wrap items-center gap-2 no-print">
            {!isEditMode && (
                <button
                    onClick={onToggleSolution}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 rounded-md hover:bg-slate-200 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-slate-800"
                >
                    {showSolution ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                    <span>{showSolution ? 'उत्तर लपवा' : 'उत्तर दाखवा'}</span>
                </button>
            )}

            {!isEditMode && onOpenInManualStudio && (
                <button
                    onClick={onOpenInManualStudio}
                    title="या स्वयंचलित कोड्याची काळी चौकट (Black Box Structure) मानवी स्टुडिओमध्ये लोड करून नवीन शब्द भरा"
                    className="flex items-center gap-2 px-3 py-2 text-sm font-bold text-amber-900 dark:text-amber-200 bg-amber-100 dark:bg-amber-900/60 border border-amber-300 dark:border-amber-700 rounded-md hover:bg-amber-200 dark:hover:bg-amber-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 shadow-xs transition-colors"
                >
                    <span>🎨 मानवी स्टुडिओत उघडा</span>
                </button>
            )}

            {isEditMode ? (
                <>
                    <button
                        onClick={onUpdatePuzzle}
                        disabled={isUpdating}
                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 dark:focus:ring-offset-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isUpdating ? <LoaderIcon className="w-5 h-5 animate-spin" /> : <CheckIcon className="w-5 h-5" />}
                        <span>{isUpdating ? 'अद्यतनित...' : 'कोडे अद्यतनित करा'}</span>
                    </button>
                    <button
                        onClick={onToggleEditMode}
                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 rounded-md hover:bg-slate-200 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 dark:focus:ring-offset-slate-800"
                    >
                        <XIcon className="w-5 h-5" />
                        <span>रद्द करा</span>
                    </button>
                </>
            ) : (
                <button
                    onClick={onToggleEditMode}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 rounded-md hover:bg-slate-200 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-slate-800"
                >
                    <PencilIcon className="w-5 h-5" />
                    <span>संपादित करा</span>
                </button>
            )}

            <button
                onClick={onPrint}
                disabled={isPrinting || isEditMode}
                title={isEditMode ? "बदल सेव्ह करण्यासाठी आधी 'कोडे अद्यतनित करा' बटण दाबा" : "वर्तमानपत्रासारखी दर्जेदार PDF (लाईट व्हर्जन - KB आकारात) डाउनलोड करा"}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
                {isPrinting ? <LoaderIcon className="w-5 h-5 animate-spin" /> : <PrintIcon className="w-5 h-5" />}
                <span>{isPrinting ? 'PDF तयार होत आहे...' : 'डाउनलोड PDF (लाईट KB)'}</span>
            </button>
        </div>
    );
};