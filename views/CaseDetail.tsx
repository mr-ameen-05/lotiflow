import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Briefcase, ArrowLeft } from 'lucide-react';

const CaseDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                <button onClick={() => navigate('/cases')} className="hover:text-gray-900 dark:text-white transition-colors flex items-center gap-1">
                    <ArrowLeft size={16} /> Back to Cases
                </button>
                <span>/</span>
                <span className="text-gray-800 dark:text-gray-300 font-medium">{id}</span>
            </div>
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Case: {id}</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Investigation details and linked alerts</p>
            </div>
            <div className="bg-white dark:bg-gray-800 border border-gray-700 rounded-xl p-8 flex flex-col items-center justify-center text-center">
                <Briefcase size={48} className="text-gray-600 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Case Investigation</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm max-w-md">This view is currently under construction. Future updates will display linked alerts, forensic timeline, and resolution status.</p>
            </div>
        </div>
    );
};
export default CaseDetail;
