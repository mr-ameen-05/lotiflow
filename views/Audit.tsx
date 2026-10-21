import React, { useState, useEffect } from 'react';
import {
    ClipboardList, Clock, User, Shield, Search,
    RefreshCw, Filter, Activity, FileText
} from 'lucide-react';

const API_URL = '/api';

const Audit: React.FC = () => {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [actionFilter, setActionFilter] = useState('ALL');

    const loadAuditLogs = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/audit-logs`, { credentials: 'include' });
            if (res.ok) {
                setLogs(await res.json());
            }
        } catch (err) {
            console.error('Failed to load audit logs:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAuditLogs();
    }, []);

    const filteredLogs = logs.filter(log => {
        const matchesAction = actionFilter === 'ALL' || (log.action_type || '').toLowerCase() === actionFilter.toLowerCase();
        const matchesSearch =
            (log.action_type || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (log.user_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (log.user_email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (log.object_type || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (log.details || '').toLowerCase().includes(searchTerm.toLowerCase());
        return matchesAction && matchesSearch;
    });

    const getActionBadge = (action: string) => {
        const act = (action || '').toUpperCase();
        if (act.includes('LOGIN')) return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
        if (act.includes('LOGOUT')) return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
        if (act.includes('CREATE') || act.includes('ADD')) return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
        if (act.includes('UPDATE') || act.includes('RULE')) return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
        if (act.includes('ACK')) return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
        return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    };

    return (
        <div className="flex flex-col gap-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                        Security Audit Trail
                    </h1>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                        Immutable ledger tracking system access, rule modifications, and analyst investigations
                    </p>
                </div>
                <button
                    onClick={loadAuditLogs}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50"
                >
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    Refresh Audit Log
                </button>
            </div>

            {/* Filters Bar */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/80 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-3">
                <div className="relative w-full sm:w-80">
                    <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by action, user, or IP..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg pl-9 pr-3.5 py-2 text-xs text-gray-900 dark:text-white outline-none focus:border-emerald-500"
                    />
                </div>

                <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-gray-500 font-medium">Action:</span>
                    {['ALL', 'login', 'ACK_ALERT', 'UPDATE_RULE', 'CREATE_CASE'].map(act => (
                        <button
                            key={act}
                            onClick={() => setActionFilter(act)}
                            className={`px-2.5 py-1 rounded-md text-xs font-semibold uppercase transition-colors ${
                                actionFilter === act
                                    ? 'bg-emerald-500 text-gray-950 font-bold'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                            }`}
                        >
                            {act === 'ALL' ? 'ALL' : act.replace('_', ' ')}
                        </button>
                    ))}
                </div>
            </div>

            {/* Audit Log Table */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/80 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="text-[11px] uppercase tracking-wider bg-gray-50 dark:bg-gray-900/60 text-gray-500 border-b border-gray-200 dark:border-gray-700">
                            <tr>
                                <th className="px-6 py-3.5 font-semibold">Timestamp</th>
                                <th className="px-6 py-3.5 font-semibold">Actor / User</th>
                                <th className="px-6 py-3.5 font-semibold">Action Type</th>
                                <th className="px-6 py-3.5 font-semibold">Target Entity</th>
                                <th className="px-6 py-3.5 font-semibold">Event Details</th>
                                <th className="px-6 py-3.5 font-semibold text-right">IP Address</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60 font-mono text-xs">
                            {filteredLogs.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-10 text-center text-gray-500 text-sm font-sans">
                                        No audit log entries found matching criteria.
                                    </td>
                                </tr>
                            ) : (
                                filteredLogs.map((log) => (
                                    <tr key={log.audit_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                        <td className="px-6 py-3.5 text-gray-500">
                                            {log.timestamp?.replace('T', ' ').slice(0, 19)}
                                        </td>
                                        <td className="px-6 py-3.5 font-sans">
                                            <div className="font-semibold text-gray-900 dark:text-white">
                                                {log.user_name || 'System / Daemon'}
                                            </div>
                                            <div className="text-[11px] text-gray-500 font-mono">
                                                {log.user_email || 'internal'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-3.5">
                                            <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded border ${getActionBadge(log.action_type)}`}>
                                                {log.action_type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3.5 text-gray-700 dark:text-gray-300">
                                            {log.object_type} {log.object_id ? `#${log.object_id}` : ''}
                                        </td>
                                        <td className="px-6 py-3.5 text-gray-600 dark:text-gray-400 font-sans text-xs max-w-xs truncate">
                                            {typeof log.details === 'string' ? log.details : JSON.stringify(log.details)}
                                        </td>
                                        <td className="px-6 py-3.5 text-right text-gray-500">
                                            {log.ip_address || '127.0.0.1'}
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

export default Audit;
