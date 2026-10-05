import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MOCK_ALERTS } from '../constants';
import { ArrowLeft, CheckCircle, Shield, Terminal, Clock, Server } from 'lucide-react';

const AlertDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [alert, setAlert] = useState<any>(null);

    useEffect(() => {
        const found = MOCK_ALERTS.find(a => a.id === id);
        if (found) setAlert({...found});
    }, [id]);

    const handleAcknowledge = () => {
        if (alert && alert.status === 'new') {
            setAlert({ ...alert, status: 'open' });
            // In a real app, make API call here
        }
    };

    if (!alert) return <div className="text-gray-600 dark:text-gray-400">Loading alert...</div>;

    const getSeverityColor = (sev: string) => {
        switch(sev) {
            case 'CRITICAL': return 'bg-red-500/10 text-red-500 border-red-500/20';
            case 'HIGH': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
            case 'MEDIUM': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
            case 'LOW': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
            default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
        }
    };

    return (
        <div className="flex flex-col gap-6 max-w-5xl mx-auto">
            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                <button onClick={() => navigate('/alerts')} className="hover:text-gray-900 dark:text-white transition-colors flex items-center gap-1">
                    <ArrowLeft size={16} /> Back to Alerts
                </button>
                <span>/</span>
                <span className="text-gray-800 dark:text-gray-300 font-medium">{alert.id}</span>
            </div>

            <div className="flex justify-between items-start">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">{alert.ruleTriggered}</h1>
                        <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md border ${getSeverityColor(alert.severity)}`}>
                            {alert.severity}
                        </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Detected on {alert.timestamp}</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-700 px-4 py-2 rounded-lg">
                        <span className="text-xs text-gray-600 dark:text-gray-400 uppercase font-semibold">Status</span>
                        <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${alert.status === 'new' ? 'bg-blue-500/20 text-blue-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                            {alert.status}
                        </span>
                    </div>
                    {alert.status === 'new' && (
                        <button 
                            onClick={handleAcknowledge}
                            className="bg-emerald-500 hover:bg-emerald-600 text-gray-900 dark:text-white text-sm font-medium px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-lg shadow-emerald-500/20"
                        >
                            <CheckCircle size={16} /> Acknowledge
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-3 gap-6">
                <div className="col-span-2 space-y-6">
                    <div className="bg-white dark:bg-gray-800 border border-gray-700 rounded-xl p-6">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                            <Terminal size={16} className="text-gray-600 dark:text-gray-400" /> Command Inspector
                        </h3>
                        <div className="bg-gray-950 border border-gray-800 rounded-lg p-4 font-mono text-sm text-emerald-400 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                            {alert.commandLine}
                        </div>
                    </div>
                    
                    <div className="bg-white dark:bg-gray-800 border border-gray-700 rounded-xl p-6">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                            <Shield size={16} className="text-gray-600 dark:text-gray-400" /> Process Information
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg border border-gray-700/50">
                                <div className="text-xs text-gray-500 uppercase font-semibold mb-1">Process Name</div>
                                <div className="text-gray-900 dark:text-white font-mono">{alert.processName}</div>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg border border-gray-700/50">
                                <div className="text-xs text-gray-500 uppercase font-semibold mb-1">Process ID (PID)</div>
                                <div className="text-gray-900 dark:text-white font-mono">{alert.processId}</div>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg border border-gray-700/50">
                                <div className="text-xs text-gray-500 uppercase font-semibold mb-1">Parent PID</div>
                                <div className="text-gray-900 dark:text-white font-mono">{alert.parentProcessId}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="col-span-1 space-y-6">
                    <div className="bg-white dark:bg-gray-800 border border-gray-700 rounded-xl p-6">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                            <Server size={16} className="text-gray-600 dark:text-gray-400" /> Host Information
                        </h3>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-lg bg-gray-50 dark:bg-gray-900 flex items-center justify-center border border-gray-700">
                                <Server size={20} className="text-gray-600 dark:text-gray-400" />
                            </div>
                            <div>
                                <div className="text-gray-900 dark:text-white font-medium font-mono">{alert.hostname}</div>
                                <div className="text-xs text-emerald-400 font-medium">Online</div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="bg-white dark:bg-gray-800 border border-gray-700 rounded-xl p-6">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                            <Shield size={16} className="text-gray-600 dark:text-gray-400" /> Detection Meta
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <div className="text-xs text-gray-500 uppercase font-semibold mb-1.5">Confidence Score</div>
                                <div className="flex items-center gap-3">
                                    <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                        <div style={{ width: `${alert.confidence}%` }} className={`h-full ${alert.confidence > 80 ? 'bg-emerald-500' : 'bg-yellow-500'}`}></div>
                                    </div>
                                    <div className="text-sm text-gray-900 dark:text-white font-medium">{alert.confidence}/100</div>
                                </div>
                            </div>
                            <div>
                                <div className="text-xs text-gray-500 uppercase font-semibold mb-1.5">MITRE ATT&CK Tag</div>
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-gray-50 dark:bg-gray-900 border border-gray-700 text-xs font-mono text-gray-800 dark:text-gray-300">
                                    T1059.001
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AlertDetail;
