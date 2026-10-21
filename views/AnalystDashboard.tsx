import React, { useState, useEffect } from 'react';
import {
    Activity, Shield, Server, AlertTriangle, Clock,
    CheckCircle, ArrowUpRight, TrendingUp, Briefcase, Search,
    Filter, RefreshCw, Terminal, Eye
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const API_URL = '/api';

const SEVERITY_COLORS: Record<string, string> = {
    critical: 'bg-red-500/10 text-red-500 border-red-500/30',
    high: 'bg-orange-500/10 text-orange-500 border-orange-500/30',
    medium: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30',
    low: 'bg-blue-500/10 text-blue-500 border-blue-500/30'
};

const AnalystDashboard: React.FC = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState<any>({ alerts: [], hosts: 0, new_alerts: 0, cases: { total: 0, open: 0 } });
    const [recentAlerts, setRecentAlerts] = useState<any[]>([]);
    const [activeCases, setActiveCases] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionMessage, setActionMessage] = useState<string | null>(null);

    const loadData = async () => {
        try {
            const [statsRes, alertsRes, casesRes] = await Promise.all([
                fetch(`${API_URL}/stats`, { credentials: 'include' }),
                fetch(`${API_URL}/alerts`, { credentials: 'include' }),
                fetch(`${API_URL}/cases`, { credentials: 'include' })
            ]);

            if (statsRes.ok) setStats(await statsRes.json());
            if (alertsRes.ok) {
                const alertData = await alertsRes.json();
                setRecentAlerts(Array.isArray(alertData) ? alertData.slice(0, 8) : []);
            }
            if (casesRes.ok) {
                const caseData = await casesRes.json();
                setActiveCases(Array.isArray(caseData) ? caseData.slice(0, 4) : []);
            }
        } catch (err) {
            console.error('Failed to load analyst triage data:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
        const interval = setInterval(loadData, 10000);
        return () => clearInterval(interval);
    }, []);

    const handleQuickAck = async (alertId: number, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            const res = await fetch(`${API_URL}/alerts/${alertId}/ack`, {
                method: 'POST',
                credentials: 'include'
            });
            if (res.ok) {
                setRecentAlerts(prev => prev.map(a => a.alert_id === alertId ? { ...a, status: 'open' } : a));
                setActionMessage(`Alert #${alertId} claimed and moved to Open status.`);
                setTimeout(() => setActionMessage(null), 3500);
            }
        } catch (err) {
            console.error('Failed to acknowledge alert:', err);
        }
    };

    const newAlertsCount = stats.new_alerts ?? 0;
    const criticalAlerts = (stats.alerts || []).find((a: any) => a.severity === 'critical')?.count || 0;
    const highAlerts = (stats.alerts || []).find((a: any) => a.severity === 'high')?.count || 0;

    return (
        <div className="flex flex-col gap-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            Analyst Workspace
                        </span>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                            Incident Command &amp; Live Triage Queue
                        </h1>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        High-velocity LOLBin triage, Sysmon event correlation, and forensic case management
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate('/explorer')}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/60 transition-colors text-gray-700 dark:text-gray-200"
                    >
                        <Search size={14} /> Log Explorer
                    </button>
                    <button
                        onClick={() => navigate('/cases')}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-gray-950 transition-colors shadow-sm"
                    >
                        <Briefcase size={14} /> My Cases ({stats.cases?.open ?? 0})
                    </button>
                    <button
                        onClick={loadData}
                        className="p-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50"
                        title="Refresh Queue"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {actionMessage && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-lg font-medium flex items-center justify-between">
                    <span>{actionMessage}</span>
                    <button onClick={() => setActionMessage(null)} className="text-gray-400 hover:text-white">&times;</button>
                </div>
            )}

            {/* Tactical Incident KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div
                    onClick={() => navigate('/alerts')}
                    className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/80 rounded-xl p-5 shadow-sm cursor-pointer hover:border-red-500/50 transition-all"
                >
                    <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 mb-3">
                        <span className="text-xs uppercase font-bold tracking-wider">Untriaged Incidents</span>
                        <div className="p-2 rounded-lg bg-red-500/10 text-red-500">
                            <AlertTriangle size={18} />
                        </div>
                    </div>
                    <div className="text-3xl font-extrabold text-red-500">
                        {newAlertsCount}
                    </div>
                    <p className="text-xs text-red-400 font-medium mt-2">
                        Awaiting initial analyst triage
                    </p>
                </div>

                <div
                    onClick={() => navigate('/alerts')}
                    className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/80 rounded-xl p-5 shadow-sm cursor-pointer hover:border-orange-500/50 transition-all"
                >
                    <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 mb-3">
                        <span className="text-xs uppercase font-bold tracking-wider">Critical &amp; High Threats</span>
                        <div className="p-2 rounded-lg bg-orange-500/10 text-orange-500">
                            <Shield size={18} />
                        </div>
                    </div>
                    <div className="text-3xl font-extrabold text-gray-900 dark:text-white">
                        {Number(criticalAlerts) + Number(highAlerts)}
                    </div>
                    <p className="text-xs text-orange-400 font-medium mt-2">
                        High confidence LOLBin abuse patterns
                    </p>
                </div>

                <div
                    onClick={() => navigate('/cases')}
                    className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/80 rounded-xl p-5 shadow-sm cursor-pointer hover:border-emerald-500/50 transition-all"
                >
                    <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 mb-3">
                        <span className="text-xs uppercase font-bold tracking-wider">Active Investigations</span>
                        <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                            <Briefcase size={18} />
                        </div>
                    </div>
                    <div className="text-3xl font-extrabold text-emerald-500">
                        {stats.cases?.open ?? 0}
                    </div>
                    <p className="text-xs text-emerald-400 font-medium mt-2">
                        Open forensic cases in progress
                    </p>
                </div>

                <div
                    onClick={() => navigate('/explorer')}
                    className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/80 rounded-xl p-5 shadow-sm cursor-pointer hover:border-blue-500/50 transition-all"
                >
                    <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 mb-3">
                        <span className="text-xs uppercase font-bold tracking-wider">Telemetry Channel</span>
                        <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                            <Terminal size={18} />
                        </div>
                    </div>
                    <div className="text-3xl font-extrabold text-gray-900 dark:text-white">
                        Sysmon EID 1
                    </div>
                    <p className="text-xs text-blue-400 font-medium mt-2">
                        Query raw endpoint process events &rarr;
                    </p>
                </div>
            </div>

            {/* Main Triage Feed */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Real-Time Priority Alert Feed */}
                <div className="lg:col-span-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/80 rounded-xl overflow-hidden shadow-sm">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700/80 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/40">
                        <div>
                            <h2 className="text-sm font-bold text-gray-900 dark:text-white tracking-wide uppercase flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                                Live Triage Feed
                            </h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Evaluate, claim, and escalate LOLBin process creation events
                            </p>
                        </div>
                        <button
                            onClick={() => navigate('/alerts')}
                            className="text-xs font-semibold text-emerald-500 hover:text-emerald-400 flex items-center gap-1"
                        >
                            All Alerts ({stats.alerts?.reduce((s: number, i: any) => s + Number(i.count), 0) || 0}) <ArrowUpRight size={14} />
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="text-[11px] uppercase tracking-wider bg-gray-50 dark:bg-gray-900/60 text-gray-500 border-b border-gray-200 dark:border-gray-700">
                                <tr>
                                    <th className="px-4 py-3 font-semibold">Alert / Host</th>
                                    <th className="px-4 py-3 font-semibold">Severity</th>
                                    <th className="px-4 py-3 font-semibold">LOLBin Trigger</th>
                                    <th className="px-4 py-3 font-semibold">Score</th>
                                    <th className="px-4 py-3 font-semibold text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                                {recentAlerts.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-8 text-center text-gray-500 text-xs">
                                            No active alerts in queue. Telemetry stream nominal.
                                        </td>
                                    </tr>
                                ) : (
                                    recentAlerts.map((alert: any) => {
                                        const sev = (alert.severity || 'medium').toLowerCase();
                                        const sevClass = SEVERITY_COLORS[sev] || 'bg-gray-500/10 text-gray-400';

                                        return (
                                            <tr
                                                key={alert.alert_id}
                                                onClick={() => navigate(`/alerts/${alert.alert_id}`)}
                                                className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors cursor-pointer"
                                            >
                                                <td className="px-4 py-3">
                                                    <div className="font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
                                                        #{alert.alert_id}
                                                        <span className="font-mono text-[11px] text-gray-400 font-normal">
                                                            ({alert.host || 'Unknown'})
                                                        </span>
                                                    </div>
                                                    <div className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5">
                                                        <Clock size={10} /> {alert.timestamp?.slice(11, 19)}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded border ${sevClass}`}>
                                                        {sev}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="font-medium text-gray-900 dark:text-gray-100 text-xs">
                                                        {alert.rule_name || alert.description}
                                                    </div>
                                                    {alert.technique && (
                                                        <span className="text-[10px] font-mono text-emerald-500 font-semibold">
                                                            {alert.technique}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 font-semibold text-xs text-gray-900 dark:text-white">
                                                    {alert.confidence_score ?? 70}%
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        {alert.status === 'new' && (
                                                            <button
                                                                onClick={(e) => handleQuickAck(alert.alert_id, e)}
                                                                className="px-2.5 py-1 text-[11px] font-bold rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500 hover:text-gray-950 transition-colors"
                                                                title="Claim Alert"
                                                            >
                                                                Claim
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                navigate(`/alerts/${alert.alert_id}`);
                                                            }}
                                                            className="p-1 rounded text-gray-400 hover:text-white"
                                                            title="Inspect Telemetry"
                                                        >
                                                            <Eye size={15} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Active Incident Investigations */}
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/80 rounded-xl p-5 shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="flex justify-between items-center mb-3">
                            <div className="flex items-center gap-2">
                                <Briefcase size={16} className="text-emerald-500" />
                                <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wide">
                                    Active Case Files
                                </h2>
                            </div>
                            <button
                                onClick={() => navigate('/cases')}
                                className="text-xs text-emerald-500 hover:underline font-semibold"
                            >
                                Open Cases &rarr;
                            </button>
                        </div>

                        <div className="divide-y divide-gray-100 dark:divide-gray-700/60">
                            {activeCases.length === 0 ? (
                                <p className="text-xs text-gray-500 py-6 text-center">No open cases currently assigned.</p>
                            ) : (
                                activeCases.map((c: any) => (
                                    <div
                                        key={c.case_id}
                                        onClick={() => navigate(`/cases/${c.case_id}`)}
                                        className="py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/30 rounded px-1 transition-colors"
                                    >
                                        <div className="flex items-center justify-between text-xs font-semibold text-gray-900 dark:text-white">
                                            <span>Case #{c.case_id}: {c.title}</span>
                                            <span className={`px-2 py-0.2 rounded text-[10px] font-bold uppercase ${
                                                c.status === 'open' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-yellow-500/10 text-yellow-400'
                                            }`}>
                                                {c.status}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-gray-500 truncate mt-1">
                                            {c.description || 'No description provided'}
                                        </p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="pt-4 border-t border-gray-100 dark:border-gray-700/60">
                        <button
                            onClick={() => navigate('/cases')}
                            className="w-full py-2 rounded-lg text-xs font-bold bg-white dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-1.5"
                        >
                            <Briefcase size={14} /> Open Investigation Caseboard
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AnalystDashboard;
