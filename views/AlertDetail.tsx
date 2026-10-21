import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, CheckCircle, Shield, Terminal, Clock,
    Server, User, FileCode, AlertTriangle, ExternalLink
} from 'lucide-react';

const API_URL = '/api';

const AlertDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [alert, setAlert] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [acking, setAcking] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    const fetchDetail = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/alerts/${id}`, { credentials: 'include' });
            if (res.ok) {
                setAlert(await res.json());
            }
        } catch (err) {
            console.error('Failed to load alert details:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (id) fetchDetail();
    }, [id]);

    const handleAcknowledge = async () => {
        if (!alert || alert.status !== 'new') return;
        setAcking(true);
        try {
            const res = await fetch(`${API_URL}/alerts/${id}/ack`, {
                method: 'POST',
                credentials: 'include'
            });
            if (res.ok) {
                setAlert({ ...alert, status: 'open' });
                setMessage('Alert acknowledged successfully.');
                setTimeout(() => setMessage(null), 3000);
            }
        } catch (err) {
            console.error('Failed to acknowledge alert:', err);
        } finally {
            setAcking(false);
        }
    };

    if (loading) {
        return <div className="text-gray-500 text-sm">Loading incident telemetry...</div>;
    }

    if (!alert) {
        return (
            <div className="text-center py-12">
                <AlertTriangle size={36} className="text-yellow-500 mx-auto mb-3" />
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Alert Not Found</h2>
                <button
                    onClick={() => navigate('/alerts')}
                    className="mt-4 px-4 py-2 bg-emerald-500 text-gray-950 rounded-lg text-xs font-semibold"
                >
                    Return to Alerts
                </button>
            </div>
        );
    }

    const sev = (alert.severity || 'medium').toLowerCase();
    const sevBadge =
        sev === 'critical' ? 'bg-red-500/10 text-red-500 border-red-500/30' :
        sev === 'high' ? 'bg-orange-500/10 text-orange-500 border-orange-500/30' :
        sev === 'medium' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30' :
        'bg-blue-500/10 text-blue-500 border-blue-500/30';

    return (
        <div className="flex flex-col gap-6 max-w-5xl mx-auto">
            {/* Breadcrumb Navigation */}
            <div className="flex items-center gap-3 text-xs text-gray-500">
                <button
                    onClick={() => navigate('/alerts')}
                    className="hover:text-gray-900 dark:hover:text-white transition-colors flex items-center gap-1 font-semibold"
                >
                    <ArrowLeft size={14} /> Back to Alerts Feed
                </button>
                <span>/</span>
                <span className="font-mono text-gray-700 dark:text-gray-300">Alert #{alert.alert_id}</span>
            </div>

            {/* Header / Actions Card */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/80 rounded-xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                        <span className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded border ${sevBadge}`}>
                            {sev}
                        </span>
                        <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
                            {alert.rule_name || alert.description}
                        </h1>
                        {alert.technique && (
                            <span className="text-xs font-mono font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-0.5 rounded">
                                {alert.technique}
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-2">
                        <Clock size={12} /> Detected at {alert.timestamp?.replace('T', ' ').slice(0, 19)}
                        <span>•</span>
                        <Server size={12} /> Host: <span className="font-mono text-gray-700 dark:text-gray-300 font-semibold">{alert.host || 'Unknown'}</span>
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    {alert.status === 'new' ? (
                        <button
                            onClick={handleAcknowledge}
                            disabled={acking}
                            className="bg-emerald-500 hover:bg-emerald-600 text-gray-950 font-bold px-4 py-2 rounded-lg text-xs flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
                        >
                            <CheckCircle size={15} />
                            {acking ? 'Acknowledging...' : 'Acknowledge Alert'}
                        </button>
                    ) : (
                        <span className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center gap-1.5">
                            <CheckCircle size={14} /> Triaged ({alert.status})
                        </span>
                    )}

                    <button
                        onClick={() => navigate('/cases')}
                        className="bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 font-semibold px-3.5 py-2 rounded-lg text-xs transition-colors"
                    >
                        Link to Case
                    </button>
                </div>
            </div>

            {message && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-lg font-medium">
                    {message}
                </div>
            )}

            {/* Command-Line Forensic Inspector */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/80 rounded-xl p-5 shadow-sm">
                <div className="flex justify-between items-center mb-3">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-2">
                        <Terminal size={15} className="text-emerald-500" />
                        Command-Line Forensic Inspector
                    </h2>
                    <span className="text-[11px] text-gray-400 font-mono">Sysmon Event ID 1</span>
                </div>

                <div className="bg-gray-950 rounded-xl p-4 font-mono text-xs text-emerald-400 overflow-x-auto border border-gray-800 leading-relaxed shadow-inner">
                    <code>{alert.command_line || 'No process command line recorded for this event.'}</code>
                </div>

                {alert.matched_text && (
                    <div className="mt-3 p-2.5 rounded-lg bg-orange-500/10 border border-orange-500/20 text-xs text-orange-400">
                        <span className="font-bold">Matched Detection Pattern: </span>
                        <code className="font-mono">{alert.matched_text}</code>
                    </div>
                )}
            </div>

            {/* Metadata & Process Context */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Process Details */}
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/80 rounded-xl p-5 shadow-sm space-y-3.5">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5 border-b border-gray-100 dark:border-gray-700/60 pb-2">
                        <FileCode size={15} /> Process Context
                    </h3>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                            <span className="text-gray-400 block mb-0.5">Process Binary</span>
                            <span className="font-mono font-semibold text-gray-900 dark:text-white">
                                {alert.process_name || 'N/A'}
                            </span>
                        </div>
                        <div>
                            <span className="text-gray-400 block mb-0.5">Execution User</span>
                            <span className="font-mono font-semibold text-gray-900 dark:text-white">
                                {alert.user_name || 'SYSTEM'}
                            </span>
                        </div>
                        <div>
                            <span className="text-gray-400 block mb-0.5">Process ID (PID)</span>
                            <span className="font-mono text-gray-700 dark:text-gray-300">
                                {alert.pid ?? 'N/A'}
                            </span>
                        </div>
                        <div>
                            <span className="text-gray-400 block mb-0.5">Parent PID (PPID)</span>
                            <span className="font-mono text-gray-700 dark:text-gray-300">
                                {alert.ppid ?? 'N/A'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* MITRE & Detection Weights */}
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/80 rounded-xl p-5 shadow-sm space-y-3.5">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5 border-b border-gray-100 dark:border-gray-700/60 pb-2">
                        <Shield size={15} /> Detection Reasoning
                    </h3>
                    <div className="space-y-2 text-xs">
                        <div>
                            <span className="text-gray-400 block mb-0.5">Technique Definition</span>
                            <span className="font-medium text-gray-800 dark:text-gray-200">
                                {alert.rule_description || 'Living-off-the-Land abuse pattern.'}
                            </span>
                        </div>
                        <div className="flex justify-between items-center pt-1">
                            <span className="text-gray-400">Confidence Score:</span>
                            <span className="font-bold text-emerald-500 font-mono text-sm">
                                {alert.confidence_score ?? 70} / 100
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-400">Detection Engine:</span>
                            <span className="text-gray-700 dark:text-gray-300 font-medium">
                                Python Queue Consumer (BLPOP)
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AlertDetail;
