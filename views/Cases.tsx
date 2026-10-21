import React, { useState, useEffect } from 'react';
import {
    Briefcase, Plus, Search, Filter, Clock, AlertTriangle,
    MessageSquare, CheckCircle, ArrowLeft, Send, Activity, User, Shield
} from 'lucide-react';

const API_URL = '/api';

const Cases: React.FC = () => {
    const [cases, setCases] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCase, setSelectedCase] = useState<any>(null);
    const [caseDetails, setCaseDetails] = useState<any>(null);
    const [detailsLoading, setDetailsLoading] = useState(false);
    const [showNewCaseModal, setShowNewCaseModal] = useState(false);
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [search, setSearch] = useState('');

    const [newCaseTitle, setNewCaseTitle] = useState('');
    const [newCaseDesc, setNewCaseDesc] = useState('');
    const [newCasePriority, setNewCasePriority] = useState('medium');
    const [newNote, setNewNote] = useState('');
    const [submittingNote, setSubmittingNote] = useState(false);

    const fetchCases = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/cases`, { credentials: 'include' });
            if (res.ok) {
                setCases(await res.json());
            }
        } catch (err) {
            console.error('Failed to load cases:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchCaseDetails = async (id: number) => {
        setDetailsLoading(true);
        try {
            const res = await fetch(`${API_URL}/cases/${id}`, { credentials: 'include' });
            if (res.ok) {
                setCaseDetails(await res.json());
            }
        } catch (err) {
            console.error('Failed to load case details:', err);
        } finally {
            setDetailsLoading(false);
        }
    };

    useEffect(() => {
        fetchCases();
    }, []);

    const handleSelectCase = (c: any) => {
        setSelectedCase(c);
        fetchCaseDetails(c.case_id);
    };

    const handleCreateCase = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch(`${API_URL}/cases`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    title: newCaseTitle,
                    description: newCaseDesc,
                    priority: newCasePriority
                })
            });
            if (res.ok) {
                setShowNewCaseModal(false);
                setNewCaseTitle('');
                setNewCaseDesc('');
                fetchCases();
            }
        } catch (err) {
            console.error('Failed to create case:', err);
        }
    };

    const handleAddNote = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newNote.trim() || !selectedCase) return;
        setSubmittingNote(true);
        try {
            const res = await fetch(`${API_URL}/cases/${selectedCase.case_id}/notes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ note_text: newNote })
            });
            if (res.ok) {
                setNewNote('');
                fetchCaseDetails(selectedCase.case_id);
            }
        } catch (err) {
            console.error('Failed to add case note:', err);
        } finally {
            setSubmittingNote(false);
        }
    };

    const handleUpdateStatus = async (status: string) => {
        if (!selectedCase) return;
        try {
            const res = await fetch(`${API_URL}/cases/${selectedCase.case_id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ status })
            });
            if (res.ok) {
                setSelectedCase({ ...selectedCase, status });
                fetchCases();
            }
        } catch (err) {
            console.error('Failed to update case status:', err);
        }
    };

    const filteredCases = cases.filter(c => {
        const matchesStatus = statusFilter === 'ALL' || (c.status || '').toLowerCase() === statusFilter.toLowerCase();
        const matchesSearch =
            (c.title || '').toLowerCase().includes(search.toLowerCase()) ||
            (c.description || '').toLowerCase().includes(search.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    const getPriorityBadge = (p: string) => {
        const prio = (p || 'medium').toLowerCase();
        switch (prio) {
            case 'critical': return 'bg-red-500/10 text-red-500 border-red-500/20';
            case 'high': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
            case 'medium': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
            default: return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
        }
    };

    return (
        <div className="flex flex-col gap-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                        Incident Case Management
                    </h1>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                        Track investigation lifecycles, forensic findings, and linked attack alerts
                    </p>
                </div>
                <button
                    onClick={() => setShowNewCaseModal(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-gray-950 transition-colors shadow-sm"
                >
                    <Plus size={14} /> New Incident Case
                </button>
            </div>

            {/* Main Area: Split Screen Master-Detail */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Cases List */}
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/80 rounded-xl p-4 shadow-sm flex flex-col gap-4">
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Filter cases..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-gray-900 dark:text-white outline-none focus:border-emerald-500"
                            />
                        </div>
                    </div>

                    <div className="flex gap-1 border-b border-gray-100 dark:border-gray-700/60 pb-2 text-[11px]">
                        {['ALL', 'open', 'in_progress', 'closed'].map(st => (
                            <button
                                key={st}
                                onClick={() => setStatusFilter(st)}
                                className={`px-2 py-0.5 rounded capitalize font-semibold ${
                                    statusFilter === st
                                        ? 'bg-emerald-500 text-gray-950'
                                        : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                                }`}
                            >
                                {st.replace('_', ' ')}
                            </button>
                        ))}
                    </div>

                    <div className="space-y-2.5 overflow-y-auto max-h-[600px]">
                        {filteredCases.length === 0 ? (
                            <div className="text-center py-8 text-xs text-gray-500">
                                {loading ? 'Loading cases...' : 'No incident cases found.'}
                            </div>
                        ) : (
                            filteredCases.map(c => {
                                const isSelected = selectedCase?.case_id === c.case_id;
                                return (
                                    <div
                                        key={c.case_id}
                                        onClick={() => handleSelectCase(c)}
                                        className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                                            isSelected
                                                ? 'bg-emerald-500/10 border-emerald-500/40'
                                                : 'bg-gray-50/50 dark:bg-gray-900/40 border-gray-100 dark:border-gray-700/60 hover:border-gray-300 dark:hover:border-gray-600'
                                        }`}
                                    >
                                        <div className="flex justify-between items-start gap-2 mb-1.5">
                                            <span className="font-bold text-xs text-gray-900 dark:text-white line-clamp-1">
                                                #{c.case_id} - {c.title}
                                            </span>
                                            <span className={`px-1.5 py-0.5 text-[9px] font-bold uppercase rounded border ${getPriorityBadge(c.priority)}`}>
                                                {c.priority}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-gray-500 line-clamp-2 leading-relaxed mb-2">
                                            {c.description || 'No case description provided.'}
                                        </p>
                                        <div className="flex justify-between items-center text-[10px] text-gray-400">
                                            <span className="capitalize font-semibold">{c.status?.replace('_', ' ')}</span>
                                            <span>{c.created_at?.slice(0, 10)}</span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Case Detail & Forensic Timeline */}
                <div className="lg:col-span-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/80 rounded-xl p-6 shadow-sm flex flex-col justify-between">
                    {selectedCase ? (
                        <div className="space-y-6">
                            {/* Case Header */}
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-gray-100 dark:border-gray-700 pb-4">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                                            #{selectedCase.case_id} - {selectedCase.title}
                                        </h2>
                                        <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded border ${getPriorityBadge(selectedCase.priority)}`}>
                                            {selectedCase.priority}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Created on {selectedCase.created_at?.replace('T', ' ').slice(0, 19)}
                                    </p>
                                </div>

                                <div className="flex items-center gap-2">
                                    <select
                                        value={selectedCase.status}
                                        onChange={(e) => handleUpdateStatus(e.target.value)}
                                        className="bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-gray-900 dark:text-white font-semibold outline-none"
                                    >
                                        <option value="open">Status: Open</option>
                                        <option value="in_progress">Status: In Progress</option>
                                        <option value="closed">Status: Closed</option>
                                    </select>
                                </div>
                            </div>

                            {/* Description */}
                            <div className="bg-gray-50/60 dark:bg-gray-900/40 p-3.5 rounded-xl border border-gray-100 dark:border-gray-700/60 text-xs text-gray-700 dark:text-gray-300">
                                {selectedCase.description || 'No description provided.'}
                            </div>

                            {/* Linked Alerts */}
                            <div>
                                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1.5">
                                    <AlertTriangle size={14} className="text-emerald-500" />
                                    Linked Threat Alerts ({caseDetails?.alerts?.length || 0})
                                </h3>
                                <div className="space-y-2">
                                    {caseDetails?.alerts?.length === 0 ? (
                                        <div className="text-xs text-gray-500 py-3">No alerts currently linked to this case.</div>
                                    ) : (
                                        caseDetails?.alerts?.map((a: any) => (
                                            <div key={a.alert_id} className="p-3 bg-gray-50 dark:bg-gray-900/60 rounded-lg border border-gray-200 dark:border-gray-700/60 flex justify-between items-center text-xs">
                                                <div>
                                                    <span className="font-semibold text-gray-900 dark:text-white">
                                                        #{a.alert_id} - {a.rule_name}
                                                    </span>
                                                    <div className="text-[11px] text-gray-400 font-mono mt-0.5">
                                                        Host: {a.hostname} • Technique: {a.technique}
                                                    </div>
                                                </div>
                                                <span className="font-bold text-emerald-500 text-xs">
                                                    Score: {a.confidence_score}%
                                                </span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Forensic Notes Timeline */}
                            <div>
                                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1.5">
                                    <MessageSquare size={14} className="text-emerald-500" />
                                    Forensic Notes &amp; Investigation Log
                                </h3>
                                <div className="space-y-2.5 max-h-48 overflow-y-auto mb-4">
                                    {caseDetails?.notes?.length === 0 ? (
                                        <div className="text-xs text-gray-500 py-2">No analyst notes recorded yet.</div>
                                    ) : (
                                        caseDetails?.notes?.map((n: any) => (
                                            <div key={n.note_id} className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-100 dark:border-gray-700/50 text-xs">
                                                <div className="flex justify-between items-center text-[10px] text-gray-400 mb-1">
                                                    <span className="font-bold text-gray-700 dark:text-gray-300">
                                                        {n.analyst_name || 'SOC Analyst'}
                                                    </span>
                                                    <span>{n.created_at?.slice(0, 19).replace('T', ' ')}</span>
                                                </div>
                                                <p className="text-gray-800 dark:text-gray-200">{n.note_text}</p>
                                            </div>
                                        ))
                                    )}
                                </div>

                                <form onSubmit={handleAddNote} className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Add forensic finding or investigation step..."
                                        value={newNote}
                                        onChange={(e) => setNewNote(e.target.value)}
                                        className="flex-1 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-900 dark:text-white outline-none focus:border-emerald-500"
                                    />
                                    <button
                                        type="submit"
                                        disabled={submittingNote || !newNote.trim()}
                                        className="bg-emerald-500 hover:bg-emerald-600 text-gray-950 font-bold px-3.5 py-2 rounded-lg text-xs transition-colors flex items-center gap-1 disabled:opacity-50"
                                    >
                                        <Send size={13} /> Add Note
                                    </button>
                                </form>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center py-16 text-center text-gray-500">
                            <Briefcase size={36} className="text-gray-400 mb-2" />
                            <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-300">No Case Selected</h3>
                            <p className="text-xs max-w-xs mt-1">Select an incident from the left panel to review forensic evidence and add notes.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Create Case Modal */}
            {showNewCaseModal && (
                <div className="fixed inset-0 z-50 bg-gray-950/70 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl w-full max-w-md p-6 shadow-2xl">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                            Create Incident Case
                        </h3>
                        <p className="text-xs text-gray-500 mb-4">
                            Initialize a new security case for triage and forensic tracking.
                        </p>

                        <form onSubmit={handleCreateCase} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Title</label>
                                <input
                                    type="text"
                                    required
                                    value={newCaseTitle}
                                    onChange={(e) => setNewCaseTitle(e.target.value)}
                                    placeholder="e.g. Suspected LOLBin Lateral Movement"
                                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:border-emerald-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Priority</label>
                                <select
                                    value={newCasePriority}
                                    onChange={(e) => setNewCasePriority(e.target.value)}
                                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:border-emerald-500"
                                >
                                    <option value="low">Low Priority</option>
                                    <option value="medium">Medium Priority</option>
                                    <option value="high">High Priority</option>
                                    <option value="critical">Critical Priority</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Description</label>
                                <textarea
                                    rows={3}
                                    value={newCaseDesc}
                                    onChange={(e) => setNewCaseDesc(e.target.value)}
                                    placeholder="Incident context and initial triage indicators..."
                                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:border-emerald-500"
                                />
                            </div>

                            <div className="flex justify-end gap-2.5 pt-3">
                                <button
                                    type="button"
                                    onClick={() => setShowNewCaseModal(false)}
                                    className="px-4 py-2 rounded-lg text-xs font-semibold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 rounded-lg text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-gray-950 transition-colors shadow-sm"
                                >
                                    Create Case
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Cases;
