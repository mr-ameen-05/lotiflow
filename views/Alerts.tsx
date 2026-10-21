import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Clock, Filter, Shield, CheckCircle, RefreshCw, Search } from 'lucide-react';

const API_URL = '/api';

const Alerts: React.FC = () => {
    const navigate = useNavigate();
    const [alerts, setAlerts] = useState<any[]>([]);
    const [filteredAlerts, setFilteredAlerts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [severityFilter, setSeverityFilter] = useState('ALL');
    const [searchTerm, setSearchTerm] = useState('');

    const fetchAlerts = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/alerts`, { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                setAlerts(Array.isArray(data) ? data : []);
            }
        } catch (err) {
            console.error('Failed to fetch alerts:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAlerts();
        const interval = setInterval(fetchAlerts, 10000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        let result = [...alerts];

        if (statusFilter !== 'ALL') {
            result = result.filter(a => (a.status || '').toLowerCase() === statusFilter.toLowerCase());
        }

        if (severityFilter !== 'ALL') {
            result = result.filter(a => (a.severity || '').toLowerCase() === severityFilter.toLowerCase());
        }

        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase();
            result = result.filter(a =>
                (a.description || '').toLowerCase().includes(term) ||
                (a.rule_name || '').toLowerCase().includes(term) ||
                (a.host || '').toLowerCase().includes(term) ||
                (a.technique || '').toLowerCase().includes(term)
            );
        }

        setFilteredAlerts(result);
    }, [alerts, statusFilter, severityFilter, searchTerm]);

    const getSeverityBadge = (sev: string) => {
        const s = (sev || 'medium').toLowerCase();
        switch (s) {
            case 'critical':
                return 'bg-red-500/10 text-red-500 border-red-500/30';
            case 'high':
                return 'bg-orange-500/10 text-orange-500 border-orange-500/30';
            case 'medium':
                return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30';
            case 'low':
                return 'bg-blue-500/10 text-blue-500 border-blue-500/30';
            default:
                return 'bg-gray-500/10 text-gray-500 border-gray-500/30';
        }
    };

    return (
        <div className="flex flex-col gap-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                        Alert Feed &amp; Triage
                    </h1>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                        Real-time alerts triggered by the 14 LOLBin detection rules
                    </p>
                </div>
                <button
                    onClick={fetchAlerts}
                    disabled={loading}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/60 text-gray-700 dark:text-gray-200 transition-colors shadow-sm"
                >
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            {/* Filter Bar */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/80 rounded-xl p-4 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
                <div className="relative w-full md:w-80">
                    <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search rules, hosts, MITRE ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg pl-9 pr-3.5 py-2 text-xs text-gray-900 dark:text-white outline-none focus:border-emerald-500"
                    />
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-gray-500 font-medium">Status:</span>
                        {['ALL', 'new', 'open', 'closed'].map(st => (
                            <button
                                key={st}
                                onClick={() => setStatusFilter(st)}
                                className={`px-2.5 py-1 rounded-md text-xs font-semibold capitalize transition-colors ${
                                    statusFilter === st
                                        ? 'bg-emerald-500 text-gray-950 font-bold'
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                }`}
                            >
                                {st}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-gray-500 font-medium">Severity:</span>
                        {['ALL', 'critical', 'high', 'medium', 'low'].map(sev => (
                            <button
                                key={sev}
                                onClick={() => setSeverityFilter(sev)}
                                className={`px-2.5 py-1 rounded-md text-xs font-semibold capitalize transition-colors ${
                                    severityFilter === sev
                                        ? 'bg-emerald-500 text-gray-950 font-bold'
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                }`}
                            >
                                {sev}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Alerts Table */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/80 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="text-[11px] uppercase tracking-wider bg-gray-50 dark:bg-gray-900/60 text-gray-500 border-b border-gray-200 dark:border-gray-700">
                            <tr>
                                <th className="px-6 py-3.5 font-semibold">Alert ID &amp; Time</th>
                                <th className="px-6 py-3.5 font-semibold">Severity</th>
                                <th className="px-6 py-3.5 font-semibold">Rule Triggered &amp; MITRE</th>
                                <th className="px-6 py-3.5 font-semibold">Host</th>
                                <th className="px-6 py-3.5 font-semibold">Confidence</th>
                                <th className="px-6 py-3.5 font-semibold">Status</th>
                                <th className="px-6 py-3.5 font-semibold text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                            {filteredAlerts.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-10 text-center text-gray-500 text-sm">
                                        {loading ? 'Fetching active alerts...' : 'No alerts match the selected criteria.'}
                                    </td>
                                </tr>
                            ) : (
                                filteredAlerts.map(alert => (
                                    <tr
                                        key={alert.alert_id}
                                        className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                                    >
                                        <td className="px-6 py-4">
                                            <div className="font-semibold text-gray-900 dark:text-white">
                                                #{alert.alert_id}
                                            </div>
                                            <div className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5 font-mono">
                                                <Clock size={11} /> {alert.timestamp?.slice(0, 19).replace('T', ' ')}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded border ${getSeverityBadge(alert.severity)}`}>
                                                {alert.severity}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-900 dark:text-gray-100">
                                                {alert.rule_name || alert.description}
                                            </div>
                                            {alert.technique && (
                                                <span className="text-[10px] font-mono font-semibold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 mt-1 inline-block">
                                                    {alert.technique}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 font-mono text-xs text-gray-700 dark:text-gray-300">
                                            {alert.host || 'Unknown Host'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-xs text-gray-900 dark:text-white">
                                                {alert.confidence_score ?? 70}%
                                            </div>
                                            <div className="w-16 bg-gray-200 dark:bg-gray-700 h-1.5 rounded-full mt-1 overflow-hidden">
                                                <div
                                                    className="bg-emerald-500 h-full rounded-full"
                                                    style={{ width: `${alert.confidence_score ?? 70}%` }}
                                                ></div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded ${
                                                alert.status === 'new'
                                                    ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                                    : alert.status === 'open'
                                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                                    : 'bg-gray-500/10 text-gray-400 border border-gray-500/20'
                                            }`}>
                                                {alert.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => navigate(`/alerts/${alert.alert_id}`)}
                                                className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-500 hover:text-emerald-400 transition-colors"
                                            >
                                                Investigate &rarr;
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Alerts;
