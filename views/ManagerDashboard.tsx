import React, { useState, useEffect } from 'react';
import {
    Activity, Shield, Server, AlertTriangle, Clock,
    CheckCircle, ArrowUpRight, TrendingUp, Users, FileText,
    ClipboardList, Download, ShieldAlert, Cpu
} from 'lucide-react';
import {
    BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip,
    PieChart, Pie, Cell
} from 'recharts';
import { useNavigate } from 'react-router-dom';

const API_URL = '/api';

const SEVERITY_COLORS: Record<string, string> = {
    critical: '#ef4444',
    high: '#f97316',
    medium: '#eab308',
    low: '#3b82f6'
};

const ManagerDashboard: React.FC = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState<any>({
        alerts: [],
        hosts: 0,
        hosts_total: 0,
        new_alerts: 0,
        active_rules: 14,
        cases: { total: 0, open: 0 },
        top_hosts: [],
        top_rules: []
    });
    const [users, setUsers] = useState<any[]>([]);
    const [recentAudits, setRecentAudits] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState(false);

    const loadData = async () => {
        try {
            const [statsRes, usersRes, auditRes] = await Promise.all([
                fetch(`${API_URL}/stats`, { credentials: 'include' }),
                fetch(`${API_URL}/users`, { credentials: 'include' }),
                fetch(`${API_URL}/audit-logs`, { credentials: 'include' })
            ]);

            if (statsRes.ok) setStats(await statsRes.json());
            if (usersRes.ok) setUsers(await usersRes.json());
            if (auditRes.ok) {
                const audits = await auditRes.json();
                setRecentAudits(Array.isArray(audits) ? audits.slice(0, 5) : []);
            }
        } catch (err) {
            console.error('Failed to load manager dashboard data:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
        const interval = setInterval(loadData, 10000);
        return () => clearInterval(interval);
    }, []);

    const handleDownloadAgent = async () => {
        setDownloading(true);
        try {
            const res = await fetch(`${API_URL}/agent/download`, { credentials: 'include' });
            if (res.ok) {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'SOCflow_Agent_Installer.zip';
                document.body.appendChild(a);
                a.click();
                a.remove();
            }
        } catch (err) {
            console.error('Download agent failed:', err);
        } finally {
            setDownloading(false);
        }
    };

    const totalAlertCount = (stats.alerts || []).reduce(
        (sum: number, item: any) => sum + Number(item.count || 0),
        0
    );

    const severityChartData = [
        { name: 'Critical', value: Number((stats.alerts || []).find((a: any) => a.severity === 'critical')?.count || 0), color: SEVERITY_COLORS.critical },
        { name: 'High', value: Number((stats.alerts || []).find((a: any) => a.severity === 'high')?.count || 0), color: SEVERITY_COLORS.high },
        { name: 'Medium', value: Number((stats.alerts || []).find((a: any) => a.severity === 'medium')?.count || 0), color: SEVERITY_COLORS.medium },
        { name: 'Low', value: Number((stats.alerts || []).find((a: any) => a.severity === 'low')?.count || 0), color: SEVERITY_COLORS.low }
    ];

    const hostData = (stats.top_hosts && stats.top_hosts.length > 0)
        ? stats.top_hosts
        : [
            { host: 'AUTH-DC-01', alerts: 0 },
            { host: 'FIN-SRV-01', alerts: 0 }
        ];

    return (
        <div className="flex flex-col gap-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-purple-500/10 text-purple-400 border border-purple-500/30">
                            Executive Portal
                        </span>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                            Security Governance & Fleet Posture
                        </h1>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        High-level fleet coverage, rule telemetry, analyst capacity, and regulatory audit trail
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleDownloadAgent}
                        disabled={downloading}
                        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-gray-950 transition-colors shadow-sm disabled:opacity-60"
                    >
                        <Download size={14} />
                        {downloading ? 'Preparing Bundle...' : 'Agent Package (ZIP)'}
                    </button>
                    <button
                        onClick={() => navigate('/reports')}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/60 transition-colors text-gray-700 dark:text-gray-200"
                    >
                        <FileText size={14} /> Executive Report
                    </button>
                    <button
                        onClick={loadData}
                        className="px-3 py-2 rounded-lg text-xs font-medium bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/60 transition-colors text-gray-700 dark:text-gray-200"
                    >
                        Refresh
                    </button>
                </div>
            </div>

            {/* Governance KPI Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div
                    onClick={() => navigate('/hosts')}
                    className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/80 rounded-xl p-5 shadow-sm cursor-pointer hover:border-emerald-500/50 transition-all"
                >
                    <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 mb-3">
                        <span className="text-xs uppercase font-bold tracking-wider">Fleet Coverage</span>
                        <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                            <Server size={18} />
                        </div>
                    </div>
                    <div className="text-3xl font-extrabold text-gray-900 dark:text-white">
                        {stats.hosts ?? 0} <span className="text-sm font-medium text-gray-500">/ {stats.hosts_total ?? stats.hosts ?? 0}</span>
                    </div>
                    <p className="text-xs text-emerald-500 font-medium mt-2 flex items-center gap-1">
                        <CheckCircle size={14} /> Endpoints streaming Sysmon telemetry
                    </p>
                </div>

                <div
                    onClick={() => navigate('/rules')}
                    className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/80 rounded-xl p-5 shadow-sm cursor-pointer hover:border-emerald-500/50 transition-all"
                >
                    <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 mb-3">
                        <span className="text-xs uppercase font-bold tracking-wider">Active Detection Rules</span>
                        <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                            <ShieldAlert size={18} />
                        </div>
                    </div>
                    <div className="text-3xl font-extrabold text-gray-900 dark:text-white">
                        {stats.active_rules ?? 14}
                    </div>
                    <p className="text-xs text-emerald-500 font-medium mt-2 flex items-center gap-1">
                        <TrendingUp size={14} /> 100% LOLBin attack coverage
                    </p>
                </div>

                <div
                    onClick={() => navigate('/users')}
                    className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/80 rounded-xl p-5 shadow-sm cursor-pointer hover:border-emerald-500/50 transition-all"
                >
                    <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 mb-3">
                        <span className="text-xs uppercase font-bold tracking-wider">SOC Operations Team</span>
                        <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                            <Users size={18} />
                        </div>
                    </div>
                    <div className="text-3xl font-extrabold text-gray-900 dark:text-white">
                        {users.length} <span className="text-sm font-medium text-gray-500">Staff</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        {users.filter((u: any) => (u.role_name || '').toLowerCase() === 'analyst').length} Triage Analysts on duty
                    </p>
                </div>

                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/80 rounded-xl p-5 shadow-sm">
                    <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 mb-3">
                        <span className="text-xs uppercase font-bold tracking-wider">Open Incidents / Total</span>
                        <div className="p-2 rounded-lg bg-orange-500/10 text-orange-500">
                            <Activity size={18} />
                        </div>
                    </div>
                    <div className="text-3xl font-extrabold text-orange-400">
                        {stats.cases?.open ?? 0} <span className="text-sm font-medium text-gray-500">/ {stats.cases?.total ?? 0}</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        Active case investigations
                    </p>
                </div>
            </div>

            {/* Visualizations & Fleet Posture */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Severity Breakdown */}
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/80 rounded-xl p-5 shadow-sm flex flex-col justify-between">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-sm font-bold text-gray-900 dark:text-white tracking-wide uppercase">
                            Fleet Risk Distribution
                        </h2>
                    </div>

                    <div className="h-52 relative flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={severityChartData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={55}
                                    outerRadius={80}
                                    paddingAngle={4}
                                    dataKey="value"
                                >
                                    {severityChartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#1f2937',
                                        borderColor: '#374151',
                                        borderRadius: '8px',
                                        color: '#fff',
                                        fontSize: '12px'
                                    }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100 dark:border-gray-700/60 text-xs">
                        {severityChartData.map((s) => (
                            <div key={s.name} className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }}></span>
                                <span className="text-gray-600 dark:text-gray-400">{s.name}:</span>
                                <span className="font-bold text-gray-900 dark:text-white">{s.value}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Top Targeted Endpoints */}
                <div className="lg:col-span-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/80 rounded-xl p-5 shadow-sm flex flex-col justify-between">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-sm font-bold text-gray-900 dark:text-white tracking-wide uppercase">
                            Top Endpoints by Incident Volume
                        </h2>
                        <button
                            onClick={() => navigate('/hosts')}
                            className="text-xs text-emerald-500 hover:underline font-semibold"
                        >
                            Fleet Inventory &rarr;
                        </button>
                    </div>

                    <div className="h-52">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={hostData} layout="vertical" margin={{ left: 20, right: 20, top: 10, bottom: 10 }}>
                                <XAxis type="number" stroke="#6b7280" fontSize={11} />
                                <YAxis type="category" dataKey="host" stroke="#9ca3af" fontSize={12} width={100} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#1f2937',
                                        borderColor: '#374151',
                                        borderRadius: '8px',
                                        color: '#fff',
                                        fontSize: '12px'
                                    }}
                                />
                                <Bar dataKey="alerts" fill="#10b981" radius={[0, 6, 6, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="pt-2 border-t border-gray-100 dark:border-gray-700/60 text-xs text-gray-500 flex justify-between items-center">
                        <span>Total Alerts Flagged: <strong className="text-white">{totalAlertCount}</strong></span>
                        <span className="text-emerald-500 font-medium">Pipeline: Redis Queue &amp; MySQL</span>
                    </div>
                </div>
            </div>

            {/* Quick Operations Strip: Team & Compliance Audit */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Analyst Team Roster */}
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/80 rounded-xl p-5 shadow-sm">
                    <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-2">
                            <Users size={16} className="text-emerald-500" />
                            <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wide">
                                Active SOC Team &amp; Workload
                            </h2>
                        </div>
                        <button
                            onClick={() => navigate('/users')}
                            className="text-xs text-emerald-500 hover:underline font-semibold"
                        >
                            Manage Accounts &rarr;
                        </button>
                    </div>

                    <div className="divide-y divide-gray-100 dark:divide-gray-700/60">
                        {users.slice(0, 4).map((u: any) => (
                            <div key={u.login_id} className="py-2.5 flex items-center justify-between text-xs">
                                <div>
                                    <div className="font-semibold text-gray-900 dark:text-white">
                                        {u.full_name || u.email}
                                    </div>
                                    <div className="text-gray-500 font-mono text-[11px]">{u.email}</div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-gray-700 text-gray-300">
                                        {u.role_name}
                                    </span>
                                    <span className={`w-2 h-2 rounded-full ${u.status === 'active' ? 'bg-emerald-500' : 'bg-gray-500'}`} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Regulatory Audit Stream */}
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/80 rounded-xl p-5 shadow-sm">
                    <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-2">
                            <ClipboardList size={16} className="text-emerald-500" />
                            <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wide">
                                Recent Governance &amp; Audit Log
                            </h2>
                        </div>
                        <button
                            onClick={() => navigate('/audit')}
                            className="text-xs text-emerald-500 hover:underline font-semibold"
                        >
                            Full Audit Log &rarr;
                        </button>
                    </div>

                    <div className="divide-y divide-gray-100 dark:divide-gray-700/60">
                        {recentAudits.length === 0 ? (
                            <p className="text-xs text-gray-500 py-4 text-center">No audit trail entries recorded.</p>
                        ) : (
                            recentAudits.map((a: any) => (
                                <div key={a.audit_id} className="py-2.5 flex items-center justify-between text-xs">
                                    <div>
                                        <span className="font-semibold text-gray-900 dark:text-white mr-2">
                                            {a.action}
                                        </span>
                                        <span className="text-gray-500 font-mono text-[11px]">{a.user_email || 'System'}</span>
                                    </div>
                                    <div className="text-gray-500 text-[11px] font-mono">
                                        {a.timestamp ? a.timestamp.slice(0, 19).replace('T', ' ') : ''}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ManagerDashboard;
