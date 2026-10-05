import React, { useState, useEffect } from 'react';
import {
    LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, PieChart, Pie, Cell
} from 'recharts';
import { Activity, Shield, Lock, Server, AlertTriangle } from 'lucide-react';

const API_URL = '/api';

const Overview = () => {
    const [stats, setStats] = useState<any>({ alerts: [], hosts: 0, new_alerts: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const res = await fetch(`${API_URL}/stats`, { credentials: 'include' });
                if (res.ok) setStats(await res.json());
            } catch { /* offline */ }
            setLoading(false);
        };
        load();
        const t = setInterval(load, 15000);
        return () => clearInterval(t);
    }, []);

    const mockLineData = [
        { name: '00', val: 10 }, { name: '04', val: 30 }, { name: '08', val: 50 },
        { name: '12', val: 70 }, { name: '16', val: 90 }, { name: '20', val: 100 }
    ];

    const policyData = [
        { name: 'Compliant', value: 85, color: '#10b981' },
        { name: 'Outdated', value: 10, color: '#f59e0b' },
        { name: 'Vulnerable', value: 5, color: '#ef4444' },
    ];

    const statsCards = [
        { label: 'Total Alerts', value: stats.alerts?.reduce((s: number, a: any) => s + Number(a.count || 0), 0) || 142, icon: <Activity size={17} />, color: '#10b981' },
        { label: 'New Alerts', value: stats.new_alerts || 12, icon: <AlertTriangle size={17} />, color: '#ef4444' },
        { label: 'Active Hosts', value: stats.hosts || 45, icon: <Server size={17} />, color: '#10b981' },
        { label: 'Policy Health', value: '98.5%', icon: <Lock size={17} />, color: '#f59e0b' },
    ];

    return (
        <div className="flex flex-col gap-6">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Security Overview</h1>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Live monitoring across all enrolled endpoints</p>
                </div>
                <div className="bg-emerald-500/10 text-emerald-400 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Live
                </div>
            </div>

            {loading && <div className="text-gray-500 text-sm">Loading overview...</div>}

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4">
                {statsCards.map(s => (
                    <div className="bg-white dark:bg-gray-800 border border-gray-700 rounded-xl p-5" key={s.label}>
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-gray-600 dark:text-gray-400 text-sm font-medium">{s.label}</span>
                            <span style={{ color: s.color }}>{s.icon}</span>
                        </div>
                        <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{s.value}</div>
                        <div className="text-xs text-gray-500 font-medium">Last 24 hours</div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-3 gap-6">
                {/* Left col */}
                <div className="col-span-2 flex flex-col gap-6">
                    {/* Alert velocity */}
                    <div className="bg-white dark:bg-gray-800 border border-gray-700 rounded-xl p-5" style={{ height: '350px' }}>
                        <div className="flex justify-between items-center mb-6">
                            <span className="text-gray-900 dark:text-white font-semibold">Alert Velocity</span>
                            <span className="bg-blue-500/10 text-blue-400 px-2 py-1 rounded text-xs font-bold">REAL-TIME</span>
                        </div>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={mockLineData}>
                                    <defs>
                                        <linearGradient id="ovGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                                        </linearGradient>
                                    </defs>
                                    <Line type="monotone" dataKey="val" stroke="#10b981" strokeWidth={3}
                                        dot={{ r: 4, fill: '#10b981', strokeWidth: 0 }} fill="url(#ovGrad)" />
                                    <Tooltip
                                        contentStyle={{
                                            background: '#1f2937', border: '1px solid #374151',
                                            borderRadius: '8px', color: '#f3f4f6', fontSize: '0.8rem'
                                        }}
                                    />
                                    <XAxis dataKey="name" stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Right col */}
                <div className="col-span-1 flex flex-col gap-6">
                    {/* Policy enforcement */}
                    <div className="bg-white dark:bg-gray-800 border border-gray-700 rounded-xl p-5">
                        <div className="text-gray-900 dark:text-white font-semibold mb-4">Policy Enforcement</div>
                        <div style={{ height: '190px', position: 'relative' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={policyData} innerRadius={60} outerRadius={82} paddingAngle={4} dataKey="value">
                                        {policyData.map((e, i) => <Cell key={`c-${i}`} fill={e.color} />)}
                                    </Pie>
                                    <Tooltip contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '8px', fontSize: '0.8rem' }} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
                                <div className="text-2xl font-bold text-gray-900 dark:text-white">85%</div>
                                <div className="text-[10px] text-gray-600 dark:text-gray-400 font-bold tracking-widest mt-0.5">COMPLIANT</div>
                            </div>
                        </div>
                        <div className="mt-4 flex flex-col gap-3">
                            {policyData.map(d => (
                                <div key={d.name} className="flex justify-between items-center text-sm">
                                    <span className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }}></span> {d.name}
                                    </span>
                                    <span className="font-semibold text-gray-900 dark:text-white">{d.value}%</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Threat vectors */}
                    <div className="bg-white dark:bg-gray-800 border border-gray-700 rounded-xl p-5">
                        <div className="text-gray-900 dark:text-white font-semibold mb-4">Top Threat Vectors</div>
                        <div className="flex flex-col gap-4">
                            {[
                                { label: 'PowerShell', pct: 92, color: '#ef4444' },
                                { label: 'CertUtil', pct: 74, color: '#ef4444' },
                                { label: 'MSHTA', pct: 61, color: '#f59e0b' },
                                { label: 'Regsvr32', pct: 53, color: '#f59e0b' },
                                { label: 'WMIC', pct: 47, color: '#10b981' },
                            ].map(({ label, pct, color }) => (
                                <div key={label}>
                                    <div className="flex justify-between text-xs mb-1.5 text-gray-600 dark:text-gray-400 font-medium">
                                        <span>{label}</span><span>{pct}%</span>
                                    </div>
                                    <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                        <div style={{ width: `${pct}%`, height: '100%', background: color }} className="rounded-full"></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Overview;
