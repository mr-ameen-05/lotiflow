import React, { useState, useEffect } from 'react';
import {
    Activity, Shield, Server, AlertTriangle, Clock,
    CheckCircle, ArrowUpRight, TrendingUp
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

const Overview: React.FC = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState<any>({ alerts: [], hosts: 0, new_alerts: 0 });
    const [recentAlerts, setRecentAlerts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const userRole = localStorage.getItem('userRole') || 'ANALYST';
    const isManager = userRole === 'MANAGER';

    const loadData = async () => {
        try {
            const [statsRes, alertsRes] = await Promise.all([
                fetch(`${API_URL}/stats`, { credentials: 'include' }),
                fetch(`${API_URL}/alerts`, { credentials: 'include' })
            ]);

            if (statsRes.ok) setStats(await statsRes.json());
            if (alertsRes.ok) {
                const alertData = await alertsRes.json();
                setRecentAlerts(Array.isArray(alertData) ? alertData.slice(0, 6) : []);
            }
        } catch (err) {
            console.error('Failed to load overview data:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
        const interval = setInterval(loadData, 10000);
        return () => clearInterval(interval);
    }, []);

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

    const topHostsData = [
        { host: 'FIN-SRV-01', alerts: 8 },
        { host: 'DEV-WKST-04', alerts: 5 },
        { host: 'AUTH-DC-01', alerts: 3 }
    ];

    return (
        <div className="flex flex-col gap-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                        SOC Operations Overview
                    </h1>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                        Real-time Living-off-the-Land behavioral telemetry and posture
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        14 LOLBin Rules Active
                    </span>
                    <button
                        onClick={loadData}
                        className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/60 transition-colors text-gray-700 dark:text-gray-200"
                    >
                        Refresh Feed
                    </button>
                </div>
            </div>

            {/* KPI Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/80 rounded-xl p-5 shadow-sm">
                    <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 mb-3">
                        <span className="text-xs uppercase font-bold tracking-wider">Active Hosts</span>
                        <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                            <Server size={18} />
                        </div>
                    </div>
                    <div className="text-3xl font-extrabold text-gray-900 dark:text-white">
                        {stats.hosts ?? 0}
                    </div>
                    <p className="text-xs text-emerald-500 font-medium mt-2 flex items-center gap-1">
                        <TrendingUp size={14} /> Telemetry heartbeats active
                    </p>
                </div>

                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/80 rounded-xl p-5 shadow-sm">
                    <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 mb-3">
                        <span className="text-xs uppercase font-bold tracking-wider">Total Alerts</span>
                        <div className="p-2 rounded-lg bg-orange-500/10 text-orange-500">
                            <Activity size={18} />
                        </div>
                    </div>
                    <div className="text-3xl font-extrabold text-gray-900 dark:text-white">
                        {totalAlertCount}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        Recorded across endpoint fleet
                    </p>
                </div>

                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/80 rounded-xl p-5 shadow-sm">
                    <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 mb-3">
                        <span className="text-xs uppercase font-bold tracking-wider">New / Untriaged</span>
                        <div className="p-2 rounded-lg bg-red-500/10 text-red-500">
                            <AlertTriangle size={18} />
                        </div>
                    </div>
                    <div className="text-3xl font-extrabold text-red-500">
                        {stats.new_alerts ?? 0}
                    </div>
                    <p className="text-xs text-red-400 font-medium mt-2">
                        Requiring analyst acknowledgment
                    </p>
                </div>

                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/80 rounded-xl p-5 shadow-sm">
                    <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 mb-3">
                        <span className="text-xs uppercase font-bold tracking-wider">Active Pipeline</span>
                        <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                            <Shield size={18} />
                        </div>
                    </div>
                    <div className="text-3xl font-extrabold text-gray-900 dark:text-white">
                        100%
                    </div>
                    <p className="text-xs text-emerald-500 font-medium mt-2">
                        Redis queue ingestion online
                    </p>
                </div>
            </div>

            {/* Visualizations Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Severity Breakdown */}
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/80 rounded-xl p-5 shadow-sm flex flex-col justify-between">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-sm font-bold text-gray-900 dark:text-white tracking-wide uppercase">
                            Alert Severity Distribution
                        </h2>
                    </div>

                    <div className="h-56 relative flex items-center justify-center">
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
                            Top Enrolled Hosts by Alert Volume
                        </h2>
                        <span className="text-xs text-gray-500">Live Metric</span>
                    </div>

                    <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={topHostsData} layout="vertical" margin={{ left: 20, right: 20, top: 10, bottom: 10 }}>
                                <XAxis type="number" stroke="#6b7280" fontSize={11} />
                                <YAxis type="category" dataKey="host" stroke="#9ca3af" fontSize={12} width={90} />
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
                        <span>Monitored channels: Sysmon Event ID 1 (Process Create)</span>
                        {isManager ? (
                            <button
                                onClick={() => navigate('/hosts')}
                                className="text-emerald-500 hover:underline font-semibold flex items-center gap-1"
                            >
                                Manage Fleet &rarr;
                            </button>
                        ) : (
                            <button
                                onClick={() => navigate('/alerts')}
                                className="text-emerald-500 hover:underline font-semibold flex items-center gap-1"
                            >
                                View Alerts &rarr;
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Recent Alert Feed Table */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/80 rounded-xl overflow-hidden shadow-sm">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700/80 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/40">
                    <div>
                        <h2 className="text-sm font-bold text-gray-900 dark:text-white tracking-wide uppercase">
                            Recent LOLBin Incidents
                        </h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            Latest alerts processed by the Python Behavioral Engine
                        </p>
                    </div>
                    {!isManager && (
                        <button
                            onClick={() => navigate('/alerts')}
                            className="text-xs font-semibold text-emerald-500 hover:text-emerald-400 flex items-center gap-1"
                        >
                            View All Alerts <ArrowUpRight size={14} />
                        </button>
                    )}
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="text-[11px] uppercase tracking-wider bg-gray-50 dark:bg-gray-900/60 text-gray-500 border-b border-gray-200 dark:border-gray-700">
                            <tr>
                                <th className="px-6 py-3 font-semibold">Alert ID / Time</th>
                                <th className="px-6 py-3 font-semibold">Severity</th>
                                <th className="px-6 py-3 font-semibold">Rule Triggered</th>
                                <th className="px-6 py-3 font-semibold">Host</th>
                                <th className="px-6 py-3 font-semibold">Confidence</th>
                                <th className="px-6 py-3 font-semibold">Status</th>
                                <th className="px-6 py-3 font-semibold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                            {recentAlerts.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500 text-sm">
                                        No recent alerts found. Active monitoring in progress.
                                    </td>
                                </tr>
                            ) : (
                                recentAlerts.map((alert: any) => {
                                    const sev = (alert.severity || 'medium').toLowerCase();
                                    const sevClass =
                                        sev === 'critical' ? 'bg-red-500/10 text-red-500 border-red-500/30' :
                                        sev === 'high' ? 'bg-orange-500/10 text-orange-500 border-orange-500/30' :
                                        sev === 'medium' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30' :
                                        'bg-blue-500/10 text-blue-500 border-blue-500/30';

                                    return (
                                        <tr key={alert.alert_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                            <td className="px-6 py-3.5">
                                                <div className="font-semibold text-gray-900 dark:text-white">
                                                    #{alert.alert_id}
                                                </div>
                                                <div className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                                                    <Clock size={11} /> {alert.timestamp?.slice(0, 19).replace('T', ' ')}
                                                </div>
                                            </td>
                                            <td className="px-6 py-3.5">
                                                <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded border ${sevClass}`}>
                                                    {sev}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3.5">
                                                <div className="font-medium text-gray-900 dark:text-gray-100">
                                                    {alert.rule_name || alert.description}
                                                </div>
                                                {alert.technique && (
                                                    <span className="text-[10px] font-mono text-emerald-500 font-semibold">
                                                        {alert.technique}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-3.5 font-mono text-xs text-gray-700 dark:text-gray-300">
                                                {alert.host || 'Unknown'}
                                            </td>
                                            <td className="px-6 py-3.5">
                                                <div className="flex items-center gap-1.5 font-semibold text-xs text-gray-900 dark:text-white">
                                                    <span>{alert.confidence_score ?? 70}%</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-3.5">
                                                <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${
                                                    alert.status === 'new'
                                                        ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                                        : 'bg-gray-500/10 text-gray-400 border border-gray-500/20'
                                                }`}>
                                                    {alert.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3.5 text-right">
                                                <button
                                                    onClick={() => navigate(isManager ? '/overview' : `/alerts/${alert.alert_id}`)}
                                                    className="text-xs font-semibold text-emerald-500 hover:text-emerald-400 transition-colors"
                                                >
                                                    {isManager ? 'View' : 'Investigate'} &rarr;
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Overview;
