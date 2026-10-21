import React, { useState, useEffect } from 'react';
import {
    ShieldAlert, ToggleLeft, ToggleRight, CheckCircle,
    XCircle, Clock, AlertTriangle, RefreshCw, Search
} from 'lucide-react';

const API_URL = '/api';

const Rules: React.FC = () => {
    const [rules, setRules] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [updatingId, setUpdatingId] = useState<number | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    const loadRules = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/rules`, { credentials: 'include' });
            if (res.ok) {
                setRules(await res.json());
            }
        } catch (err) {
            console.error('Failed to load rules:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadRules();
    }, []);

    const toggleRule = async (ruleId: number, currentEnabled: number | boolean) => {
        setUpdatingId(ruleId);
        const nextState = !currentEnabled;
        try {
            const res = await fetch(`${API_URL}/rules/${ruleId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ enabled: nextState })
            });

            if (res.ok) {
                setRules(rules.map(r => r.rule_id === ruleId ? { ...r, enabled: nextState ? 1 : 0 } : r));
                setMessage(`Rule #${ruleId} ${nextState ? 'enabled' : 'disabled'}.`);
                setTimeout(() => setMessage(null), 3000);
            }
        } catch (err) {
            console.error('Failed to toggle rule:', err);
        } finally {
            setUpdatingId(null);
        }
    };

    const filteredRules = rules.filter(r =>
        (r.rule_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.technique || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.description || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

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
                        LOLBin Detection Rules Engine
                    </h1>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                        Configure and toggle the 14 MITRE ATT&amp;CK Living-off-the-Land detection heuristics
                    </p>
                </div>
                <button
                    onClick={loadRules}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50"
                >
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    Refresh Rules
                </button>
            </div>

            {message && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-lg font-medium">
                    {message}
                </div>
            )}

            {/* Search & Counter Bar */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/80 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-3">
                <div className="relative w-full sm:w-80">
                    <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search rules by name, technique (T1059)..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg pl-9 pr-3.5 py-2 text-xs text-gray-900 dark:text-white outline-none focus:border-emerald-500"
                    />
                </div>
                <div className="text-xs text-gray-500 font-medium">
                    Showing <span className="font-bold text-gray-900 dark:text-white">{filteredRules.length}</span> of {rules.length} rules
                </div>
            </div>

            {/* Rules Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredRules.map((rule) => {
                    const isEnabled = Boolean(rule.enabled === undefined || rule.enabled === 1 || rule.enabled === true);
                    return (
                        <div
                            key={rule.rule_id}
                            className={`bg-white dark:bg-gray-800 border rounded-xl p-5 shadow-sm transition-all flex flex-col justify-between ${
                                isEnabled
                                    ? 'border-gray-200 dark:border-gray-700/80'
                                    : 'border-gray-200 dark:border-gray-800 opacity-60'
                            }`}
                        >
                            <div>
                                <div className="flex justify-between items-start gap-3 mb-2.5">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded border ${getSeverityBadge(rule.severity_default)}`}>
                                            {rule.severity_default}
                                        </span>
                                        <span className="font-mono text-xs font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-0.5 rounded">
                                            {rule.technique}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => toggleRule(rule.rule_id, isEnabled)}
                                        disabled={updatingId === rule.rule_id}
                                        className="text-gray-400 hover:text-emerald-500 transition-colors flex items-center gap-1.5 text-xs font-semibold"
                                        title={isEnabled ? 'Disable rule' : 'Enable rule'}
                                    >
                                        {isEnabled ? (
                                            <span className="text-emerald-500 flex items-center gap-1 font-bold">
                                                Active <ToggleRight size={26} className="text-emerald-500" />
                                            </span>
                                        ) : (
                                            <span className="text-gray-400 flex items-center gap-1">
                                                Inactive <ToggleLeft size={26} className="text-gray-400" />
                                            </span>
                                        )}
                                    </button>
                                </div>

                                <h3 className="font-bold text-sm text-gray-900 dark:text-white tracking-tight mb-1.5">
                                    {rule.rule_name}
                                </h3>
                                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed mb-3">
                                    {rule.description}
                                </p>
                            </div>

                            <div className="pt-3 border-t border-gray-100 dark:border-gray-700/60 flex justify-between items-center text-[11px] text-gray-400 font-mono">
                                <span>Logic: {rule.logic_type || 'keyword'}</span>
                                <span>Rule ID: #{rule.rule_id}</span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default Rules;
