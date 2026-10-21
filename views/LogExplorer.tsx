import React, { useState, useEffect } from 'react';
import {
    Search, Filter, Download, Terminal, Clock,
    User, Monitor, Activity, RefreshCw, FileText
} from 'lucide-react';

const API_URL = '/api';

const LogExplorer: React.FC = () => {
    const [searchParams, setSearchParams] = useState({ query: '', host: '', user: '', process: '' });
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedLog, setSelectedLog] = useState<any | null>(null);

    const handleSearch = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/logs/search`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(searchParams)
            });
            if (res.ok) {
                const data = await res.json();
                setLogs(Array.isArray(data) ? data : []);
            }
        } catch (err) {
            console.error('Failed to query logs:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        handleSearch();
    }, []);

    const exportLogsCSV = () => {
        if (!logs.length) return;
        const rows = [
            ['Event ID', 'Timestamp', 'Host', 'User', 'Process Name', 'Command Line'],
            ...logs.map(l => [
                l.event_id,
                l.timestamp,
                l.hostname || '',
                l.user_name || '',
                l.process_name || '',
                `"${(l.command_line || '').replace(/"/g, '""')}"`
            ])
        ];
        const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.join(',')).join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `SOCflow_Logs_Export_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
    };

    return (
        <div className="flex flex-col gap-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                        Sysmon Log Explorer
                    </h1>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                        Query raw Windows process-creation telemetry (Event ID 1) across the fleet
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={exportLogsCSV}
                        disabled={!logs.length}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50"
                    >
                        <Download size={14} /> Export CSV
                    </button>
                    <button
                        onClick={() => handleSearch()}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-gray-950 transition-colors shadow-sm"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                        Run Query
                    </button>
                </div>
            </div>

            {/* Query Filter Form */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/80 rounded-xl p-5 shadow-sm">
                <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">
                            Command / Keyword
                        </label>
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="e.g. -urlcache, powershell..."
                                value={searchParams.query}
                                onChange={(e) => setSearchParams({ ...searchParams, query: e.target.value })}
                                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg pl-8.5 pr-3 py-2 text-xs text-gray-900 dark:text-white outline-none focus:border-emerald-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">
                            Target Host
                        </label>
                        <div className="relative">
                            <Monitor size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="e.g. FIN-SRV-01"
                                value={searchParams.host}
                                onChange={(e) => setSearchParams({ ...searchParams, host: e.target.value })}
                                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg pl-8.5 pr-3 py-2 text-xs text-gray-900 dark:text-white outline-none focus:border-emerald-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">
                            User Context
                        </label>
                        <div className="relative">
                            <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="e.g. SYSTEM or user"
                                value={searchParams.user}
                                onChange={(e) => setSearchParams({ ...searchParams, user: e.target.value })}
                                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg pl-8.5 pr-3 py-2 text-xs text-gray-900 dark:text-white outline-none focus:border-emerald-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">
                            Process Name
                        </label>
                        <div className="relative">
                            <Terminal size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="e.g. certutil.exe"
                                value={searchParams.process}
                                onChange={(e) => setSearchParams({ ...searchParams, process: e.target.value })}
                                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg pl-8.5 pr-3 py-2 text-xs text-gray-900 dark:text-white outline-none focus:border-emerald-500"
                            />
                        </div>
                    </div>
                </form>
            </div>

            {/* Results Table & Inspector */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Table */}
                <div className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/80 rounded-xl overflow-hidden shadow-sm ${
                    selectedLog ? 'lg:col-span-2' : 'lg:col-span-3'
                }`}>
                    <div className="p-3.5 border-b border-gray-200 dark:border-gray-700/80 flex justify-between items-center text-xs text-gray-500">
                        <span>Matching Events: <strong className="text-gray-900 dark:text-white font-mono">{logs.length}</strong></span>
                        <span>Click row to view full execution details</span>
                    </div>

                    <div className="overflow-x-auto max-h-[550px] overflow-y-auto">
                        <table className="w-full text-left text-xs font-mono">
                            <thead className="text-[10px] uppercase tracking-wider bg-gray-50 dark:bg-gray-900/60 text-gray-500 border-b border-gray-200 dark:border-gray-700 sticky top-0">
                                <tr>
                                    <th className="px-4 py-3">Time</th>
                                    <th className="px-4 py-3">Host</th>
                                    <th className="px-4 py-3">User</th>
                                    <th className="px-4 py-3">Process</th>
                                    <th className="px-4 py-3">Command Line</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                                {logs.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-10 text-center text-gray-500 font-sans">
                                            {loading ? 'Executing search query...' : 'No telemetry records found.'}
                                        </td>
                                    </tr>
                                ) : (
                                    logs.map((log) => {
                                        const isSelected = selectedLog?.event_id === log.event_id;
                                        return (
                                            <tr
                                                key={log.event_id}
                                                onClick={() => setSelectedLog(log)}
                                                className={`cursor-pointer transition-colors ${
                                                    isSelected
                                                        ? 'bg-emerald-500/10 text-emerald-400'
                                                        : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'
                                                }`}
                                            >
                                                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                                                    {log.timestamp?.replace('T', ' ').slice(11, 19)}
                                                </td>
                                                <td className="px-4 py-3 text-gray-900 dark:text-white whitespace-nowrap">
                                                    {log.hostname}
                                                </td>
                                                <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                                                    {log.user_name}
                                                </td>
                                                <td className="px-4 py-3 text-emerald-500 font-bold whitespace-nowrap">
                                                    {log.process_name}
                                                </td>
                                                <td className="px-4 py-3 text-gray-600 dark:text-gray-300 max-w-md truncate">
                                                    {log.command_line}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Selected Inspector Drawer */}
                {selectedLog && (
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/80 rounded-xl p-5 shadow-sm space-y-4">
                        <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-700 pb-3">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                                <Terminal size={15} className="text-emerald-500" />
                                Event Inspector #{selectedLog.event_id}
                            </h3>
                            <button
                                onClick={() => setSelectedLog(null)}
                                className="text-xs text-gray-400 hover:text-white"
                            >
                                Close &times;
                            </button>
                        </div>

                        <div className="space-y-3 text-xs">
                            <div>
                                <span className="text-gray-400 block text-[11px] mb-0.5">Execution Timestamp</span>
                                <span className="font-mono text-gray-900 dark:text-white">
                                    {selectedLog.timestamp?.replace('T', ' ').slice(0, 19)}
                                </span>
                            </div>

                            <div>
                                <span className="text-gray-400 block text-[11px] mb-0.5">Target Host</span>
                                <span className="font-mono font-bold text-gray-900 dark:text-white">
                                    {selectedLog.hostname}
                                </span>
                            </div>

                            <div>
                                <span className="text-gray-400 block text-[11px] mb-0.5">Process Binary</span>
                                <span className="font-mono text-emerald-500 font-semibold">
                                    {selectedLog.process_name}
                                </span>
                            </div>

                            <div>
                                <span className="text-gray-400 block text-[11px] mb-0.5">User Identity</span>
                                <span className="font-mono text-gray-900 dark:text-white">
                                    {selectedLog.user_name}
                                </span>
                            </div>

                            <div>
                                <span className="text-gray-400 block text-[11px] mb-1">Full Command Line</span>
                                <div className="p-3 bg-gray-950 rounded-lg text-emerald-400 font-mono text-xs overflow-x-auto border border-gray-800">
                                    <code>{selectedLog.command_line}</code>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LogExplorer;
