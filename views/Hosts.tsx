import React, { useState, useEffect } from 'react';
import {
    Server, Download, ShieldCheck, Activity, Plus,
    RefreshCw, Clock, Monitor, Key, CheckCircle, XCircle
} from 'lucide-react';

const API_URL = '/api';

const Hosts: React.FC = () => {
    const [hosts, setHosts] = useState<any[]>([]);
    const [agents, setAgents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [hostname, setHostname] = useState('');
    const [ipAddress, setIpAddress] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    const loadData = async () => {
        setLoading(true);
        try {
            const [hostsRes, agentsRes] = await Promise.all([
                fetch(`${API_URL}/hosts`, { credentials: 'include' }),
                fetch(`${API_URL}/agents`, { credentials: 'include' })
            ]);
            if (hostsRes.ok) setHosts(await hostsRes.json());
            if (agentsRes.ok) setAgents(await agentsRes.json());
        } catch (err) {
            console.error('Failed to load fleet hosts:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleAddHost = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const res = await fetch(`${API_URL}/hosts/add`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ hostname, ip_address: ipAddress })
            });
            if (res.ok) {
                setShowAddModal(false);
                setHostname('');
                setIpAddress('');
                setMessage('Host added to registry.');
                setTimeout(() => setMessage(null), 3000);
                loadData();
            }
        } catch (err) {
            console.error('Failed to add host:', err);
        } finally {
            setSubmitting(false);
        }
    };

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
            console.error('Failed to download installer:', err);
        } finally {
            setDownloading(false);
        }
    };

    return (
        <div className="flex flex-col gap-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                        Enrolled Hosts &amp; Fleet Management
                    </h1>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                        Monitor Windows endpoints, agent versions, and telemetry collection health
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleDownloadAgent}
                        disabled={downloading}
                        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-gray-950 transition-colors shadow-sm disabled:opacity-60"
                    >
                        <Download size={14} />
                        {downloading ? 'Bundling Package...' : 'Download Agent Bundle (ZIP)'}
                    </button>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/60 transition-colors"
                    >
                        <Plus size={14} /> Register Host
                    </button>
                    <button
                        onClick={loadData}
                        className="p-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50"
                        title="Refresh Fleet"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {message && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-lg font-medium">
                    {message}
                </div>
            )}

            {/* Quick Fleet Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/80 rounded-xl p-4 shadow-sm flex items-center justify-between">
                    <div>
                        <span className="text-xs uppercase font-bold text-gray-400">Total Registered</span>
                        <div className="text-2xl font-extrabold text-gray-900 dark:text-white mt-1">
                            {hosts.length}
                        </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500">
                        <Server size={22} />
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/80 rounded-xl p-4 shadow-sm flex items-center justify-between">
                    <div>
                        <span className="text-xs uppercase font-bold text-gray-400">Online &amp; Streaming</span>
                        <div className="text-2xl font-extrabold text-emerald-500 mt-1">
                            {hosts.filter(h => h.connectivity_status === 'online').length}
                        </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500">
                        <Activity size={22} />
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/80 rounded-xl p-4 shadow-sm flex items-center justify-between">
                    <div>
                        <span className="text-xs uppercase font-bold text-gray-400">Active Agents</span>
                        <div className="text-2xl font-extrabold text-gray-900 dark:text-white mt-1">
                            {agents.length}
                        </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-500">
                        <ShieldCheck size={22} />
                    </div>
                </div>
            </div>

            {/* Enrolled Hosts Table */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/80 rounded-xl overflow-hidden shadow-sm">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700/80 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/40">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        Enrolled Endpoints Inventory
                    </h2>
                    <span className="text-xs text-gray-400">
                        Enrollment Secret: <code className="bg-gray-100 dark:bg-gray-900 px-1.5 py-0.5 rounded font-mono text-emerald-500">SOCflow-Enroll-2026!</code>
                    </span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="text-[11px] uppercase tracking-wider bg-gray-50 dark:bg-gray-900/60 text-gray-500 border-b border-gray-200 dark:border-gray-700">
                            <tr>
                                <th className="px-6 py-3.5 font-semibold">Hostname</th>
                                <th className="px-6 py-3.5 font-semibold">IP Address</th>
                                <th className="px-6 py-3.5 font-semibold">OS Environment</th>
                                <th className="px-6 py-3.5 font-semibold">Criticality</th>
                                <th className="px-6 py-3.5 font-semibold">Heartbeat Status</th>
                                <th className="px-6 py-3.5 font-semibold">Last Seen</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                            {hosts.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-10 text-center text-gray-500 text-sm">
                                        No hosts enrolled yet. Download the agent bundle to onboard a Windows endpoint.
                                    </td>
                                </tr>
                            ) : (
                                hosts.map((h: any) => {
                                    const isOnline = h.connectivity_status === 'online';
                                    return (
                                        <tr key={h.host_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                                    <Monitor size={15} className="text-gray-400" />
                                                    {h.hostname}
                                                </div>
                                                <div className="text-[11px] text-gray-500 font-mono mt-0.5">
                                                    ID: #{h.host_id}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 font-mono text-xs text-gray-700 dark:text-gray-300">
                                                {h.ip_address || '127.0.0.1'}
                                            </td>
                                            <td className="px-6 py-4 text-xs text-gray-700 dark:text-gray-300">
                                                <div>{h.os_name || 'Windows 10/11 Enterprise'}</div>
                                                <span className="text-[10px] text-gray-400 uppercase font-bold">
                                                    Env: {h.environment || 'lab'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded border ${
                                                    h.criticality === 'high' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                                    h.criticality === 'medium' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
                                                    'bg-blue-500/10 text-blue-500 border-blue-500/20'
                                                }`}>
                                                    {h.criticality || 'medium'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                                    isOnline
                                                        ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                                        : 'bg-gray-500/10 text-gray-400 border border-gray-500/20'
                                                }`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`}></span>
                                                    {isOnline ? 'Online' : 'Offline'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-xs text-gray-500 font-mono">
                                                {h.last_seen ? h.last_seen.replace('T', ' ').slice(0, 19) : 'Never'}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Manual Register Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 bg-gray-950/70 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl w-full max-w-md p-6 shadow-2xl">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                            Register Target Endpoint
                        </h3>
                        <p className="text-xs text-gray-500 mb-4">
                            Provision a host entry ahead of agent software installation.
                        </p>

                        <form onSubmit={handleAddHost} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Hostname</label>
                                <input
                                    type="text"
                                    required
                                    value={hostname}
                                    onChange={(e) => setHostname(e.target.value)}
                                    placeholder="e.g. FIN-SRV-02"
                                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:border-emerald-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">IP Address</label>
                                <input
                                    type="text"
                                    required
                                    value={ipAddress}
                                    onChange={(e) => setIpAddress(e.target.value)}
                                    placeholder="e.g. 192.168.1.15"
                                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:border-emerald-500"
                                />
                            </div>

                            <div className="flex justify-end gap-2.5 pt-3">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="px-4 py-2 rounded-lg text-xs font-semibold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-4 py-2 rounded-lg text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-gray-950 transition-colors shadow-sm"
                                >
                                    {submitting ? 'Registering...' : 'Save Host'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Hosts;
