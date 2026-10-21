import React, { useState, useEffect } from 'react';
import {
    FileText, Download, Calendar, Shield, Activity,
    TrendingUp, Server, CheckCircle, RefreshCw
} from 'lucide-react';

const API_URL = '/api';

const Reports: React.FC = () => {
    const [summary, setSummary] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);

    const loadSummary = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/reports/summary`, { credentials: 'include' });
            if (res.ok) {
                setSummary(await res.json());
            }
        } catch (err) {
            console.error('Failed to load report summary:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSummary();
    }, []);

    const handleExportCSV = () => {
        setExporting(true);
        try {
            if (!summary) return;
            const rows = [
                ['Report Generated', summary.generated_at],
                [],
                ['Severity', 'Alert Count'],
                ...(summary.alerts_by_severity || []).map((s: any) => [s.severity, s.count]),
                [],
                ['Rule Name', 'Technique', 'Trigger Count'],
                ...(summary.top_rules || []).map((r: any) => [r.rule_name, r.technique, r.alert_count]),
                [],
                ['Target Host', 'Alert Count'],
                ...(summary.top_hosts || []).map((h: any) => [h.hostname, h.alert_count]),
                [],
                ['Total Cases', summary.cases?.total || 0],
                ['Closed Cases', summary.cases?.closed || 0]
            ];

            const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.join(',')).join('\n');
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement('a');
            link.setAttribute('href', encodedUri);
            link.setAttribute('download', `SOCflow_Security_Report_${new Date().toISOString().slice(0, 10)}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className="flex flex-col gap-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                        Security &amp; Compliance Reports
                    </h1>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                        Periodic executive summaries, MITRE attack vectors, and incident metrics
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleExportCSV}
                        disabled={exporting || !summary}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-gray-950 transition-colors shadow-sm disabled:opacity-60"
                    >
                        <Download size={14} />
                        {exporting ? 'Generating CSV...' : 'Export Report (CSV)'}
                    </button>
                    <button
                        onClick={loadSummary}
                        className="p-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50"
                        title="Refresh"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Quick Metrics */}
            {summary && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/80 rounded-xl p-5 shadow-sm">
                        <div className="flex justify-between items-center text-gray-400 text-xs font-bold uppercase mb-2">
                            <span>Investigation Cases</span>
                            <FileText size={16} className="text-blue-500" />
                        </div>
                        <div className="text-3xl font-extrabold text-gray-900 dark:text-white">
                            {summary.cases?.total ?? 0}
                        </div>
                        <p className="text-xs text-emerald-500 font-medium mt-1">
                            {summary.cases?.closed ?? 0} Resolved &amp; Closed
                        </p>
                    </div>

                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/80 rounded-xl p-5 shadow-sm">
                        <div className="flex justify-between items-center text-gray-400 text-xs font-bold uppercase mb-2">
                            <span>Top Targeted Vector</span>
                            <Shield size={16} className="text-orange-500" />
                        </div>
                        <div className="text-xl font-bold text-gray-900 dark:text-white truncate mt-1">
                            {summary.top_rules?.[0]?.rule_name || 'PowerShell Cradle'}
                        </div>
                        <p className="text-xs text-gray-500 font-mono mt-1">
                            Technique: {summary.top_rules?.[0]?.technique || 'T1059.001'}
                        </p>
                    </div>

                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/80 rounded-xl p-5 shadow-sm">
                        <div className="flex justify-between items-center text-gray-400 text-xs font-bold uppercase mb-2">
                            <span>Most Active Host</span>
                            <Server size={16} className="text-emerald-500" />
                        </div>
                        <div className="text-xl font-bold text-gray-900 dark:text-white font-mono mt-1">
                            {summary.top_hosts?.[0]?.hostname || 'FIN-SRV-01'}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            {summary.top_hosts?.[0]?.alert_count || 0} Alert Events
                        </p>
                    </div>
                </div>
            )}

            {/* Breakdown Tables */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Top Triggered LOLBin Rules */}
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/80 rounded-xl p-5 shadow-sm">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-4">
                        Top Triggered Attack Techniques
                    </h2>
                    <div className="space-y-3">
                        {summary?.top_rules?.length === 0 ? (
                            <div className="text-xs text-gray-500 text-center py-6">No rule metrics available.</div>
                        ) : (
                            summary?.top_rules?.map((r: any, idx: number) => (
                                <div key={idx} className="flex justify-between items-center text-xs pb-2 border-b border-gray-100 dark:border-gray-700/60 last:border-0">
                                    <div>
                                        <div className="font-semibold text-gray-900 dark:text-white">{r.rule_name}</div>
                                        <div className="font-mono text-emerald-500 text-[11px] font-bold">{r.technique}</div>
                                    </div>
                                    <span className="font-bold text-gray-700 dark:text-gray-300 font-mono">
                                        {r.alert_count} alerts
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Severity Breakdown */}
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/80 rounded-xl p-5 shadow-sm">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-4">
                        Severity Classification Breakdown
                    </h2>
                    <div className="space-y-3">
                        {summary?.alerts_by_severity?.length === 0 ? (
                            <div className="text-xs text-gray-500 text-center py-6">No alert records found.</div>
                        ) : (
                            summary?.alerts_by_severity?.map((s: any, idx: number) => (
                                <div key={idx} className="flex justify-between items-center text-xs pb-2 border-b border-gray-100 dark:border-gray-700/60 last:border-0">
                                    <span className="font-semibold capitalize text-gray-900 dark:text-white">
                                        {s.severity} Severity
                                    </span>
                                    <span className="font-bold text-gray-700 dark:text-gray-300 font-mono">
                                        {s.count} alerts
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Reports;
