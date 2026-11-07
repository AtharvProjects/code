import React from 'react';
import { PencilIcon } from './Icons';

interface ImprovementModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ImprovementModal: React.FC<ImprovementModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) {
        return null;
    }

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 transition-opacity"
            onClick={onClose}
        >
            <div 
                className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md p-6 text-slate-800 dark:text-slate-200 transform transition-all"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center mb-4">
                    <PencilIcon className="w-6 h-6 mr-3 text-indigo-500"/>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">शब्दकोडे कसे संपादित करावे</h2>
                </div>
                <div className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
                    <p>तुमचे शब्दकोडे संपादित करण्यासाठी खालील सूचनांचे पालन करा:</p>
                    <ul className="list-disc list-inside space-y-2 pl-2">
                        <li>
                            <strong>अक्षरे लिहा:</strong> रिकाम्या (पांढऱ्या) किंवा काळ्या चौकटींवर क्लिक करून देवनागरी अक्षरे टाइप करा. काळा चौकोन आपोआप पांढरा होईल.
                        </li>
                        <li>
                            <strong>काळे चौकोन:</strong> एखादा चौकोन काळा करण्यासाठी, त्यातील अक्षर काढून टाका (delete/backspace). चौकोन आपोआप काळा होईल.
                        </li>
                        <li>
                            <strong>बदल सेव्ह करा:</strong> संपादन पूर्ण झाल्यावर, नवीन शब्द आणि सूचना तयार करण्यासाठी <span className="font-bold text-green-600 dark:text-green-400">'कोडे अद्यतनित करा'</span> बटण दाबा.
                        </li>
                        <li>
                            <strong>देवनागरी टायपिंग:</strong> जोडाक्षरे किंवा किचकट अक्षरे लिहिताना काही अडचण येणार नाही, तुम्ही आरामात लिहू शकता.
                        </li>
                    </ul>
                </div>
                <div className="mt-6 text-right">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-slate-800"
                    >
                        समजले
                    </button>
                </div>
            </div>
        </div>
    );
};
